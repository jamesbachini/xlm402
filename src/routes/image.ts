import { Router } from "express";
import { config } from "../config.js";
import { generateImage } from "../services/openai.js";
import { parseImageRequest } from "../utils/validate.js";

export function createImageRouter() {
  const router = Router();

  router.post("/generate", async (req, res) => {
    const request = parseImageRequest(req.body);
    const data = await generateImage(request);

    res.json({
      network: "mainnet",
      paid: true,
      price_usd: config.prices.image,
      assets: ["USDC", "XLM"],
      data,
    });
  });

  return router;
}
