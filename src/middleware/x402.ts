import { x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import {
  convertToTokenAmount,
  DEFAULT_TOKEN_DECIMALS,
  getUsdcAddress,
} from "@x402/stellar";
import { config, getRoutePaymentAssets } from "../config.js";
import { createPaymentMiddleware } from "./payment.js";
import { buildPlatformCatalog } from "../platform/catalog.js";
import { usdToXlm } from "../services/xlmPrice.js";
import {
  EASTER_EGG_AMOUNT_DECIMAL,
  EASTER_EGG_AMOUNT_STROOPS,
  EASTER_EGG_MAINNET_PATH,
  EASTER_EGG_TESTNET_PATH,
  isEasterEggPath,
  recordEasterEggAddress,
} from "../services/easteregg.js";

function getPaymentPayloadCacheKey(payload: unknown) {
  return JSON.stringify(payload);
}

function getNetworkLabelForPath(pathname: string) {
  return pathname === EASTER_EGG_TESTNET_PATH ? "testnet" : "mainnet";
}

function getAssetLabel(
  asset: string,
  network: "mainnet" | "testnet",
) {
  const networkConfig = config.networks[network];

  if (asset === getUsdcAddress(networkConfig.stellarNetwork)) {
    return "USDC";
  }

  if (asset === networkConfig.xlmContractAddress) {
    return "XLM";
  }

  return asset;
}

function getRequestPathFromTransportContext(transportContext: unknown) {
  if (!transportContext || typeof transportContext !== "object") {
    return undefined;
  }

  const request = (transportContext as { request?: { path?: unknown } }).request;
  return typeof request?.path === "string" ? request.path : undefined;
}

export async function createX402Middleware() {
  const mainnet = config.networks.mainnet;
  const testnet = config.networks.testnet;

  const facilitatorClients = [mainnet, testnet].map(
    (network) =>
      new HTTPFacilitatorClient({
        url: network.facilitatorUrl,
        createAuthHeaders: network.facilitatorApiKey
          ? async () => {
              const headers = {
                Authorization: `Bearer ${network.facilitatorApiKey}`,
              };

              return {
                verify: headers,
                settle: headers,
                supported: headers,
              };
            }
          : undefined,
      }),
  );

  // Probe facilitators at startup to log what they support
  for (const [i, client] of facilitatorClients.entries()) {
    const label = i === 0 ? "mainnet" : "testnet";
    try {
      const supported = await client.getSupported();
      const kinds = (supported.kinds as Array<{ scheme: string; network: string }>).map(
        (k) => `${k.scheme}@${k.network}`,
      );
      console.log(`[x402] ${label} facilitator (${[mainnet, testnet][i].facilitatorUrl}) supports: ${kinds.join(", ")}`);
    } catch (err) {
      console.error(`[x402] ${label} facilitator (${[mainnet, testnet][i].facilitatorUrl}) unreachable: ${String(err)}`);
    }
  }

  const catalog = buildPlatformCatalog();
  const publishedRoutes = catalog.publishedEndpoints.map((endpoint) => {
    return [
      `${endpoint.method} ${endpoint.fullPath}`,
      {
        accepts: (() => {
          const networkConfig = endpoint.networkConfig;

          const usdcOption = {
            scheme: "exact" as const,
            network: networkConfig.stellarNetwork,
            price: endpoint.priceUsd,
            payTo: networkConfig.payToAddress,
          };

          const accepts: Array<{
            scheme: "exact";
            network: typeof networkConfig.stellarNetwork;
            price:
              | string
              | { asset: string; amount: string; extra?: Record<string, unknown> }
              | (() => Promise<{ asset: string; amount: string; extra?: Record<string, unknown> }>);
            payTo: string;
          }> = [usdcOption];

          if (
            getRoutePaymentAssets(networkConfig).includes("XLM") &&
            networkConfig.xlmContractAddress
          ) {
            const xlmContract = networkConfig.xlmContractAddress;
            accepts.push({
              scheme: "exact",
              network: networkConfig.stellarNetwork,
              price: async () => {
                const xlmDecimal = await usdToXlm(endpoint.priceUsd);
                const tokenAmount = convertToTokenAmount(
                  xlmDecimal,
                  DEFAULT_TOKEN_DECIMALS,
                );
                return { asset: xlmContract, amount: tokenAmount };
              },
              payTo: networkConfig.payToAddress,
            });
          }

          return accepts;
        })(),
        description: endpoint.description,
        mimeType: endpoint.responseType,
        unpaidResponseBody: async () => {
          const assets: Array<{ asset: string; price: string }> = [
            { asset: "USDC", price: endpoint.priceUsd },
          ];

          if (
            getRoutePaymentAssets(endpoint.networkConfig).includes("XLM") &&
            endpoint.networkConfig.xlmContractAddress
          ) {
            try {
              const xlmPrice = await usdToXlm(endpoint.priceUsd);
              assets.push({ asset: "XLM", price: xlmPrice });
            } catch {
              // XLM price unavailable, only show USDC
            }
          }

          return {
            contentType: "application/json",
            body: {
              error: "payment_required",
              message: "This endpoint requires x402 payment",
              price_usd: endpoint.priceUsd,
              assets,
              network: endpoint.network,
              pay_to: endpoint.networkConfig.payToAddress,
              facilitator_url: endpoint.networkConfig.facilitatorUrl,
              route: endpoint.fullPath,
            },
          };
        },
        settlementFailedResponseBody: async (
          _context: unknown,
          settleResult: {
            errorMessage?: string;
            errorReason?: string;
            transaction?: string;
          },
        ) => ({
          contentType: "application/json",
          body: {
            error: "payment_settlement_failed",
            message:
              settleResult.errorMessage ||
              settleResult.errorReason ||
              "Payment settlement failed",
            reason: settleResult.errorReason,
            route: endpoint.fullPath,
            network: endpoint.network,
            transaction: settleResult.transaction || undefined,
          },
        }),
      },
    ] as const;
  });

  const easterEggRoutes = [
    {
      network: "mainnet" as const,
      fullPath: EASTER_EGG_MAINNET_PATH,
      networkConfig: config.networks.mainnet,
    },
    {
      network: "testnet" as const,
      fullPath: EASTER_EGG_TESTNET_PATH,
      networkConfig: config.networks.testnet,
    },
  ].map((endpoint) => {
    const accepts = [
      {
        scheme: "exact" as const,
        network: endpoint.networkConfig.stellarNetwork,
        price: {
          asset: getUsdcAddress(endpoint.networkConfig.stellarNetwork),
          amount: EASTER_EGG_AMOUNT_STROOPS,
        },
        payTo: endpoint.networkConfig.payToAddress,
      },
    ];

    if (endpoint.networkConfig.xlmContractAddress) {
      accepts.push({
        scheme: "exact" as const,
        network: endpoint.networkConfig.stellarNetwork,
        price: {
          asset: endpoint.networkConfig.xlmContractAddress,
          amount: EASTER_EGG_AMOUNT_STROOPS,
        },
        payTo: endpoint.networkConfig.payToAddress,
      });
    }

    return [
      `GET ${endpoint.fullPath}`,
      {
        accepts,
        description: "",
        mimeType: "text/plain" as const,
        unpaidResponseBody: async () => ({
          contentType: "application/json",
          body: {
            error: "payment_required",
            message: "This endpoint requires x402 payment",
            assets: accepts.map((paymentOption) => ({
              asset:
                paymentOption.price.asset === endpoint.networkConfig.xlmContractAddress
                  ? "XLM"
                  : "USDC",
              amount: EASTER_EGG_AMOUNT_DECIMAL,
            })),
            network: endpoint.network,
            pay_to: endpoint.networkConfig.payToAddress,
            facilitator_url: endpoint.networkConfig.facilitatorUrl,
            route: endpoint.fullPath,
          },
        }),
        settlementFailedResponseBody: async (
          _context: unknown,
          settleResult: {
            errorMessage?: string;
            errorReason?: string;
            transaction?: string;
          },
        ) => ({
          contentType: "application/json",
          body: {
            error: "payment_settlement_failed",
            message:
              settleResult.errorMessage ||
              settleResult.errorReason ||
              "Payment settlement failed",
            reason: settleResult.errorReason,
            route: endpoint.fullPath,
            network: endpoint.network,
            transaction: settleResult.transaction || undefined,
          },
        }),
      },
    ] as const;
  });

  const routes = Object.fromEntries([
    ...publishedRoutes,
    ...easterEggRoutes,
  ]);

  const resourceServer = new x402ResourceServer(facilitatorClients)
    .register(mainnet.stellarNetwork, new ExactStellarScheme())
    .register(testnet.stellarNetwork, new ExactStellarScheme());

  const verifiedPayers = new Map<string, string>();

  resourceServer.onAfterVerify(async ({ paymentPayload, result }) => {
    if (typeof result.payer === "string" && result.payer.length > 0) {
      verifiedPayers.set(getPaymentPayloadCacheKey(paymentPayload), result.payer);
    }
  });

  resourceServer.onAfterSettle(
    async ({ paymentPayload, requirements, result, transportContext }) => {
      const paymentKey = getPaymentPayloadCacheKey(paymentPayload);

      try {
        const requestPath = getRequestPathFromTransportContext(transportContext);
        if (!isEasterEggPath(requestPath)) {
          return;
        }

        const payer = result.payer ?? verifiedPayers.get(paymentKey);
        if (!payer) {
          throw new Error("Missing payer in easter egg settlement result");
        }

        const network = getNetworkLabelForPath(requestPath);
        await recordEasterEggAddress({
          payer,
          network,
          stellarNetwork: requirements.network,
          asset: getAssetLabel(requirements.asset, network),
          amount: EASTER_EGG_AMOUNT_DECIMAL,
          transaction: result.transaction,
          route: requestPath,
        });
      } finally {
        verifiedPayers.delete(paymentKey);
      }
    },
  );

  resourceServer.onVerifyFailure(async ({ error, requirements, paymentPayload }) => {
    verifiedPayers.delete(getPaymentPayloadCacheKey(paymentPayload));
    console.error("[x402] verify failure", {
      network: requirements.network,
      asset: requirements.asset,
      payTo: requirements.payTo,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  resourceServer.onSettleFailure(async ({ error, requirements, paymentPayload }) => {
    verifiedPayers.delete(getPaymentPayloadCacheKey(paymentPayload));
    console.error("[x402] settle failure", {
      network: requirements.network,
      asset: requirements.asset,
      payTo: requirements.payTo,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return createPaymentMiddleware(routes, resourceServer);
}
