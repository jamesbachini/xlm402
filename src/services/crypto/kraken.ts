import { HttpError } from "../../utils/errors.js";
import {
  asJsonRecord,
  ensureArray,
  ensureString,
  fetchCryptoJson,
  intervalToKrakenMinutes,
  intervalToMilliseconds,
  toIsoString,
  toKrakenPair,
} from "./shared.js";
import type {
  CryptoAdapter,
  CryptoCandlesRequest,
  CryptoCandlesResponse,
  CryptoInterval,
  CryptoQuote,
  CryptoQuoteRequest,
} from "./types.js";

const KRAKEN_INTERVALS = new Set<CryptoInterval>([
  "1m",
  "5m",
  "15m",
  "1h",
  "4h",
  "1d",
  "1w",
]);

function buildUrl(path: string, query: Record<string, string | number | undefined>) {
  const url = new URL(path, "https://api.kraken.com");

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function extractKrakenResult(payload: unknown, field: string) {
  const object = asJsonRecord(payload, "kraken");
  const errors = Array.isArray(object.error)
    ? object.error.filter((entry): entry is string => typeof entry === "string")
    : [];

  if (errors.length > 0) {
    const message = errors.join(" ");
    if (/unknown asset pair|invalid/i.test(message)) {
      throw new HttpError(400, "invalid_request", "symbol is not supported by kraken");
    }

    throw new HttpError(502, "upstream_error", `kraken request failed: ${message}`);
  }

  const result = asJsonRecord(object.result, "kraken");
  const firstValue = Object.values(result).find((value, index) =>
    field === "ohlc" ? index === 0 && Array.isArray(value) : typeof value === "object",
  );

  if (firstValue === undefined) {
    throw new HttpError(502, "upstream_error", `kraken response is missing ${field}`);
  }

  return firstValue;
}

export const krakenAdapter: CryptoAdapter = {
  source: "kraken",
  supportedIntervals: KRAKEN_INTERVALS,
  async getQuote(request: CryptoQuoteRequest): Promise<CryptoQuote> {
    const result = asJsonRecord(
      extractKrakenResult(
        await fetchCryptoJson(
          "kraken",
          buildUrl("/0/public/Ticker", {
            pair: toKrakenPair(request.symbol),
          }),
        ),
        "ticker",
      ),
      "kraken",
    );

    const asks = ensureArray(result.a, "kraken", "a");
    const bids = ensureArray(result.b, "kraken", "b");
    const lows = ensureArray(result.l, "kraken", "l");
    const highs = ensureArray(result.h, "kraken", "h");
    const volumes = ensureArray(result.v, "kraken", "v");

    return {
      asset_class: "crypto",
      source: "kraken",
      symbol: request.symbol,
      price: ensureString(result.c instanceof Array ? result.c[0] : undefined, "kraken", "c[0]"),
      bid: ensureString(bids[0], "kraken", "b[0]"),
      ask: ensureString(asks[0], "kraken", "a[0]"),
      open_24h: ensureString(result.o, "kraken", "o"),
      high_24h: ensureString(highs[1], "kraken", "h[1]"),
      low_24h: ensureString(lows[1], "kraken", "l[1]"),
      volume_24h: ensureString(volumes[1], "kraken", "v[1]"),
      currency: "USD",
      as_of: new Date().toISOString(),
      market_status: "open",
      experimental: false,
    };
  },
  async getCandles(request: CryptoCandlesRequest): Promise<CryptoCandlesResponse> {
    const intervalMinutes = intervalToKrakenMinutes(request.interval);
    if (!intervalMinutes) {
      throw new HttpError(400, "invalid_request", `interval ${request.interval} is not supported by kraken`);
    }

    const intervalMs = intervalToMilliseconds(request.interval);
    const endMs = request.end ? Date.parse(request.end) : undefined;
    const startMs = request.start
      ? Date.parse(request.start)
      : endMs
        ? Math.max(0, endMs - intervalMs * request.limit * 2)
        : undefined;

    const payload = ensureArray(
      extractKrakenResult(
        await fetchCryptoJson(
          "kraken",
          buildUrl("/0/public/OHLC", {
            pair: toKrakenPair(request.symbol),
            interval: intervalMinutes,
            since: startMs ? Math.floor(startMs / 1000) : undefined,
          }),
        ),
        "ohlc",
      ),
      "kraken",
      "ohlc",
    );

    const candles = payload
      .map((entry) => {
        const candle = ensureArray(entry, "kraken", "ohlc row");
        if (candle.length < 7) {
          throw new HttpError(502, "upstream_error", "kraken response returned an incomplete candle");
        }

        const openTimeMs = Number(candle[0]) * 1000;
        const closeTimeMs = openTimeMs + intervalMs;

        return {
          openTimeMs,
          closeTimeMs,
          open: String(candle[1]),
          high: String(candle[2]),
          low: String(candle[3]),
          close: String(candle[4]),
          volume: String(candle[6]),
        };
      })
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
      source: "kraken",
      symbol: request.symbol,
      interval: request.interval,
      currency: "USD",
      experimental: false,
      candles,
    };
  },
};
