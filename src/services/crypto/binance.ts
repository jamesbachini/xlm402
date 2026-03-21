import { HttpError } from "../../utils/errors.js";
import {
  asJsonRecord,
  ensureArray,
  ensureString,
  fetchCryptoJson,
  toBinanceSymbol,
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

const BINANCE_INTERVALS = new Set<CryptoInterval>([
  "1m",
  "5m",
  "15m",
  "1h",
  "4h",
  "1d",
  "1w",
  "1M",
]);

function buildUrl(path: string, query: Record<string, string | number | undefined>) {
  const url = new URL(path, "https://api.binance.com");

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export const binanceAdapter: CryptoAdapter = {
  source: "binance",
  supportedIntervals: BINANCE_INTERVALS,
  async getQuote(request: CryptoQuoteRequest): Promise<CryptoQuote> {
    const payload = asJsonRecord(
      await fetchCryptoJson(
        "binance",
        buildUrl("/api/v3/ticker/24hr", {
          symbol: toBinanceSymbol(request.symbol),
        }),
      ),
      "binance",
    );

    return {
      asset_class: "crypto",
      source: "binance",
      symbol: request.symbol,
      price: ensureString(payload.lastPrice, "binance", "lastPrice"),
      bid: ensureString(payload.bidPrice, "binance", "bidPrice"),
      ask: ensureString(payload.askPrice, "binance", "askPrice"),
      open_24h: ensureString(payload.openPrice, "binance", "openPrice"),
      high_24h: ensureString(payload.highPrice, "binance", "highPrice"),
      low_24h: ensureString(payload.lowPrice, "binance", "lowPrice"),
      volume_24h: ensureString(payload.volume, "binance", "volume"),
      currency: "USD",
      as_of: toIsoString(Number(payload.closeTime)),
      market_status: "open",
      experimental: false,
    };
  },
  async getCandles(request: CryptoCandlesRequest): Promise<CryptoCandlesResponse> {
    const payload = ensureArray(
      await fetchCryptoJson(
        "binance",
        buildUrl("/api/v3/klines", {
          symbol: toBinanceSymbol(request.symbol),
          interval: request.interval,
          limit: request.limit,
          startTime: request.start ? Date.parse(request.start) : undefined,
          endTime: request.end ? Date.parse(request.end) : undefined,
        }),
      ),
      "binance",
      "klines",
    );

    return {
      asset_class: "crypto",
      source: "binance",
      symbol: request.symbol,
      interval: request.interval,
      currency: "USD",
      experimental: false,
      candles: payload.map((entry) => {
        const candle = ensureArray(entry, "binance", "kline");

        if (candle.length < 7) {
          throw new HttpError(502, "upstream_error", "binance response returned an incomplete kline");
        }

        return {
          open_time: toIsoString(Number(candle[0])),
          close_time: toIsoString(Number(candle[6])),
          open: String(candle[1]),
          high: String(candle[2]),
          low: String(candle[3]),
          close: String(candle[4]),
          volume: String(candle[5]),
        };
      }),
    };
  },
};
