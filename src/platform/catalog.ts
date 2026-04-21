import { config, type NetworkLabel, type PaymentNetworkConfig, type ServiceId } from "../config.js";
import { NEWS_CATEGORIES, NEWS_CATEGORY_DETAILS } from "../services/newsFeeds.js";

export type HttpMethod = "GET" | "POST";

export type ServiceDefinition = {
  id: ServiceId;
  name: string;
  tagline: string;
  description: string;
  audience: string;
  highlights: string[];
  live: boolean;
  availability: NetworkLabel[];
};

export type ServiceEndpoint = {
  id: string;
  serviceId: ServiceId;
  method: HttpMethod;
  route: string;
  description: string;
  responseType: "application/json";
  availability: NetworkLabel[];
  priceByNetwork: Partial<Record<NetworkLabel, string>>;
  requestExample: string;
  requestInputExample?: string;
  requestBodyExample?: string;
  querySchema?: string[];
  bodySchema?: string[];
};

export type PublishedEndpoint = ServiceEndpoint & {
  fullPath: string;
  network: NetworkLabel;
  networkConfig: PaymentNetworkConfig;
  priceUsd: string;
};

export type PlatformCatalog = {
  services: ServiceDefinition[];
  endpoints: ServiceEndpoint[];
  publishedEndpoints: PublishedEndpoint[];
};

const serviceDefinitions: ServiceDefinition[] = [
  {
    id: "weather",
    name: "Weather Intelligence",
    tagline: "Current conditions, forecasts, archives, and compact summaries.",
    description:
      "Production-ready weather data endpoints built on Open-Meteo and wrapped in x402 payment flows for both testnet and mainnet.",
    audience: "Apps, automation, dashboards, research tooling",
    highlights: [
      "Current weather with practical operational fields",
      "Daily and hourly forecast selection",
      "Archive and history-summary endpoints",
      "Mainnet and testnet route families",
    ],
    live: true,
    availability: ["mainnet", "testnet"],
  },
  {
    id: "news",
    name: "News Aggregation",
    tagline: "Latest stories by category, blended from multiple RSS and Atom feeds.",
    description:
      "Curated news endpoints that fetch current stories from vetted upstream RSS feeds, normalize them into a stable JSON shape, and expose them through x402 payments on both Stellar networks.",
    audience: "Agents, dashboards, research tools, automation, consumer apps",
    highlights: [
      `${NEWS_CATEGORIES.length} category routes spanning tech, business, politics, sports, blockchain, science, security, health, and more`,
      "Mixed multi-source story output with standardized fields",
      "Feed-level error reporting alongside successful stories",
      "Mainnet and testnet route families",
    ],
    live: true,
    availability: ["mainnet", "testnet"],
  },
  {
    id: "crypto",
    name: "Crypto Market Data",
    tagline: "Production-grade quotes and candles from official exchange APIs.",
    description:
      "Request-time crypto market data sourced directly from official Binance, Kraken, and Coinbase Exchange REST APIs with normalized JSON responses and deterministic source fallback.",
    audience: "Agents, trading tools, dashboards, analytics products, automations",
    highlights: [
      "Single-symbol quote and candles routes in v1",
      "Default source=best fallback order across Binance, Kraken, and Coinbase",
      "Normalized BTC-USD style contract with exchange-specific symbol translation underneath",
      "No caching or persistence in the crypto data path",
    ],
    live: true,
    availability: ["mainnet", "testnet"],
  },
  {
    id: "chat",
    name: "AI Inference",
    tagline: "Premium text inference backed by the latest GPT model.",
    description:
      "Structured text generation for assistants, copilots, automation, and premium user-facing experiences.",
    audience: "SaaS features, operators, support agents, workflow automation",
    highlights: [
      `Default model: ${config.openai.chatModel}`,
      "Reasoning effort and output length controls",
      "Simple paid POST API shape",
      "Mainnet only",
    ],
    live: config.openai.enabled,
    availability: ["mainnet"],
  },
  {
    id: "image",
    name: "Image Generation",
    tagline: "Prompt-to-image generation for product, content, and creative use cases.",
    description:
      "High-quality image generation with configurable size, quality, background, and output format.",
    audience: "Content platforms, marketing tools, storefronts, product teams",
    highlights: [
      `Default model: ${config.openai.imageModel}`,
      "JPEG, PNG, or WebP output",
      "Background and quality controls",
      "Mainnet only",
    ],
    live: config.openai.enabled,
    availability: ["mainnet"],
  },
  {
    id: "scrape",
    name: "Web Extraction",
    tagline: "Synchronous single-page extraction from public HTML pages.",
    description:
      "Fetch a public URL, respect robots rules, normalize the page, and return structured metadata, text, markdown, links, and JSON-LD in one paid request.",
    audience: "Agents, pipelines, monitors, research tooling, enrichment jobs",
    highlights: [
      "Public http/https pages only",
      "Metadata, text, markdown, links, and JSON-LD extraction",
      "Robots-aware fetching with bounded redirects and body size limits",
      "Mainnet and testnet route families",
    ],
    live: true,
    availability: ["mainnet", "testnet"],
  },
  {
    id: "collect",
    name: "Data Collection",
    tagline: "Bounded same-origin collection across a small public page set.",
    description:
      "Start from a public seed URL and collect a small same-origin set of pages synchronously with regex filtering, dedupe, and normalized markdown or text output.",
    audience: "Agents, ingestion pipelines, change monitors, indexers",
    highlights: [
      "Same-origin bounded crawl with max page and depth limits",
      "Regex include/exclude filters",
      "Canonical or final-URL dedupe",
      "Mainnet and testnet route families",
    ],
    live: true,
    availability: ["mainnet", "testnet"],
  },
];

const endpointDefinitions: ServiceEndpoint[] = [
  {
    id: "weather-current",
    serviceId: "weather",
    method: "GET",
    route: "/weather/current",
    description: "Current weather conditions for a latitude and longitude.",
    responseType: "application/json",
    availability: ["mainnet", "testnet"],
    priceByNetwork: {
      mainnet: config.prices.weather,
      testnet: config.prices.weather,
    },
    requestExample: `curl "${config.publicBaseUrl}/weather/current?latitude=51.5072&longitude=-0.1276&timezone=auto"`,
    requestInputExample: `{\n  "latitude": 51.5072,\n  "longitude": -0.1276,\n  "timezone": "auto"\n}`,
    querySchema: ["latitude", "longitude", "timezone=auto"],
  },
  {
    id: "weather-forecast",
    serviceId: "weather",
    method: "GET",
    route: "/weather/forecast",
    description: "Forecast weather data with optional daily and hourly field selection.",
    responseType: "application/json",
    availability: ["mainnet", "testnet"],
    priceByNetwork: {
      mainnet: config.prices.weather,
      testnet: config.prices.weather,
    },
    requestExample: `curl "${config.publicBaseUrl}/weather/forecast?latitude=51.5072&longitude=-0.1276&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=5&timezone=auto"`,
    requestInputExample: `{\n  "latitude": 51.5072,\n  "longitude": -0.1276,\n  "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",\n  "forecast_days": 5,\n  "timezone": "auto"\n}`,
    querySchema: [
      "latitude",
      "longitude",
      "daily=comma,separated,fields",
      "hourly=comma,separated,fields",
      "forecast_days=1..16",
      "timezone=auto",
    ],
  },
  {
    id: "weather-archive",
    serviceId: "weather",
    method: "GET",
    route: "/weather/archive",
    description: "Historical archive weather data across a date range.",
    responseType: "application/json",
    availability: ["mainnet", "testnet"],
    priceByNetwork: {
      mainnet: config.prices.weather,
      testnet: config.prices.weather,
    },
    requestExample: `curl "${config.publicBaseUrl}/weather/archive?latitude=40.7128&longitude=-74.0060&start_date=2026-03-01&end_date=2026-03-07&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto"`,
    requestInputExample: `{\n  "latitude": 40.7128,\n  "longitude": -74.0060,\n  "start_date": "2026-03-01",\n  "end_date": "2026-03-07",\n  "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",\n  "timezone": "auto"\n}`,
    querySchema: [
      "latitude",
      "longitude",
      "start_date=YYYY-MM-DD",
      "end_date=YYYY-MM-DD",
      "daily=comma,separated,fields",
      "hourly=comma,separated,fields",
      "timezone=auto",
    ],
  },
  {
    id: "weather-history-summary",
    serviceId: "weather",
    method: "GET",
    route: "/weather/history-summary",
    description: "Compact summary view over an archive range with hottest, coldest, and precipitation totals.",
    responseType: "application/json",
    availability: ["mainnet", "testnet"],
    priceByNetwork: {
      mainnet: config.prices.weather,
      testnet: config.prices.weather,
    },
    requestExample: `curl "${config.publicBaseUrl}/weather/history-summary?latitude=40.7128&longitude=-74.0060&start_date=2026-03-01&end_date=2026-03-07&timezone=auto"`,
    requestInputExample: `{\n  "latitude": 40.7128,\n  "longitude": -74.0060,\n  "start_date": "2026-03-01",\n  "end_date": "2026-03-07",\n  "timezone": "auto"\n}`,
    querySchema: [
      "latitude",
      "longitude",
      "start_date=YYYY-MM-DD",
      "end_date=YYYY-MM-DD",
      "timezone=auto",
    ],
  },
  ...NEWS_CATEGORIES.map((category): ServiceEndpoint => ({
    id: `news-${category}`,
    serviceId: "news",
    method: "GET",
    route: `/news/${category}`,
    description: NEWS_CATEGORY_DETAILS[category].description,
    responseType: "application/json",
    availability: ["mainnet", "testnet"],
    priceByNetwork: {
      mainnet: config.prices.news,
      testnet: config.prices.news,
    },
    requestExample: `curl "${config.publicBaseUrl}/news/${category}?limit=12&max_per_feed=6"`,
    requestInputExample: `{\n  "category": "${category}",\n  "limit": 12,\n  "max_per_feed": 6\n}`,
    querySchema: ["limit=1..30", "max_per_feed=1..10"],
  })),
  {
    id: "crypto-quote",
    serviceId: "crypto",
    method: "GET",
    route: "/markets/crypto/quote",
    description: "Normalized crypto quote from Binance, Kraken, or Coinbase Exchange.",
    responseType: "application/json",
    availability: ["mainnet", "testnet"],
    priceByNetwork: {
      mainnet: config.prices.crypto,
      testnet: config.prices.crypto,
    },
    requestExample: `curl "${config.publicBaseUrl}/markets/crypto/quote?symbol=BTC-USD&source=best"`,
    requestInputExample: `{\n  "symbol": "BTC-USD",\n  "source": "best"\n}`,
    querySchema: ["symbol=BASE-USD", "source=best|binance|kraken|coinbase"],
  },
  {
    id: "crypto-candles",
    serviceId: "crypto",
    method: "GET",
    route: "/markets/crypto/candles",
    description: "Normalized crypto candles from Binance, Kraken, or Coinbase Exchange.",
    responseType: "application/json",
    availability: ["mainnet", "testnet"],
    priceByNetwork: {
      mainnet: config.prices.crypto,
      testnet: config.prices.crypto,
    },
    requestExample: `curl "${config.publicBaseUrl}/markets/crypto/candles?symbol=BTC-USD&interval=1h&limit=48&source=best"`,
    requestInputExample: `{\n  "symbol": "BTC-USD",\n  "interval": "1h",\n  "limit": 48,\n  "source": "best"\n}`,
    querySchema: [
      "symbol=BASE-USD",
      "interval=1m|5m|15m|1h|4h|1d|1w|1M",
      "source=best|binance|kraken|coinbase",
      "limit=1..500",
      "start=ISO-8601 timestamp",
      "end=ISO-8601 timestamp",
    ],
  },
  {
    id: "chat-respond",
    serviceId: "chat",
    method: "POST",
    route: "/chat/respond",
    description: "Text inference endpoint for prompts, system instructions, and output controls.",
    responseType: "application/json",
    availability: ["mainnet"],
    priceByNetwork: {
      mainnet: config.prices.chat,
    },
    requestExample: `curl -X POST "${config.publicBaseUrl}/chat/respond" -H "Content-Type: application/json" -d @- <<'JSON'\n{\n  "prompt": "Write a poem about the Stellar network.",\n  "system": "Be concise and professional in your response.",\n  "reasoning_effort": "medium"\n}\nJSON`,
    requestBodyExample: `{\n  "prompt": "Write a poem about the Stellar network.",\n  "system": "Be concise and professional in your response.",\n  "reasoning_effort": "medium"\n}`,
    bodySchema: [
      "prompt: string",
      "system?: string",
      "max_output_tokens?: integer 64..4096",
      "reasoning_effort?: none | low | medium | high | xhigh",
      "metadata?: object<string,string>",
    ],
  },
  {
    id: "image-generate",
    serviceId: "image",
    method: "POST",
    route: "/image/generate",
    description: "Prompt-to-image generation that returns a base64-encoded image payload.",
    responseType: "application/json",
    availability: ["mainnet"],
    priceByNetwork: {
      mainnet: config.prices.image,
    },
    requestExample: `curl -X POST "${config.publicBaseUrl}/image/generate" -H "Content-Type: application/json" -d @- <<'JSON'\n{\n  "prompt": "A cinematic satellite view of a storm front above the Atlantic, premium editorial style",\n  "size": "1536x1024",\n  "quality": "high",\n  "output_format": "jpeg"\n}\nJSON`,
    requestBodyExample: `{\n  "prompt": "A cinematic satellite view of a storm front above the Atlantic, premium editorial style",\n  "size": "1536x1024",\n  "quality": "high",\n  "output_format": "jpeg"\n}`,
    bodySchema: [
      "prompt: string",
      "size?: auto | 1024x1024 | 1536x1024 | 1024x1536",
      "quality?: auto | low | medium | high",
      "background?: auto | opaque | transparent",
      "output_format?: jpeg | png | webp",
      "moderation?: auto | low",
    ],
  },
  {
    id: "scrape-extract",
    serviceId: "scrape",
    method: "POST",
    route: "/scrape/extract",
    description: "Fetch and normalize one public HTML page into structured extraction output.",
    responseType: "application/json",
    availability: ["mainnet", "testnet"],
    priceByNetwork: {
      mainnet: config.prices.scrape,
      testnet: config.prices.scrape,
    },
    requestExample: `curl -X POST "${config.publicBaseUrl}/scrape/extract" -H "Content-Type: application/json" -d @- <<'JSON'\n{\n  "url": "https://example.com/article",\n  "format": "markdown",\n  "include_links": true,\n  "include_metadata": true,\n  "include_json_ld": true,\n  "max_chars": 50000\n}\nJSON`,
    requestBodyExample: `{\n  "url": "https://example.com/article",\n  "format": "markdown",\n  "include_links": true,\n  "include_metadata": true,\n  "include_json_ld": true,\n  "max_chars": 50000\n}`,
    bodySchema: [
      "url: absolute http|https URL",
      "format?: text | markdown",
      "include_links?: boolean",
      "include_metadata?: boolean",
      "include_json_ld?: boolean",
      "max_chars?: integer 1000..100000",
    ],
  },
  {
    id: "collect-run",
    serviceId: "collect",
    method: "POST",
    route: "/collect/run",
    description: "Run a bounded same-origin collection starting from one public seed URL.",
    responseType: "application/json",
    availability: ["mainnet", "testnet"],
    priceByNetwork: {
      mainnet: config.prices.collect,
      testnet: config.prices.collect,
    },
    requestExample: `curl -X POST "${config.publicBaseUrl}/collect/run" -H "Content-Type: application/json" -d @- <<'JSON'\n{\n  "seed_url": "https://example.com/blog",\n  "scope": "same_origin",\n  "max_pages": 5,\n  "max_depth": 1,\n  "include_patterns": ["/blog/"],\n  "exclude_patterns": ["/tag/"],\n  "format": "markdown",\n  "dedupe": "canonical_url",\n  "max_chars_per_page": 30000\n}\nJSON`,
    requestBodyExample: `{\n  "seed_url": "https://example.com/blog",\n  "scope": "same_origin",\n  "max_pages": 5,\n  "max_depth": 1,\n  "include_patterns": ["/blog/"],\n  "exclude_patterns": ["/tag/"],\n  "format": "markdown",\n  "dedupe": "canonical_url",\n  "max_chars_per_page": 30000\n}`,
    bodySchema: [
      "seed_url: absolute http|https URL",
      "scope?: same_origin",
      "max_pages?: integer 1..10",
      "max_depth?: integer 0..2",
      "include_patterns?: string[]",
      "exclude_patterns?: string[]",
      "format?: text | markdown",
      "dedupe?: canonical_url | final_url",
      "max_chars_per_page?: integer 1000..50000",
    ],
  },
];

function buildNetworkRequestExample(
  endpoint: ServiceEndpoint,
  fullPath: string,
) {
  return endpoint.requestExample.replaceAll(
    `${config.publicBaseUrl}${endpoint.route}`,
    `${config.publicBaseUrl}${fullPath}`,
  );
}

function isServiceLive(serviceId: ServiceId) {
  return serviceDefinitions.find((service) => service.id === serviceId)?.live ?? false;
}

export function buildPlatformCatalog(): PlatformCatalog {
  const services = serviceDefinitions.filter(
    (service) => service.live || service.id === "weather",
  );
  const endpoints = endpointDefinitions.filter((endpoint) => isServiceLive(endpoint.serviceId));
  const publishedEndpoints: PublishedEndpoint[] = [];

  for (const endpoint of endpoints) {
    for (const network of endpoint.availability) {
      const networkConfig = config.networks[network];
      if (!networkConfig) {
        continue;
      }

      const priceUsd = endpoint.priceByNetwork[network];
      if (!priceUsd) {
        continue;
      }

      const fullPath = `${networkConfig.routePrefix}${endpoint.route}`;

      publishedEndpoints.push({
        ...endpoint,
        requestExample: buildNetworkRequestExample(endpoint, fullPath),
        fullPath,
        network,
        networkConfig,
        priceUsd,
      });
    }
  }

  return {
    services,
    endpoints,
    publishedEndpoints,
  };
}
