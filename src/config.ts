import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export type NetworkLabel = "testnet" | "mainnet";
export type StellarNetwork = "stellar:testnet" | "stellar:pubnet";
export type ServiceId = "weather" | "news" | "chat" | "image";

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

type NetworkFileConfig = {
  payToAddress: string;
  facilitatorUrl: string;
  xlmContractAddress?: string;
};

type PublicConfigFile = {
  port: number;
  platformName: string;
  publicBaseUrl: string;
  requestTimeoutMs: number;
  cacheTtlSeconds: number;
  xlmPriceTtlSeconds: number;
  logPayments: boolean;
  stellarRpcUrls: Record<NetworkLabel, string>;
  upstreams: {
    openMeteoBaseUrl: string;
    openMeteoArchiveBaseUrl: string;
  };
  prices: ServicePricing;
  openai: {
    chatModel: string;
    imageModel: string;
  };
  networks: Record<NetworkLabel, NetworkFileConfig>;
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

function resolveConfigPath() {
  const override = optionalEnv("APP_CONFIG_PATH");
  if (override) {
    return path.isAbsolute(override)
      ? override
      : path.resolve(process.cwd(), override);
  }

  return fileURLToPath(new URL("../config/app.json", import.meta.url));
}

function readConfigFile(): PublicConfigFile {
  const configPath = resolveConfigPath();
  let raw: string;

  try {
    raw = readFileSync(configPath, "utf8");
  } catch (error) {
    throw new Error(`Unable to read config file at ${configPath}: ${String(error)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Config file at ${configPath} is not valid JSON: ${String(error)}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Config file at ${configPath} must contain a JSON object`);
  }

  return parsed as PublicConfigFile;
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

function parseIntegerValue(name: string, raw: number): number {
  if (!Number.isInteger(raw) || raw <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return raw;
}

function parseUrl(name: string, fallback?: string): string {
  const raw = process.env[name]?.trim() || fallback;
  if (!raw) {
    throw new Error(`${name} is required`);
  }

  return raw.replace(/\/+$/, "");
}

function parseUrlValue(name: string, raw: string): string {
  if (!raw.trim()) {
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

function parsePriceValue(name: string, raw: string): string {
  if (!/^\d+(\.\d{1,6})?$/.test(raw)) {
    throw new Error(`${name} must be a positive decimal string`);
  }

  if (Number(raw) <= 0) {
    throw new Error(`${name} must be greater than zero`);
  }

  return raw;
}

function parseBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) {
    return fallback;
  }

  if (raw === "true") {
    return true;
  }

  if (raw === "false") {
    return false;
  }

  throw new Error(`${name} must be true or false`);
}

const fileConfig = readConfigFile();

function readNetworkConfig(
  prefix: "MAINNET" | "TESTNET",
  label: NetworkLabel,
  routePrefix: "" | "/testnet",
  stellarNetwork: StellarNetwork,
): PaymentNetworkConfig {
  const fileNetwork = fileConfig.networks[label];
  if (!fileNetwork) {
    throw new Error(`networks.${label} is required in the config file`);
  }

  return {
    label,
    routePrefix,
    stellarNetwork,
    payToAddress: optionalEnv(`${prefix}_PAY_TO_ADDRESS`) ?? fileNetwork.payToAddress,
    facilitatorUrl: parseUrl(
      `${prefix}_FACILITATOR_URL`,
      parseUrlValue(`${prefix}_FACILITATOR_URL`, fileNetwork.facilitatorUrl),
    ),
    facilitatorApiKey: optionalEnv(`${prefix}_FACILITATOR_API_KEY`),
    xlmContractAddress:
      optionalEnv(`${prefix}_XLM_CONTRACT_ADDRESS`) ??
      fileNetwork.xlmContractAddress?.trim() ??
      undefined,
  };
}

const openAIApiKey = optionalEnv("OPENAI_API_KEY");

export const config: Config = {
  port: parseInteger("PORT", parseIntegerValue("port", fileConfig.port)),
  nodeEnv: process.env.NODE_ENV?.trim() || "development",
  platformName: process.env.PLATFORM_NAME?.trim() || fileConfig.platformName,
  publicBaseUrl: parseUrl(
    "PUBLIC_BASE_URL",
    parseUrlValue("publicBaseUrl", fileConfig.publicBaseUrl),
  ),
  stellarRpcUrls: {
    mainnet: parseUrl(
      "MAINNET_SOROBAN_RPC_URL",
      parseUrlValue("stellarRpcUrls.mainnet", fileConfig.stellarRpcUrls.mainnet),
    ),
    testnet: parseUrl(
      "TESTNET_SOROBAN_RPC_URL",
      parseUrlValue("stellarRpcUrls.testnet", fileConfig.stellarRpcUrls.testnet),
    ),
  },
  requestTimeoutMs: parseInteger(
    "REQUEST_TIMEOUT_MS",
    parseIntegerValue("requestTimeoutMs", fileConfig.requestTimeoutMs),
  ),
  cacheTtlSeconds: parseInteger(
    "CACHE_TTL_SECONDS",
    parseIntegerValue("cacheTtlSeconds", fileConfig.cacheTtlSeconds),
  ),
  xlmPriceTtlSeconds: parseInteger(
    "XLM_PRICE_TTL_SECONDS",
    parseIntegerValue("xlmPriceTtlSeconds", fileConfig.xlmPriceTtlSeconds),
  ),
  openMeteoBaseUrl: parseUrl(
    "OPEN_METEO_BASE_URL",
    parseUrlValue("upstreams.openMeteoBaseUrl", fileConfig.upstreams.openMeteoBaseUrl),
  ),
  openMeteoArchiveBaseUrl: parseUrl(
    "OPEN_METEO_ARCHIVE_BASE_URL",
    parseUrlValue(
      "upstreams.openMeteoArchiveBaseUrl",
      fileConfig.upstreams.openMeteoArchiveBaseUrl,
    ),
  ),
  logPayments: parseBoolean("LOG_PAYMENTS", fileConfig.logPayments),
  xlmEnabled: Boolean(
    (optionalEnv("MAINNET_XLM_CONTRACT_ADDRESS") ??
      fileConfig.networks.mainnet.xlmContractAddress)?.trim() ||
      (optionalEnv("TESTNET_XLM_CONTRACT_ADDRESS") ??
        fileConfig.networks.testnet.xlmContractAddress)?.trim(),
  ),
  prices: {
    weather: parsePrice(
      "WEATHER_PRICE_USDC",
      parsePriceValue("prices.weather", fileConfig.prices.weather),
    ),
    news: parsePrice(
      "NEWS_PRICE_USDC",
      parsePriceValue("prices.news", fileConfig.prices.news),
    ),
    chat: parsePrice(
      "CHAT_PRICE_USDC",
      parsePriceValue("prices.chat", fileConfig.prices.chat),
    ),
    image: parsePrice(
      "IMAGE_PRICE_USDC",
      parsePriceValue("prices.image", fileConfig.prices.image),
    ),
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
    chatModel: process.env.OPENAI_CHAT_MODEL?.trim() || fileConfig.openai.chatModel,
    imageModel: process.env.OPENAI_IMAGE_MODEL?.trim() || fileConfig.openai.imageModel,
  },
};

export function getRoutePaymentAssets(
  network: NetworkLabel | PaymentNetworkConfig,
): Array<"USDC" | "XLM"> {
  const networkConfig =
    typeof network === "string" ? config.networks[network] : network;

  if (
    typeof networkConfig.xlmContractAddress === "string" &&
    networkConfig.xlmContractAddress.length > 0
  ) {
    return ["USDC", "XLM"];
  }

  return ["USDC"];
}

export function getPlatformPaymentAssets(): Array<"USDC" | "XLM"> {
  return config.xlmEnabled ? ["USDC", "XLM"] : ["USDC"];
}
