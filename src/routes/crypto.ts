import { Router } from "express";
import { getRoutePaymentAssets, type NetworkLabel } from "../config.js";
import { getCryptoCandles, getCryptoQuote } from "../services/crypto/index.js";
import {
  parseCryptoCandlesRequest,
  parseCryptoQuoteRequest,
} from "../utils/validate.js";

function wrapPaidResponse(data: unknown, network: NetworkLabel, priceUsd: string) {
  return {
    network,
    paid: true,
    price_usd: priceUsd,
    assets: getRoutePaymentAssets(network),
    data,
  };
}

export function createCryptoRouter({
  network,
  priceUsd,
}: {
  network: NetworkLabel;
  priceUsd: string;
}) {
  const router = Router();

  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get("/quote", async (req, res) => {
    const data = await getCryptoQuote(parseCryptoQuoteRequest(req.query));
    res.json(wrapPaidResponse(data, network, priceUsd));
  });

  router.get("/candles", async (req, res) => {
    const data = await getCryptoCandles(parseCryptoCandlesRequest(req.query));
    res.json(wrapPaidResponse(data, network, priceUsd));
  });

  return router;
}
