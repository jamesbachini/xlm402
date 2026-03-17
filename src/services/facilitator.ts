import { config, type PaymentNetworkConfig } from "../config.js";
import { MemoryCache } from "../utils/cache.js";
import { HttpError } from "../utils/errors.js";

const cache = new MemoryCache<unknown>(config.cacheTtlSeconds * 1000);

export async function getFacilitatorSupported(network: PaymentNetworkConfig) {
  const url = `${network.facilitatorUrl}/supported`;
  const cached = cache.get(url);

  if (cached) {
    return cached;
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (network.facilitatorApiKey) {
    headers.Authorization = `Bearer ${network.facilitatorApiKey}`;
  }

  let response: Response;

  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(config.requestTimeoutMs),
      headers,
    });
  } catch (error) {
    throw new HttpError(502, "upstream_error", `Facilitator request failed: ${String(error)}`);
  }

  if (!response.ok) {
    throw new HttpError(
      502,
      "upstream_error",
      `Facilitator request failed with status ${response.status}`,
    );
  }

  const json = (await response.json()) as unknown;
  cache.set(url, json);
  return json;
}
