import "dotenv/config";

export type NetworkLabel = "testnet" | "mainnet";
export type StellarNetwork = "stellar:testnet" | "stellar:pubnet";
export type ServiceId = "weather" | "chat" | "image";

export type PaymentNetworkConfig = {
  label: NetworkLabel;
  routePrefix: "" | "/testnet";
  stellarNetwork: StellarNetwork;
  payToAddress: string;
  facilitatorUrl: string;
  facilitatorApiKey?: string;
  xlmContractAddress?: string;
};

type ServicePricing = Record<ServiceId, string>;

type OpenAIConfig = {
  apiKey?: string;
  organization?: string;
  project?: string;
  enabled: boolean;
  chatModel: string;
  imageModel: string;
};

type Config = {
  port: number;
  nodeEnv: string;
  platformName: string;
  publicBaseUrl: string;
  stellarRpcUrls: Record<NetworkLabel, string>;
  requestTimeoutMs: number;
  cacheTtlSeconds: number;
  xlmPriceTtlSeconds: number;
  openMeteoBaseUrl: string;
  openMeteoArchiveBaseUrl: string;
  logPayments: boolean;
  xlmEnabled: boolean;
  prices: ServicePricing;
  networks: Record<NetworkLabel, PaymentNetworkConfig>;
  openai: OpenAIConfig;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function parseInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function parseUrl(name: string, fallback?: string): string {
  const raw = process.env[name]?.trim() || fallback;
  if (!raw) {
    throw new Error(`${name} is required`);
  }

  return raw.replace(/\/+$/, "");
}

function parsePrice(name: string, fallback: string): string {
  const raw = process.env[name]?.trim() || fallback;
  if (!/^\d+(\.\d{1,6})?$/.test(raw)) {
    throw new Error(`${name} must be a positive decimal string`);
  }

  if (Number(raw) <= 0) {
    throw new Error(`${name} must be greater than zero`);
  }

  return raw;
}

function readNetworkConfig(
  prefix: "MAINNET" | "TESTNET",
  label: NetworkLabel,
  routePrefix: "" | "/testnet",
  stellarNetwork: StellarNetwork,
): PaymentNetworkConfig {
  return {
    label,
    routePrefix,
    stellarNetwork,
    payToAddress: requireEnv(`${prefix}_PAY_TO_ADDRESS`),
    facilitatorUrl: parseUrl(`${prefix}_FACILITATOR_URL`),
    facilitatorApiKey: optionalEnv(`${prefix}_FACILITATOR_API_KEY`),
    xlmContractAddress: optionalEnv(`${prefix}_XLM_CONTRACT_ADDRESS`),
  };
}

const openAIApiKey = optionalEnv("OPENAI_API_KEY");

export const config: Config = {
  port: parseInteger("PORT", 3000),
  nodeEnv: process.env.NODE_ENV?.trim() || "development",
  platformName: process.env.PLATFORM_NAME?.trim() || "xlm402 services",
  publicBaseUrl: parseUrl("PUBLIC_BASE_URL", "https://xlm402.com"),
  stellarRpcUrls: {
    mainnet: parseUrl(
      "MAINNET_SOROBAN_RPC_URL",
      "https://soroban-rpc.mainnet.stellar.gateway.fm",
    ),
    testnet: parseUrl("TESTNET_SOROBAN_RPC_URL", "https://soroban-testnet.stellar.org"),
  },
  requestTimeoutMs: parseInteger("REQUEST_TIMEOUT_MS", 8000),
  cacheTtlSeconds: parseInteger("CACHE_TTL_SECONDS", 60),
  xlmPriceTtlSeconds: parseInteger("XLM_PRICE_TTL_SECONDS", 30),
  openMeteoBaseUrl: parseUrl("OPEN_METEO_BASE_URL", "https://api.open-meteo.com"),
  openMeteoArchiveBaseUrl: parseUrl(
    "OPEN_METEO_ARCHIVE_BASE_URL",
    "https://archive-api.open-meteo.com",
  ),
  logPayments: process.env.LOG_PAYMENTS?.trim().toLowerCase() === "true",
  xlmEnabled: Boolean(
    optionalEnv("MAINNET_XLM_CONTRACT_ADDRESS") || optionalEnv("TESTNET_XLM_CONTRACT_ADDRESS"),
  ),
  prices: {
    weather: parsePrice("WEATHER_PRICE_USDC", "0.01"),
    chat: parsePrice("CHAT_PRICE_USDC", "0.05"),
    image: parsePrice("IMAGE_PRICE_USDC", "0.10"),
  },
  networks: {
    mainnet: readNetworkConfig("MAINNET", "mainnet", "", "stellar:pubnet"),
    testnet: readNetworkConfig("TESTNET", "testnet", "/testnet", "stellar:testnet"),
  },
  openai: {
    apiKey: openAIApiKey,
    organization: optionalEnv("OPENAI_ORG_ID"),
    project: optionalEnv("OPENAI_PROJECT_ID"),
    enabled: Boolean(openAIApiKey),
    chatModel: process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-5.4",
    imageModel: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1.5",
  },
};
