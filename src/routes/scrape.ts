import { Router } from "express";
import { getRoutePaymentAssets, type NetworkLabel } from "../config.js";
import { collectPublicPages, extractPublicPage } from "../services/scrape.js";
import { parseCollectRequest, parseScrapeRequest } from "../utils/validate.js";

function wrapPaidResponse(data: unknown, network: NetworkLabel, priceUsd: string) {
  return {
    network,
    paid: true,
    price_usd: priceUsd,
    assets: getRoutePaymentAssets(network),
    data,
  };
}

export function createScrapeRouter({
  network,
  priceUsd,
}: {
  network: NetworkLabel;
  priceUsd: string;
}) {
  const router = Router();

  router.post("/extract", async (req, res) => {
    const data = await extractPublicPage(parseScrapeRequest(req.body));
    res.json(wrapPaidResponse(data, network, priceUsd));
  });

  return router;
}

export function createCollectRouter({
  network,
  priceUsd,
}: {
  network: NetworkLabel;
  priceUsd: string;
}) {
  const router = Router();

  router.post("/run", async (req, res) => {
    const data = await collectPublicPages(parseCollectRequest(req.body));
    res.json(wrapPaidResponse(data, network, priceUsd));
  });

  return router;
}
