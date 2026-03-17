import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { config } from "../config.js";
import { buildPlatformCatalog } from "../platform/catalog.js";

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
    catalog.publishedEndpoints.map((endpoint) => [
      `${endpoint.method} ${endpoint.fullPath}`,
      {
        accepts: [
          {
            scheme: "exact",
            network: endpoint.networkConfig.stellarNetwork,
            price: endpoint.priceUsdc,
            payTo: endpoint.networkConfig.payToAddress,
          },
        ],
        description: endpoint.description,
        mimeType: endpoint.responseType,
        unpaidResponseBody: () => ({
          contentType: "application/json",
          body: {
            error: "payment_required",
            message: "This endpoint requires x402 payment",
            price_usdc: endpoint.priceUsdc,
            asset: "USDC",
            network: endpoint.network,
            pay_to: endpoint.networkConfig.payToAddress,
            facilitator_url: endpoint.networkConfig.facilitatorUrl,
            route: endpoint.fullPath,
          },
        }),
      },
    ]),
  );

  const resourceServer = new x402ResourceServer(facilitatorClients)
    .register(mainnet.stellarNetwork, new ExactStellarScheme())
    .register(testnet.stellarNetwork, new ExactStellarScheme());

  return paymentMiddleware(routes, resourceServer, undefined, undefined, false);
}
