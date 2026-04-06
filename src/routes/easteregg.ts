import { Router } from "express";
import { EASTER_EGG_MESSAGE, EASTER_EGG_ROUTE } from "../services/easteregg.js";

export function createEasterEggRouter() {
  const router = Router();

  router.get(EASTER_EGG_ROUTE, (_req, res) => {
    res.type("text/plain").send(EASTER_EGG_MESSAGE);
  });

  return router;
}
