import { Router } from "express";
import { getRoutePaymentAssets, type NetworkLabel } from "../config.js";
import { getLatestNewsByCategory } from "../services/news.js";
import { parseNewsCategory, parsePositiveInteger } from "../utils/validate.js";

function wrapPaidResponse(data: unknown, network: NetworkLabel, priceUsd: string) {
  return {
    network,
    paid: true,
    price_usd: priceUsd,
    assets: getRoutePaymentAssets(network),
    data,
  };
}

export function createNewsRouter({
  network,
  priceUsd,
}: {
  network: NetworkLabel;
  priceUsd: string;
}) {
  const router = Router();

  router.get("/:category", async (req, res) => {
    const category = parseNewsCategory(req.params.category);
    const maxStories = parsePositiveInteger(req.query.limit, "limit", 1, 30, 12);
    const maxItemsPerFeed = parsePositiveInteger(
      req.query.max_per_feed,
      "max_per_feed",
      1,
      10,
      6,
    );

    const data = await getLatestNewsByCategory({
      category,
      maxStories,
      maxItemsPerFeed,
    });

    res.json(wrapPaidResponse(data, network, priceUsd));
  });

  return router;
}
