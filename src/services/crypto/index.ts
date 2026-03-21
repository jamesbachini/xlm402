import { config } from "../../config.js";
import { HttpError, isHttpError } from "../../utils/errors.js";
import { binanceAdapter } from "./binance.js";
import { coinbaseAdapter } from "./coinbase.js";
import { krakenAdapter } from "./kraken.js";
import type {
  CryptoAdapter,
  CryptoCandlesRequest,
  CryptoCandlesResponse,
  CryptoQuote,
  CryptoQuoteRequest,
  CryptoSource,
} from "./types.js";

const ADAPTERS: Record<CryptoSource, CryptoAdapter> = {
  binance: binanceAdapter,
  kraken: krakenAdapter,
  coinbase: coinbaseAdapter,
};

function resolveCandidateSources(
  requestedSource: CryptoQuoteRequest["source"] | CryptoCandlesRequest["source"],
  interval?: CryptoCandlesRequest["interval"],
) {
  const allowed = new Set(config.crypto.allowedSources);

  if (requestedSource !== "best") {
    if (!allowed.has(requestedSource)) {
      throw new HttpError(400, "invalid_request", `source must be one of: best, ${config.crypto.allowedSources.join(", ")}`);
    }

    const adapter = ADAPTERS[requestedSource];
    if (interval && !adapter.supportedIntervals.has(interval)) {
      throw new HttpError(
        400,
        "invalid_request",
        `interval ${interval} is not supported by ${requestedSource}`,
      );
    }

    return [requestedSource];
  }

  const candidates = config.crypto.fallbackOrder.filter((source) => {
    const adapter = ADAPTERS[source];
    return allowed.has(source) && (!interval || adapter.supportedIntervals.has(interval));
  });

  if (candidates.length === 0) {
    throw new HttpError(
      400,
      "invalid_request",
      interval
        ? `no enabled crypto source supports interval ${interval}`
        : "no enabled crypto sources are configured",
    );
  }

  return candidates;
}

async function executeWithFallback<T>(
  candidates: CryptoSource[],
  requestedSource: CryptoQuoteRequest["source"] | CryptoCandlesRequest["source"],
  operation: (adapter: CryptoAdapter) => Promise<T>,
) {
  let firstInvalidRequest: HttpError | undefined;
  let lastUpstreamError: HttpError | undefined;
  let sawRateLimit = false;

  for (const source of candidates) {
    try {
      return await operation(ADAPTERS[source]);
    } catch (error) {
      if (!isHttpError(error)) {
        throw error;
      }

      if (requestedSource !== "best") {
        throw error;
      }

      if (error.statusCode === 400 && error.code === "invalid_request") {
        firstInvalidRequest ??= error;
        continue;
      }

      if (error.statusCode === 429 && error.code === "upstream_rate_limited") {
        sawRateLimit = true;
        lastUpstreamError = error;
        continue;
      }

      lastUpstreamError = error;
    }
  }

  if (sawRateLimit && lastUpstreamError) {
    throw lastUpstreamError;
  }

  if (lastUpstreamError) {
    throw lastUpstreamError;
  }

  if (firstInvalidRequest) {
    throw firstInvalidRequest;
  }

  throw new HttpError(502, "upstream_error", "all crypto sources failed");
}

export async function getCryptoQuote(request: CryptoQuoteRequest): Promise<CryptoQuote> {
  const candidates = resolveCandidateSources(request.source);
  return executeWithFallback(candidates, request.source, (adapter) => adapter.getQuote(request));
}

export async function getCryptoCandles(
  request: CryptoCandlesRequest,
): Promise<CryptoCandlesResponse> {
  const candidates = resolveCandidateSources(request.source, request.interval);
  return executeWithFallback(candidates, request.source, (adapter) =>
    adapter.getCandles(request),
  );
}
