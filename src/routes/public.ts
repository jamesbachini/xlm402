import { Router } from "express";
import { config } from "../config.js";
import { buildPlatformCatalog } from "../platform/catalog.js";
import { renderDocsPage, renderIndexPage, renderServicePage } from "../platform/html.js";
import { getFacilitatorSupported } from "../services/facilitator.js";

export const publicRouter = Router();

publicRouter.get("/", (_req, res) => {
  res.type("html").send(renderIndexPage(buildPlatformCatalog()));
});

publicRouter.get("/docs", (_req, res) => {
  res.type("html").send(renderDocsPage(buildPlatformCatalog()));
});

publicRouter.get("/services/:serviceId", (req, res) => {
  const catalog = buildPlatformCatalog();
  const service = catalog.services.find((s) => s.id === req.params.serviceId);

  if (!service) {
    res.status(404).type("html").send("Service not found");
    return;
  }

  res.type("html").send(renderServicePage(service, catalog));
});

publicRouter.get("/health", (_req, res) => {
  const catalog = buildPlatformCatalog();

  res.json({
    ok: true,
    service: config.platformName,
    services: catalog.services.map((service) => service.id),
    published_routes: catalog.publishedEndpoints.length,
    networks: Object.keys(config.networks),
    openai_enabled: config.openai.enabled,
  });
});

publicRouter.get("/supported", async (_req, res) => {
  const [mainnet, testnet] = await Promise.all([
    getFacilitatorSupported(config.networks.mainnet),
    getFacilitatorSupported(config.networks.testnet),
  ]);

  res.json({
    networks: {
      mainnet: {
        facilitator_url: config.networks.mainnet.facilitatorUrl,
        supported: mainnet,
      },
      testnet: {
        facilitator_url: config.networks.testnet.facilitatorUrl,
        supported: testnet,
      },
    },
  });
});

publicRouter.get("/api/catalog", (_req, res) => {
  const catalog = buildPlatformCatalog();

  res.json({
    service: config.platformName,
    public_base_url: config.publicBaseUrl,
    openai_enabled: config.openai.enabled,
    services: catalog.services,
    endpoints: catalog.publishedEndpoints.map((endpoint) => ({
      id: endpoint.id,
      service: endpoint.serviceId,
      method: endpoint.method,
      path: endpoint.fullPath,
      network: endpoint.network,
      price_usdc: endpoint.priceUsdc,
      response_type: endpoint.responseType,
      description: endpoint.description,
    })),
  });
});

publicRouter.get("/.well-known/x402", (_req, res) => {
  const catalog = buildPlatformCatalog();

  res.json({
    version: 1,
    service: config.platformName,
    resources: catalog.publishedEndpoints.map((endpoint) => ({
      id: endpoint.id,
      service: endpoint.serviceId,
      method: endpoint.method,
      path: endpoint.fullPath,
      description: endpoint.description,
      payment: {
        protocol: "x402",
        scheme: "exact",
        network: endpoint.networkConfig.stellarNetwork,
        asset: "USDC",
        price_usdc: endpoint.priceUsdc,
        pay_to: endpoint.networkConfig.payToAddress,
        facilitator_url: endpoint.networkConfig.facilitatorUrl,
      },
    })),
  });
});
