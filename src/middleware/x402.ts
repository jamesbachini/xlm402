import { x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { convertToTokenAmount, DEFAULT_TOKEN_DECIMALS } from "@x402/stellar";
import { config, getRoutePaymentAssets } from "../config.js";
import { createPaymentMiddleware } from "./payment.js";
import { buildPlatformCatalog } from "../platform/catalog.js";
import { usdToXlm } from "../services/xlmPrice.js";

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
  const routes = Object.fromEntries(
    catalog.publishedEndpoints.map((endpoint) => {
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

      if (getRoutePaymentAssets(networkConfig).includes("XLM") && networkConfig.xlmContractAddress) {
        const xlmContract = networkConfig.xlmContractAddress;
        accepts.push({
          scheme: "exact",
          network: networkConfig.stellarNetwork,
          price: async () => {
            const xlmDecimal = await usdToXlm(endpoint.priceUsd);
            const tokenAmount = convertToTokenAmount(xlmDecimal, DEFAULT_TOKEN_DECIMALS);
            return { asset: xlmContract, amount: tokenAmount };
          },
          payTo: networkConfig.payToAddress,
        });
      }

      return [
        `${endpoint.method} ${endpoint.fullPath}`,
        {
          accepts,
          description: endpoint.description,
          mimeType: endpoint.responseType,
          unpaidResponseBody: async () => {
            const assets: Array<{ asset: string; price: string }> = [
              { asset: "USDC", price: endpoint.priceUsd },
            ];

            if (
              getRoutePaymentAssets(networkConfig).includes("XLM") &&
              networkConfig.xlmContractAddress
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
                pay_to: networkConfig.payToAddress,
                facilitator_url: networkConfig.facilitatorUrl,
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
      ];
    }),
  );

  const resourceServer = new x402ResourceServer(facilitatorClients)
    .register(mainnet.stellarNetwork, new ExactStellarScheme())
    .register(testnet.stellarNetwork, new ExactStellarScheme());

  resourceServer.onVerifyFailure(async ({ error, requirements }) => {
    console.error("[x402] verify failure", {
      network: requirements.network,
      asset: requirements.asset,
      payTo: requirements.payTo,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  resourceServer.onSettleFailure(async ({ error, requirements }) => {
    console.error("[x402] settle failure", {
      network: requirements.network,
      asset: requirements.asset,
      payTo: requirements.payTo,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return createPaymentMiddleware(routes, resourceServer);
}
