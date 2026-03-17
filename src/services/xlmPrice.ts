import { config } from "../config.js";
import { MemoryCache } from "../utils/cache.js";

const cache = new MemoryCache<number>(config.xlmPriceTtlSeconds * 1000);
const CACHE_KEY = "xlm_usd";

/**
 * Fetches the current XLM/USD price from Binance and caches the result.
 * Returns the price as a number (e.g. 0.1748 means 1 XLM = $0.1748).
 */
export async function getXlmUsdPrice(): Promise<number> {
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return cached;
  }

  const response = await fetch(
    "https://api.binance.com/api/v3/ticker/price?symbol=XLMUSDT",
    { signal: AbortSignal.timeout(config.requestTimeoutMs) },
  );

  if (!response.ok) {
    throw new Error(`Binance API returned ${response.status}`);
  }

  const data = (await response.json()) as { symbol: string; price: string };
  const price = parseFloat(data.price);

  if (isNaN(price) || price <= 0) {
    throw new Error(`Invalid XLM price from Binance: ${data.price}`);
  }

  cache.set(CACHE_KEY, price);
  return price;
}

/**
 * Converts a USD amount to XLM using the current market price.
 * Returns a decimal string with up to 7 decimal places.
 */
export async function usdToXlm(usdAmount: string): Promise<string> {
  const xlmPrice = await getXlmUsdPrice();
  const usd = parseFloat(usdAmount);
  const xlm = usd / xlmPrice;
  return xlm.toFixed(7);
}
