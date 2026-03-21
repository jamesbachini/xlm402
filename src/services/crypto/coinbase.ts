import { HttpError } from "../../utils/errors.js";
import {
  asJsonRecord,
  ensureArray,
  ensureString,
  fetchCryptoJson,
  intervalToCoinbaseGranularity,
  intervalToMilliseconds,
  toIsoString,
} from "./shared.js";
import type {
  CryptoAdapter,
  CryptoCandlesRequest,
  CryptoCandlesResponse,
  CryptoInterval,
  CryptoQuote,
  CryptoQuoteRequest,
} from "./types.js";

const COINBASE_INTERVALS = new Set<CryptoInterval>([
  "1m",
  "5m",
  "15m",
  "1h",
  "1d",
]);

function buildUrl(path: string, query: Record<string, string | number | undefined>) {
  const url = new URL(path, "https://api.exchange.coinbase.com");

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export const coinbaseAdapter: CryptoAdapter = {
  source: "coinbase",
  supportedIntervals: COINBASE_INTERVALS,
  async getQuote(request: CryptoQuoteRequest): Promise<CryptoQuote> {
    const [tickerPayload, statsPayload] = await Promise.all([
      fetchCryptoJson(
        "coinbase",
        buildUrl(`/products/${request.symbol}/ticker`, {}),
      ),
      fetchCryptoJson(
        "coinbase",
        buildUrl(`/products/${request.symbol}/stats`, {}),
      ),
    ]);

    const ticker = asJsonRecord(tickerPayload, "coinbase");
    const stats = asJsonRecord(statsPayload, "coinbase");

    return {
      asset_class: "crypto",
      source: "coinbase",
      symbol: request.symbol,
      price: ensureString(ticker.price, "coinbase", "price"),
      bid: ensureString(ticker.bid, "coinbase", "bid"),
      ask: ensureString(ticker.ask, "coinbase", "ask"),
      open_24h: ensureString(stats.open, "coinbase", "open"),
      high_24h: ensureString(stats.high, "coinbase", "high"),
      low_24h: ensureString(stats.low, "coinbase", "low"),
      volume_24h: ensureString(stats.volume, "coinbase", "volume"),
      currency: "USD",
      as_of: ensureString(ticker.time, "coinbase", "time"),
      market_status: "open",
      experimental: false,
    };
  },
  async getCandles(request: CryptoCandlesRequest): Promise<CryptoCandlesResponse> {
    const granularity = intervalToCoinbaseGranularity(request.interval);
    if (!granularity) {
      throw new HttpError(
        400,
        "invalid_request",
        `interval ${request.interval} is not supported by coinbase`,
      );
    }

    if (request.limit > 300) {
      throw new HttpError(
        400,
        "invalid_request",
        "limit must be 300 or less when source=coinbase",
      );
    }

    const intervalMs = intervalToMilliseconds(request.interval);
    const endMs = request.end ? Date.parse(request.end) : Date.now();
    const startMs = request.start
      ? Date.parse(request.start)
      : Math.max(0, endMs - intervalMs * request.limit);

    const payload = ensureArray(
      await fetchCryptoJson(
        "coinbase",
        buildUrl(`/products/${request.symbol}/candles`, {
          granularity,
          start: new Date(startMs).toISOString(),
          end: new Date(endMs).toISOString(),
        }),
      ),
      "coinbase",
      "candles",
    );

    const candles = payload
      .map((entry) => {
        const candle = ensureArray(entry, "coinbase", "candle row");
        if (candle.length < 6) {
          throw new HttpError(502, "upstream_error", "coinbase response returned an incomplete candle");
        }

        const openTimeMs = Number(candle[0]) * 1000;
        const closeTimeMs = openTimeMs + intervalMs;

        return {
          openTimeMs,
          closeTimeMs,
          low: String(candle[1]),
          high: String(candle[2]),
          open: String(candle[3]),
          close: String(candle[4]),
          volume: String(candle[5]),
        };
      })
      .sort((a, b) => a.openTimeMs - b.openTimeMs)
      .filter((candle) => {
        if (request.start && candle.openTimeMs < Date.parse(request.start)) {
          return false;
        }

        if (request.end && candle.closeTimeMs > Date.parse(request.end)) {
          return false;
        }

        return true;
      })
      .slice(-request.limit)
      .map((candle) => ({
        open_time: toIsoString(candle.openTimeMs),
        close_time: toIsoString(candle.closeTimeMs),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }));

    return {
      asset_class: "crypto",
      source: "coinbase",
      symbol: request.symbol,
      interval: request.interval,
      currency: "USD",
      experimental: false,
      candles,
    };
  },
};
