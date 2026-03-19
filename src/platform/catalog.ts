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
    requestBodyExample: `{\n  "prompt": "Write a landing page headline for a premium weather API on Stellar.",\n  "system": "Be concise and professional in your response.",\n  "reasoning_effort": "medium"\n}`,
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
];

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

      publishedEndpoints.push({
        ...endpoint,
        fullPath: `${networkConfig.routePrefix}${endpoint.route}`,
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
