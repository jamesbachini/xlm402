import { config } from "../../config.js";
import { HttpError } from "../../utils/errors.js";
import type { CryptoInterval, CryptoSource } from "./types.js";

type JsonRecord = Record<string, unknown>;

const BINANCE_QUOTE_ASSET = "USDC";
const KRAKEN_BASE_ALIASES: Record<string, string> = {
  BTC: "XBT",
};

export function splitUsdSymbol(symbol: string) {
  const [base, quote] = symbol.split("-");
  if (!base || quote !== "USD") {
    throw new HttpError(400, "invalid_request", "symbol must use BASE-USD format in v1");
  }

  return { base, quote };
}

export function toBinanceSymbol(symbol: string) {
  const { base } = splitUsdSymbol(symbol);
  return `${base}${BINANCE_QUOTE_ASSET}`;
}

export function toKrakenPair(symbol: string) {
  const { base } = splitUsdSymbol(symbol);
  return `${KRAKEN_BASE_ALIASES[base] ?? base}USD`;
}

export function intervalToMilliseconds(interval: CryptoInterval) {
  switch (interval) {
    case "1m":
      return 60_000;
    case "5m":
      return 5 * 60_000;
    case "15m":
      return 15 * 60_000;
    case "1h":
      return 60 * 60_000;
    case "4h":
      return 4 * 60 * 60_000;
    case "1d":
      return 24 * 60 * 60_000;
    case "1w":
      return 7 * 24 * 60 * 60_000;
    case "1M":
      return 30 * 24 * 60 * 60_000;
  }
}

export function intervalToKrakenMinutes(interval: CryptoInterval): number | undefined {
  switch (interval) {
    case "1m":
      return 1;
    case "5m":
      return 5;
    case "15m":
      return 15;
    case "1h":
      return 60;
    case "4h":
      return 240;
    case "1d":
      return 1440;
    case "1w":
      return 10080;
    case "1M":
      return undefined;
  }
}

export function intervalToCoinbaseGranularity(interval: CryptoInterval): number | undefined {
  switch (interval) {
    case "1m":
      return 60;
    case "5m":
      return 300;
    case "15m":
      return 900;
    case "1h":
      return 3600;
    case "1d":
      return 86400;
    case "4h":
    case "1w":
    case "1M":
      return undefined;
  }
}

export function toIsoString(timestamp: number) {
  return new Date(timestamp).toISOString();
}

export function ensureString(value: unknown, source: CryptoSource, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(
      502,
      "upstream_error",
      `${source} response is missing ${field}`,
    );
  }

  return value;
}

export function ensureArray(value: unknown, source: CryptoSource, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new HttpError(
      502,
      "upstream_error",
      `${source} response is missing ${field}`,
    );
  }

  return value;
}

export async function fetchCryptoJson(
  source: CryptoSource,
  url: string,
): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(config.crypto.timeoutMs),
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    throw new HttpError(
      502,
      "upstream_error",
      `${source} request failed: ${String(error)}`,
    );
  }

  const bodyText = await response.text();
  let body: unknown = undefined;

  if (bodyText) {
    try {
      body = JSON.parse(bodyText) as unknown;
    } catch {
      body = bodyText;
    }
  }

  if (response.status === 418 || response.status === 429) {
    throw new HttpError(
      429,
      "upstream_rate_limited",
      `${source} rate limited the request`,
    );
  }

  if (!response.ok) {
    const invalidReason = detectInvalidRequest(source, response.status, body);
    if (invalidReason) {
      throw new HttpError(400, "invalid_request", invalidReason);
    }

    throw new HttpError(
      502,
      "upstream_error",
      `${source} request failed with status ${response.status}`,
    );
  }

  return body;
}

function detectInvalidRequest(
  source: CryptoSource,
  status: number,
  body: unknown,
): string | undefined {
  const message = extractErrorText(body);
  const invalidPattern =
    /invalid symbol|unknown asset pair|product not found|not found|invalid product id/i;

  if ((status === 400 || status === 404) && invalidPattern.test(message)) {
    return `symbol is not supported by ${source}`;
  }

  return undefined;
}

function extractErrorText(body: unknown): string {
  if (typeof body === "string") {
    return body;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "";
  }

  const object = body as JsonRecord;
  const errors = Array.isArray(object.error)
    ? object.error.filter((entry): entry is string => typeof entry === "string")
    : [];

  const values = [
    typeof object.msg === "string" ? object.msg : "",
    typeof object.message === "string" ? object.message : "",
    typeof object.error === "string" ? object.error : "",
    ...errors,
  ].filter(Boolean);

  return values.join(" ");
}

export function asJsonRecord(value: unknown, source: CryptoSource): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(502, "upstream_error", `${source} returned a non-object payload`);
  }

  return value as JsonRecord;
}
