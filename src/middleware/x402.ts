import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { convertToTokenAmount, DEFAULT_TOKEN_DECIMALS } from "@x402/stellar";
import { config } from "../config.js";
import { buildPlatformCatalog } from "../platform/catalog.js";
import { usdToXlm, getXlmUsdPrice } from "../services/xlmPrice.js";

export function createX402Middleware() {
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

      if (networkConfig.xlmContractAddress) {
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

            if (networkConfig.xlmContractAddress) {
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
        },
      ];
    }),
  );

  const resourceServer = new x402ResourceServer(facilitatorClients)
    .register(mainnet.stellarNetwork, new ExactStellarScheme())
    .register(testnet.stellarNetwork, new ExactStellarScheme());

  return paymentMiddleware(routes, resourceServer, undefined, undefined, false);
}
