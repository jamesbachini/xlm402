export const CRYPTO_SOURCES = ["binance", "kraken", "coinbase"] as const;
export const CRYPTO_INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d", "1w", "1M"] as const;

export type CryptoSource = (typeof CRYPTO_SOURCES)[number];
export type CryptoSourcePreference = CryptoSource | "best";
export type CryptoInterval = (typeof CRYPTO_INTERVALS)[number];

export type CryptoQuote = {
  asset_class: "crypto";
  source: CryptoSource;
  symbol: string;
  price: string;
  bid: string;
  ask: string;
  open_24h: string;
  high_24h: string;
  low_24h: string;
  volume_24h: string;
  currency: "USD";
  as_of: string;
  market_status: "open";
  experimental: false;
};

export type CryptoCandle = {
  open_time: string;
  close_time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

export type CryptoCandlesResponse = {
  asset_class: "crypto";
  source: CryptoSource;
  symbol: string;
  interval: CryptoInterval;
  currency: "USD";
  experimental: false;
  candles: CryptoCandle[];
};

export type CryptoQuoteRequest = {
  symbol: string;
  source: CryptoSourcePreference;
};

export type CryptoCandlesRequest = {
  symbol: string;
  interval: CryptoInterval;
  source: CryptoSourcePreference;
  limit: number;
  start?: string;
  end?: string;
};

export type CryptoAdapter = {
  source: CryptoSource;
  supportedIntervals: ReadonlySet<CryptoInterval>;
  getQuote(request: CryptoQuoteRequest): Promise<CryptoQuote>;
  getCandles(request: CryptoCandlesRequest): Promise<CryptoCandlesResponse>;
};
