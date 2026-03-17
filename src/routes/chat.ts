import { Router } from "express";
import { config } from "../config.js";
import { createChatCompletion } from "../services/openai.js";
import { parseChatRequest } from "../utils/validate.js";

export function createChatRouter() {
  const router = Router();

  router.post("/respond", async (req, res) => {
    const request = parseChatRequest(req.body);
    const data = await createChatCompletion(request);

    res.json({
      network: "mainnet",
      paid: true,
      price_usd: config.prices.chat,
      assets: ["USDC", "XLM"],
      data,
    });
  });

  return router;
}
