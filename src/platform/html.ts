import { config } from "../config.js";
import type { PlatformCatalog, ServiceDefinition } from "./catalog.js";
import {
  ARCHIVE_DAILY_FIELDS,
  ARCHIVE_HOURLY_FIELDS,
  FORECAST_DAILY_FIELDS,
  FORECAST_HOURLY_FIELDS,
} from "../utils/validate.js";
import { NEWS_CATEGORIES } from "../services/newsFeeds.js";

type FieldRow = {
  name: string;
  type: string;
  required: string;
  description: string;
};

type RouteDoc = {
  method: "GET" | "POST";
  path: string;
  network: string;
  priceUsd: string;
  note?: string;
};

type EndpointDoc = {
  id: string;
  title: string;
  method: "GET" | "POST";
  description: string;
  routes: RouteDoc[];
  requestLabel: string;
  requestExample: string;
  responseExample: string;
  requestFields: FieldRow[];
  responseFields: FieldRow[];
  notes?: string[];
  supporting?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderCodeBlock(label: string, code: string) {
  return `
    <div class="code-panel">
      <div class="code-panel-header">
        <span class="code-panel-title">${escapeHtml(label)}</span>
      </div>
      <pre><code>${escapeHtml(code)}</code></pre>
    </div>
  `;
}

function renderFieldTable(title: string, rows: FieldRow[]) {
  return `
    <div class="table-panel">
      <div class="table-title">${escapeHtml(title)}</div>
      <div class="table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td><code>${escapeHtml(row.name)}</code></td>
                    <td>${escapeHtml(row.type)}</td>
                    <td>${escapeHtml(row.required)}</td>
                    <td>${escapeHtml(row.description)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderChips(values: string[]) {
  return values.map((value) => `<span class="chip">${escapeHtml(value)}</span>`).join("");
}

function renderRouteMatrix(routes: RouteDoc[]) {
  return `
    <div class="route-list">
      ${routes
        .map(
          (route) => `
            <div class="route-row">
              <span class="route-method route-method-${route.method.toLowerCase()}">${escapeHtml(route.method)}</span>
              <code class="route-path">${escapeHtml(route.path)}</code>
              <span class="route-meta">${escapeHtml(route.network)}</span>
              <span class="route-meta">$${escapeHtml(route.priceUsd)} USD</span>
              ${route.note ? `<span class="route-note">${escapeHtml(route.note)}</span>` : ""}
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderEndpointDoc(endpoint: EndpointDoc) {
  return `
    <article class="reference-card" id="${escapeHtml(endpoint.id)}">
      <div class="reference-card-head">
        <div>
          <div class="eyebrow">${escapeHtml(endpoint.method)} Endpoint</div>
          <h3>${escapeHtml(endpoint.title)}</h3>
          <p>${escapeHtml(endpoint.description)}</p>
        </div>
      </div>
      ${renderRouteMatrix(endpoint.routes)}
      <div class="reference-columns">
        <div>
          ${renderFieldTable("Request", endpoint.requestFields)}
          ${renderCodeBlock(endpoint.requestLabel, endpoint.requestExample)}
        </div>
        <div>
          ${renderFieldTable("Response", endpoint.responseFields)}
          ${renderCodeBlock("Response JSON", endpoint.responseExample)}
        </div>
      </div>
      ${
        endpoint.supporting
          ? `<div class="support-panel">${endpoint.supporting}</div>`
          : ""
      }
      ${
        endpoint.notes?.length
          ? `
            <div class="note-list">
              ${endpoint.notes.map((note) => `<div class="note-item">${escapeHtml(note)}</div>`).join("")}
            </div>
          `
          : ""
      }
    </article>
  `;
}

function serviceIcon(id: string) {
  switch (id) {
    case "weather":
      return "WX";
    case "news":
      return "NW";
    case "chat":
      return "AI";
    case "image":
      return "IM";
    default:
      return "API";
  }
}

function serviceAccent(id: string) {
  switch (id) {
    case "weather":
      return "var(--accent-teal)";
    case "news":
      return "var(--accent-orange)";
    case "chat":
      return "var(--accent-blue)";
    case "image":
      return "var(--accent-red)";
    default:
      return "var(--accent-teal)";
  }
}

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function groupPublishedRoutes(catalog: PlatformCatalog, endpointId: string): RouteDoc[] {
  return catalog.publishedEndpoints
    .filter((endpoint) => endpoint.id === endpointId)
    .map((endpoint) => ({
      method: endpoint.method,
      path: endpoint.fullPath,
      network: endpoint.network,
      priceUsd: endpoint.priceUsd,
    }));
}

function optionalRoute(
  method: "GET" | "POST",
  path: string,
  priceUsd: string,
  note: string,
): RouteDoc[] {
  return [
    {
      method,
      path,
      network: "mainnet",
      priceUsd,
      note,
    },
  ];
}

function sharedEnvelopeExample(priceUsd: string, network: "mainnet" | "testnet", data: unknown) {
  return {
    network,
    paid: true,
    price_usd: priceUsd,
    assets: ["USDC", "XLM"],
    data,
  };
}

function weatherCurrentExample() {
  return sharedEnvelopeExample(config.prices.weather, "mainnet", {
    latitude: 51.5072,
    longitude: -0.1276,
    generationtime_ms: 0.31,
    utc_offset_seconds: 0,
    timezone: "GMT",
    timezone_abbreviation: "GMT",
    elevation: 14,
    current_units: {
      time: "iso8601",
      interval: "seconds",
      temperature_2m: "°C",
      relative_humidity_2m: "%",
      apparent_temperature: "°C",
      precipitation: "mm",
      weather_code: "wmo code",
      cloud_cover: "%",
      pressure_msl: "hPa",
      wind_speed_10m: "km/h",
      wind_direction_10m: "°",
      is_day: "",
    },
    current: {
      time: "2026-03-19T12:00",
      interval: 900,
      temperature_2m: 13.2,
      relative_humidity_2m: 68,
      apparent_temperature: 12.4,
      precipitation: 0,
      weather_code: 3,
      cloud_cover: 72,
      pressure_msl: 1014.3,
      wind_speed_10m: 16.1,
      wind_direction_10m: 235,
      is_day: 1,
    },
  });
}

function weatherForecastExample() {
  return sharedEnvelopeExample(config.prices.weather, "mainnet", {
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: "GMT",
    timezone_abbreviation: "GMT",
    daily_units: {
      time: "iso8601",
      temperature_2m_max: "°C",
      temperature_2m_min: "°C",
      precipitation_sum: "mm",
    },
    daily: {
      time: ["2026-03-19", "2026-03-20", "2026-03-21"],
      temperature_2m_max: [14.8, 15.2, 12.9],
      temperature_2m_min: [8.1, 7.5, 6.2],
      precipitation_sum: [0.1, 1.9, 0],
    },
  });
}

function weatherArchiveExample() {
  return sharedEnvelopeExample(config.prices.weather, "mainnet", {
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
    daily_units: {
      time: "iso8601",
      temperature_2m_max: "°C",
      temperature_2m_min: "°C",
      precipitation_sum: "mm",
    },
    daily: {
      time: ["2026-03-01", "2026-03-02", "2026-03-03"],
      temperature_2m_max: [11.2, 9.6, 10.8],
      temperature_2m_min: [2.4, 1.1, 3.7],
      precipitation_sum: [0, 4.3, 1.2],
    },
  });
}

function weatherHistorySummaryExample() {
  return sharedEnvelopeExample(config.prices.weather, "mainnet", {
    latitude: 40.7128,
    longitude: -74.006,
    start_date: "2026-03-01",
    end_date: "2026-03-07",
    timezone: "America/New_York",
    summary: {
      average_max_temp_c: 10.54,
      average_min_temp_c: 2.47,
      total_precipitation_mm: 8.9,
      hottest_day: {
        date: "2026-03-05",
        temperature_2m_max: 14.6,
      },
      coldest_day: {
        date: "2026-03-02",
        temperature_2m_min: -0.8,
      },
    },
  });
}

function newsExample() {
  return sharedEnvelopeExample(config.prices.news, "mainnet", {
    category: "ai",
    requested_at: "2026-03-19T11:52:31.000Z",
    story_count: 3,
    source_count: 3,
    sources: [
      {
        source: {
          id: "openai-news",
          name: "OpenAI News",
          site_url: "https://openai.com/news",
          feed_url: "https://openai.com/news/rss.xml",
        },
        item_count: 6,
      },
    ],
    errors: [],
    stories: [
      {
        title: "Example headline",
        url: "https://example.com/story",
        summary: "Normalized RSS summary text.",
        published_at: "2026-03-19T10:30:00.000Z",
        source: {
          id: "openai-news",
          name: "OpenAI News",
          site_url: "https://openai.com/news",
          feed_url: "https://openai.com/news/rss.xml",
        },
        category: "ai",
      },
    ],
  });
}

function chatExample() {
  return sharedEnvelopeExample(config.prices.chat, "mainnet", {
    id: "resp_123",
    model: config.openai.chatModel,
    output_text: "Forecast quality now sold per call on Stellar.",
    status: "completed",
    incomplete_details: null,
    usage: {
      input_tokens: 42,
      output_tokens: 18,
      total_tokens: 60,
    },
  });
}

function imageExample() {
  return sharedEnvelopeExample(config.prices.image, "mainnet", {
    created: 1773922861,
    model: config.openai.imageModel,
    mime_type: "image/jpeg",
    image_base64: "/9j/4AAQSkZJRgABAQAAAQABAAD...",
    revised_prompt: "A cinematic satellite view of a storm front above the Atlantic.",
    size: "1536x1024",
    quality: "high",
    background: "auto",
  });
}

function getEndpointDocs(catalog: PlatformCatalog): EndpointDoc[] {
  return [
    {
      id: "weather-current",
      title: "Current weather",
      method: "GET",
      description:
        "Returns current conditions from Open-Meteo for a single latitude and longitude.",
      routes: groupPublishedRoutes(catalog, "weather-current"),
      requestLabel: "Query JSON",
      requestExample: json({
        latitude: 51.5072,
        longitude: -0.1276,
        timezone: "auto",
      }),
      responseExample: json(weatherCurrentExample()),
      requestFields: [
        { name: "latitude", type: "number", required: "Yes", description: "Latitude between -90 and 90." },
        { name: "longitude", type: "number", required: "Yes", description: "Longitude between -180 and 180." },
        { name: "timezone", type: "string", required: "No", description: "IANA timezone or auto. Defaults to auto." },
      ],
      responseFields: [
        { name: "network", type: "string", required: "Yes", description: "Published network label: mainnet or testnet." },
        { name: "paid", type: "boolean", required: "Yes", description: "Always true for successful paid requests." },
        { name: "price_usd", type: "string", required: "Yes", description: "USD price string used for the paid call." },
        { name: "assets", type: "string[]", required: "Yes", description: "Accepted settlement assets, typically USDC and XLM." },
        { name: "data.current_units", type: "object", required: "Yes", description: "Units for the selected current weather fields." },
        { name: "data.current", type: "object", required: "Yes", description: "Current values for temperature, humidity, precipitation, pressure, wind, cloud cover, and daylight state." },
      ],
      notes: [
        "Content is passed through from the Open-Meteo forecast API inside the shared paid-response envelope.",
        "The current object always requests temperature, humidity, apparent temperature, precipitation, weather code, cloud cover, pressure, wind speed, wind direction, and is_day.",
      ],
    },
    {
      id: "weather-forecast",
      title: "Forecast weather",
      method: "GET",
      description:
        "Returns daily and optional hourly forecast data for up to 16 days.",
      routes: groupPublishedRoutes(catalog, "weather-forecast"),
      requestLabel: "Query JSON",
      requestExample: json({
        latitude: 51.5072,
        longitude: -0.1276,
        daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
        hourly: "temperature_2m,wind_speed_10m",
        forecast_days: 5,
        timezone: "auto",
      }),
      responseExample: json(weatherForecastExample()),
      requestFields: [
        { name: "latitude", type: "number", required: "Yes", description: "Latitude between -90 and 90." },
        { name: "longitude", type: "number", required: "Yes", description: "Longitude between -180 and 180." },
        { name: "daily", type: "string", required: "No", description: "Comma-separated forecast daily fields. Defaults to max temp, min temp, and precipitation_sum." },
        { name: "hourly", type: "string", required: "No", description: "Comma-separated forecast hourly fields." },
        { name: "forecast_days", type: "integer", required: "No", description: "Optional range 1..16." },
        { name: "timezone", type: "string", required: "No", description: "IANA timezone or auto. Defaults to auto." },
      ],
      responseFields: [
        { name: "data.daily_units", type: "object", required: "Conditional", description: "Units object for daily arrays when daily fields are requested." },
        { name: "data.daily", type: "object", required: "Conditional", description: "Daily forecast arrays keyed by each requested field." },
        { name: "data.hourly_units", type: "object", required: "Conditional", description: "Units object for hourly arrays when hourly fields are requested." },
        { name: "data.hourly", type: "object", required: "Conditional", description: "Hourly forecast arrays keyed by each requested field." },
      ],
      supporting: `
        <div class="support-grid">
          <div>
            <div class="support-title">Forecast daily fields</div>
            <div class="chip-row">${renderChips(Array.from(FORECAST_DAILY_FIELDS))}</div>
          </div>
          <div>
            <div class="support-title">Forecast hourly fields</div>
            <div class="chip-row">${renderChips(Array.from(FORECAST_HOURLY_FIELDS))}</div>
          </div>
        </div>
      `,
      notes: [
        "Unsupported field names are rejected with 400 invalid_request.",
        "If neither hourly nor daily is specified, the API still returns default daily summary fields.",
      ],
    },
    {
      id: "weather-archive",
      title: "Archive weather",
      method: "GET",
      description:
        "Returns historical weather data from the archive API for a bounded date range.",
      routes: groupPublishedRoutes(catalog, "weather-archive"),
      requestLabel: "Query JSON",
      requestExample: json({
        latitude: 40.7128,
        longitude: -74.006,
        start_date: "2026-03-01",
        end_date: "2026-03-07",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
        hourly: "temperature_2m,precipitation",
        timezone: "auto",
      }),
      responseExample: json(weatherArchiveExample()),
      requestFields: [
        { name: "latitude", type: "number", required: "Yes", description: "Latitude between -90 and 90." },
        { name: "longitude", type: "number", required: "Yes", description: "Longitude between -180 and 180." },
        { name: "start_date", type: "string", required: "Yes", description: "Start date in YYYY-MM-DD format." },
        { name: "end_date", type: "string", required: "Yes", description: "End date in YYYY-MM-DD format. Must be on or after start_date." },
        { name: "daily", type: "string", required: "No", description: "Comma-separated archive daily fields. Defaults to max temp, min temp, and precipitation_sum." },
        { name: "hourly", type: "string", required: "No", description: "Comma-separated archive hourly fields." },
        { name: "timezone", type: "string", required: "No", description: "IANA timezone or auto. Defaults to auto." },
      ],
      responseFields: [
        { name: "data.daily_units", type: "object", required: "Conditional", description: "Units object for daily arrays when daily fields are requested." },
        { name: "data.daily", type: "object", required: "Conditional", description: "Historical daily arrays keyed by each requested field." },
        { name: "data.hourly_units", type: "object", required: "Conditional", description: "Units object for hourly arrays when hourly fields are requested." },
        { name: "data.hourly", type: "object", required: "Conditional", description: "Historical hourly arrays keyed by each requested field." },
      ],
      supporting: `
        <div class="support-grid">
          <div>
            <div class="support-title">Archive daily fields</div>
            <div class="chip-row">${renderChips(Array.from(ARCHIVE_DAILY_FIELDS))}</div>
          </div>
          <div>
            <div class="support-title">Archive hourly fields</div>
            <div class="chip-row">${renderChips(Array.from(ARCHIVE_HOURLY_FIELDS))}</div>
          </div>
        </div>
      `,
      notes: [
        "Date ranges longer than 366 days are rejected.",
        "The archive payload is passed through from Open-Meteo inside the standard paid-response envelope.",
      ],
    },
    {
      id: "weather-history-summary",
      title: "History summary",
      method: "GET",
      description:
        "Returns a compact custom summary built from archive daily weather fields.",
      routes: groupPublishedRoutes(catalog, "weather-history-summary"),
      requestLabel: "Query JSON",
      requestExample: json({
        latitude: 40.7128,
        longitude: -74.006,
        start_date: "2026-03-01",
        end_date: "2026-03-07",
        timezone: "auto",
      }),
      responseExample: json(weatherHistorySummaryExample()),
      requestFields: [
        { name: "latitude", type: "number", required: "Yes", description: "Latitude between -90 and 90." },
        { name: "longitude", type: "number", required: "Yes", description: "Longitude between -180 and 180." },
        { name: "start_date", type: "string", required: "Yes", description: "Start date in YYYY-MM-DD format." },
        { name: "end_date", type: "string", required: "Yes", description: "End date in YYYY-MM-DD format." },
        { name: "timezone", type: "string", required: "No", description: "IANA timezone or auto. Defaults to auto." },
      ],
      responseFields: [
        { name: "data.latitude", type: "number", required: "Yes", description: "Echoed latitude." },
        { name: "data.longitude", type: "number", required: "Yes", description: "Echoed longitude." },
        { name: "data.start_date", type: "string", required: "Yes", description: "Resolved start date." },
        { name: "data.end_date", type: "string", required: "Yes", description: "Resolved end date." },
        { name: "data.summary", type: "object", required: "Yes", description: "Aggregated metrics including average temperatures, precipitation total, hottest day, and coldest day." },
      ],
      notes: [
        "This endpoint does not expose raw hourly arrays; it computes a compact summary server-side.",
      ],
    },
    {
      id: "news-category",
      title: "News by category",
      method: "GET",
      description:
        "Returns normalized RSS/Atom stories blended from multiple feeds for one category.",
      routes: groupPublishedRoutes(catalog, "news-ai").length
        ? [
            { method: "GET", path: "/news/:category", network: "mainnet", priceUsd: config.prices.news },
            { method: "GET", path: "/testnet/news/:category", network: "testnet", priceUsd: config.prices.news },
          ]
        : [
            { method: "GET", path: "/news/:category", network: "mainnet", priceUsd: config.prices.news },
            { method: "GET", path: "/testnet/news/:category", network: "testnet", priceUsd: config.prices.news },
          ],
      requestLabel: "Query + path JSON",
      requestExample: json({
        category: "ai",
        limit: 12,
        max_per_feed: 6,
      }),
      responseExample: json(newsExample()),
      requestFields: [
        { name: "category", type: "path string", required: "Yes", description: `One of: ${NEWS_CATEGORIES.join(", ")}.` },
        { name: "limit", type: "integer", required: "No", description: "Total stories to return, between 1 and 30. Defaults to 12." },
        { name: "max_per_feed", type: "integer", required: "No", description: "Per-feed item cap, between 1 and 10. Defaults to 6." },
      ],
      responseFields: [
        { name: "data.category", type: "string", required: "Yes", description: "Resolved category." },
        { name: "data.requested_at", type: "string", required: "Yes", description: "ISO timestamp for the aggregation run." },
        { name: "data.story_count", type: "integer", required: "Yes", description: "Count of returned stories after interleaving and dedupe." },
        { name: "data.source_count", type: "integer", required: "Yes", description: "Number of feed sources that returned successfully." },
        { name: "data.sources", type: "array", required: "Yes", description: "Per-source success metadata with item counts." },
        { name: "data.errors", type: "array", required: "Yes", description: "Per-source error information for feeds that failed." },
        { name: "data.stories", type: "array", required: "Yes", description: "Normalized stories containing title, URL, summary, published_at, source, and category." },
      ],
      supporting: `
        <div>
          <div class="support-title">Supported categories</div>
          <div class="chip-row">${renderChips([...NEWS_CATEGORIES])}</div>
        </div>
      `,
      notes: [
        "Story lists are deduplicated by title and URL across all source feeds.",
        "If no parseable stories remain after aggregation, the endpoint returns 502 upstream_error.",
      ],
    },
    {
      id: "chat-respond",
      title: "Chat respond",
      method: "POST",
      description:
        "Runs a paid text generation request against the configured GPT model.",
      routes: groupPublishedRoutes(catalog, "chat-respond").length
        ? groupPublishedRoutes(catalog, "chat-respond")
        : optionalRoute("POST", "/chat/respond", config.prices.chat, "Published only when OPENAI_API_KEY is configured."),
      requestLabel: "Request JSON",
      requestExample: json({
        prompt: "Write a landing page headline for a premium weather API on Stellar.",
        system: "Be concise and commercial.",
        max_output_tokens: 800,
        reasoning_effort: "medium",
        metadata: {
          product: "weather-api",
          channel: "docs-demo",
        },
      }),
      responseExample: json(chatExample()),
      requestFields: [
        { name: "prompt", type: "string", required: "Yes", description: "Primary prompt, trimmed, max 32,000 characters." },
        { name: "system", type: "string", required: "No", description: "Optional instructions, max 12,000 characters." },
        { name: "max_output_tokens", type: "integer", required: "No", description: "Range 64..4096. Defaults to 800." },
        { name: "reasoning_effort", type: "string", required: "No", description: "One of none, low, medium, high, xhigh. Defaults to medium." },
        { name: "metadata", type: "object<string,string>", required: "No", description: "Up to 16 keys. Keys max 64 chars, values max 512 chars." },
      ],
      responseFields: [
        { name: "data.id", type: "string", required: "Yes", description: "OpenAI response id." },
        { name: "data.model", type: "string", required: "Yes", description: "Configured chat model." },
        { name: "data.output_text", type: "string", required: "Yes", description: "Final rendered text output." },
        { name: "data.status", type: "string", required: "Yes", description: "Responses API status." },
        { name: "data.incomplete_details", type: "object | null", required: "Yes", description: "Incomplete response details when applicable." },
        { name: "data.usage", type: "object | null", required: "Yes", description: "Token usage summary returned by OpenAI." },
      ],
      notes: [
        "If AI services are disabled, this route returns 503 service_unavailable.",
      ],
    },
    {
      id: "image-generate",
      title: "Image generate",
      method: "POST",
      description:
        "Generates a single image and returns the base64 payload in JSON.",
      routes: groupPublishedRoutes(catalog, "image-generate").length
        ? groupPublishedRoutes(catalog, "image-generate")
        : optionalRoute("POST", "/image/generate", config.prices.image, "Published only when OPENAI_API_KEY is configured."),
      requestLabel: "Request JSON",
      requestExample: json({
        prompt: "A cinematic satellite view of a storm front above the Atlantic, premium editorial style",
        size: "1536x1024",
        quality: "high",
        background: "auto",
        output_format: "jpeg",
        moderation: "auto",
      }),
      responseExample: json(imageExample()),
      requestFields: [
        { name: "prompt", type: "string", required: "Yes", description: "Prompt text, trimmed, max 32,000 characters." },
        { name: "size", type: "string", required: "No", description: "One of auto, 1024x1024, 1536x1024, 1024x1536. Defaults to auto." },
        { name: "quality", type: "string", required: "No", description: "One of auto, low, medium, high. Defaults to high." },
        { name: "background", type: "string", required: "No", description: "One of auto, opaque, transparent. Defaults to auto." },
        { name: "output_format", type: "string", required: "No", description: "One of jpeg, png, webp. Defaults to jpeg." },
        { name: "moderation", type: "string", required: "No", description: "One of auto or low. Defaults to auto." },
      ],
      responseFields: [
        { name: "data.created", type: "integer", required: "Yes", description: "Unix timestamp returned by the image generation API." },
        { name: "data.model", type: "string", required: "Yes", description: "Configured image model." },
        { name: "data.mime_type", type: "string", required: "Yes", description: "Derived from output_format." },
        { name: "data.image_base64", type: "string", required: "Yes", description: "Base64-encoded image payload." },
        { name: "data.revised_prompt", type: "string | null", required: "Yes", description: "Prompt rewrite returned by the upstream model when available." },
        { name: "data.size", type: "string", required: "Yes", description: "Resolved size setting used for generation." },
      ],
      notes: [
        "Transparent backgrounds require output_format png or webp.",
      ],
    },
  ];
}

const sharedStyles = `
:root {
  --bg: #f7f2e8;
  --bg-deep: #efe7d8;
  --surface: rgba(255, 252, 246, 0.92);
  --surface-strong: #fffdf8;
  --surface-muted: #f3ecdf;
  --border: #ddcfbb;
  --border-strong: #cdb89a;
  --text: #1f2a37;
  --text-soft: #5d6a78;
  --text-faint: #7f8b97;
  --accent: #0f766e;
  --accent-teal: #0f766e;
  --accent-orange: #c46a1a;
  --accent-blue: #2f6fed;
  --accent-red: #b74434;
  --shadow: 0 20px 50px rgba(84, 61, 33, 0.08);
  --radius-lg: 24px;
  --radius-md: 18px;
  --radius-sm: 12px;
  --font-ui: "Manrope", "Segoe UI", sans-serif;
  --font-display: "Newsreader", Georgia, serif;
  --font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--text);
  background:
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.08), transparent 30%),
    radial-gradient(circle at bottom right, rgba(196, 106, 26, 0.1), transparent 28%),
    linear-gradient(180deg, #faf6ef 0%, #f3ecdf 100%);
  font-family: var(--font-ui);
  line-height: 1.65;
}

a {
  color: inherit;
  text-decoration: none;
}

code,
pre,
kbd {
  font-family: var(--font-mono);
}

.page-shell {
  width: min(1440px, calc(100% - 32px));
  margin: 0 auto;
  padding-bottom: 40px;
}

.topbar {
  position: sticky;
  top: 16px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 16px 0 28px;
  padding: 14px 18px;
  border: 1px solid rgba(205, 184, 154, 0.7);
  border-radius: 999px;
  background: rgba(255, 252, 246, 0.82);
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgba(84, 61, 33, 0.06);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--surface-strong);
  background: linear-gradient(135deg, var(--accent) 0%, #2f6fed 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.brand-copy {
  min-width: 0;
}

.brand-copy strong {
  display: block;
  font-size: 0.95rem;
  line-height: 1.1;
}

.brand-copy span {
  display: block;
  color: var(--text-soft);
  font-size: 0.82rem;
}

.topnav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.topnav a {
  padding: 9px 14px;
  border-radius: 999px;
  font-size: 0.9rem;
  color: var(--text-soft);
}

.topnav a:hover,
.topnav a.active {
  color: var(--text);
  background: var(--surface-muted);
}

.hero,
.intro-panel,
.content-panel,
.reference-card,
.service-card,
.summary-card,
.support-panel,
.sidebar-card,
.toc-card,
.table-panel,
.code-panel,
.callout,
.step-card {
  border: 1px solid rgba(221, 207, 187, 0.92);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.hero {
  padding: 52px;
  border-radius: 36px;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr);
  gap: 28px;
  overflow: hidden;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero h1,
.doc-title,
.service-header h1 {
  margin: 0 0 16px;
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 5vw, 4.8rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
}

.hero p,
.doc-lead,
.service-header p {
  margin: 0;
  max-width: 58ch;
  color: var(--text-soft);
  font-size: 1.02rem;
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 26px;
  flex-wrap: wrap;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
  font-size: 0.92rem;
}

.button-primary {
  color: white;
  background: linear-gradient(135deg, var(--accent) 0%, #1d8f84 100%);
}

.button-secondary {
  border-color: var(--border);
  background: var(--surface-strong);
}

.hero-side {
  display: grid;
  gap: 14px;
}

.summary-card {
  border-radius: 22px;
  padding: 18px;
}

.summary-card strong {
  display: block;
  font-size: 1.65rem;
  margin-bottom: 6px;
}

.summary-card span {
  color: var(--text-soft);
  font-size: 0.9rem;
}

.section {
  margin-top: 28px;
}

.section-head {
  margin-bottom: 18px;
}

.section-head h2 {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: clamp(2rem, 3vw, 2.7rem);
  letter-spacing: -0.03em;
}

.section-head p {
  margin: 0;
  color: var(--text-soft);
  max-width: 70ch;
}

.service-grid,
.summary-grid,
.step-grid,
.discovery-grid {
  display: grid;
  gap: 18px;
}

.service-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.summary-grid,
.step-grid,
.discovery-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.service-card,
.content-panel,
.step-card,
.callout {
  border-radius: var(--radius-lg);
  padding: 24px;
}

.service-card-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.service-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: white;
}

.service-card h3,
.content-panel h3,
.reference-card h3,
.step-card h3 {
  margin: 0 0 8px;
  font-size: 1.2rem;
  letter-spacing: -0.02em;
}

.service-card p,
.content-panel p,
.reference-card p,
.step-card p,
.sidebar-card p,
.toc-card p {
  margin: 0;
  color: var(--text-soft);
}

.meta-row,
.chip-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.meta-row {
  margin-top: 16px;
}

.chip,
.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--surface-muted);
  border: 1px solid rgba(205, 184, 154, 0.8);
  color: var(--text-soft);
  font-size: 0.78rem;
  font-weight: 700;
}

.docs-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 220px;
  gap: 24px;
  align-items: start;
}

.docs-sidebar,
.docs-toc {
  position: sticky;
  top: 98px;
}

.sidebar-card,
.toc-card {
  border-radius: 24px;
  padding: 20px;
}

.sidebar-card + .sidebar-card,
.toc-card + .toc-card {
  margin-top: 16px;
}

.sidebar-title,
.toc-title,
.support-title,
.table-title {
  margin: 0 0 12px;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.sidebar-links,
.toc-links {
  display: grid;
  gap: 6px;
}

.sidebar-links a,
.toc-links a {
  padding: 8px 10px;
  border-radius: 12px;
  color: var(--text-soft);
  font-size: 0.92rem;
}

.sidebar-links a:hover,
.toc-links a:hover {
  background: var(--surface-muted);
  color: var(--text);
}

.sidebar-group {
  margin-top: 12px;
}

.sidebar-group-label {
  margin: 14px 0 8px;
  color: var(--text-faint);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.docs-content {
  min-width: 0;
}

.doc-header {
  padding: 34px;
  border-radius: 32px;
  border: 1px solid rgba(221, 207, 187, 0.92);
  background: linear-gradient(135deg, rgba(255, 252, 246, 0.98), rgba(243, 236, 223, 0.92));
  box-shadow: var(--shadow);
}

.doc-title {
  font-size: clamp(2.6rem, 4vw, 4rem);
}

.doc-section {
  margin-top: 22px;
  padding: 26px;
  border-radius: 28px;
  border: 1px solid rgba(221, 207, 187, 0.92);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.doc-section h2 {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: clamp(1.9rem, 3vw, 2.4rem);
  letter-spacing: -0.03em;
}

.doc-section > p {
  margin: 0 0 18px;
  color: var(--text-soft);
}

.reference-stack {
  display: grid;
  gap: 18px;
}

.reference-card {
  border-radius: 24px;
  padding: 24px;
}

.reference-card-head {
  margin-bottom: 14px;
}

.route-list {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
}

.route-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
}

.route-method {
  min-width: 54px;
  justify-content: center;
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  color: white;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.route-method-get {
  background: var(--accent-teal);
}

.route-method-post {
  background: var(--accent-orange);
}

.route-path {
  padding: 0;
  font-size: 0.9rem;
  color: var(--text);
}

.route-meta,
.route-note {
  color: var(--text-soft);
  font-size: 0.82rem;
}

.reference-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  align-items: start;
}

.table-panel,
.code-panel,
.support-panel {
  border-radius: 18px;
  overflow: hidden;
}

.table-wrap {
  overflow-x: auto;
}

.doc-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
}

.doc-table th,
.doc-table td {
  padding: 12px 14px;
  border-top: 1px solid rgba(221, 207, 187, 0.92);
  text-align: left;
  vertical-align: top;
  font-size: 0.9rem;
}

.doc-table thead th {
  border-top: 0;
  color: var(--text-faint);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.09em;
}

.code-panel-header {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(221, 207, 187, 0.92);
  background: rgba(243, 236, 223, 0.75);
}

.code-panel-title {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.code-panel pre {
  margin: 0;
  padding: 16px;
  overflow: auto;
  font-size: 0.82rem;
  line-height: 1.65;
  background: #fffdf8;
}

.support-panel {
  margin-top: 18px;
  padding: 18px;
}

.support-grid {
  display: grid;
  gap: 16px;
}

.note-list {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.note-item {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(15, 118, 110, 0.06);
  border: 1px solid rgba(15, 118, 110, 0.14);
  color: var(--text-soft);
  font-size: 0.9rem;
}

.callout {
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.08), rgba(255, 252, 246, 0.95));
}

.step-number {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  font-weight: 800;
  margin-bottom: 14px;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 30px;
  padding: 24px 0 10px;
  color: var(--text-soft);
  font-size: 0.9rem;
}

.footer-links {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.service-header {
  padding: 34px;
  border-radius: 32px;
  border: 1px solid rgba(221, 207, 187, 0.92);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.service-header-top {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  color: var(--text-soft);
  font-size: 0.92rem;
}

.inline-code {
  padding: 2px 6px;
  border-radius: 8px;
  background: var(--surface-muted);
}

@media (max-width: 1180px) {
  .docs-layout {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .docs-toc {
    display: none;
  }
}

@media (max-width: 920px) {
  .hero,
  .reference-columns {
    grid-template-columns: 1fr;
  }

  .docs-layout {
    grid-template-columns: 1fr;
  }

  .docs-sidebar,
  .docs-toc {
    position: static;
  }

  .topbar {
    position: static;
    border-radius: 28px;
  }
}

@media (max-width: 640px) {
  .page-shell {
    width: min(100% - 20px, 1440px);
  }

  .hero,
  .doc-header,
  .doc-section,
  .service-header,
  .service-card,
  .content-panel,
  .reference-card {
    padding: 20px;
    border-radius: 22px;
  }

  .hero h1,
  .doc-title,
  .service-header h1 {
    font-size: 2.4rem;
  }

  .topbar {
    padding: 16px;
  }
}
`;

function renderNav(activePage: "home" | "docs" | "service") {
  return `
    <header class="topbar">
      <a class="brand" href="/">
        <span class="brand-mark">X402</span>
        <span class="brand-copy">
          <strong>xlm402 services</strong>
          <span>Catalogue and documentation portal</span>
        </span>
      </a>
      <nav class="topnav">
        <a href="/"${activePage === "home" ? ' class="active"' : ""}>Catalogue</a>
        <a href="/docs"${activePage === "docs" ? ' class="active"' : ""}>Documentation</a>
        <a href="/api/catalog">API JSON</a>
        <a href="/.well-known/x402">x402 Manifest</a>
        <a href="https://github.com/jamesbachini/xlm402" target="_blank" rel="noopener noreferrer">GitHub</a>
      </nav>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer class="footer">
      <div>xlm402 services on Stellar with machine-readable discovery and x402 payments.</div>
      <div class="footer-links">
        <a href="/docs">Documentation</a>
        <a href="/api/catalog">API JSON</a>
        <a href="/supported">Supported</a>
        <a href="/health">Health</a>
      </div>
    </footer>
  `;
}

function layout({
  title,
  description,
  body,
}: {
  title: string;
  description: string;
  body: string;
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Manrope:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,600;6..72,700&display=swap" rel="stylesheet" />
    <style>${sharedStyles}</style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function renderDiscoveryCards() {
  return `
    <div class="discovery-grid">
      <div class="content-panel">
        <div class="eyebrow">Discovery</div>
        <h3><code>/api/catalog</code></h3>
        <p>Platform summary with services, published routes, prices, and response metadata for automation and dashboard clients.</p>
      </div>
      <div class="content-panel">
        <div class="eyebrow">x402</div>
        <h3><code>/.well-known/x402</code></h3>
        <p>Canonical x402 manifest with route-level payment options, pay-to addresses, and facilitator metadata.</p>
      </div>
      <div class="content-panel">
        <div class="eyebrow">Facilitators</div>
        <h3><code>/supported</code></h3>
        <p>Pass-through facilitator capability check for both Stellar networks so clients can inspect enabled schemes.</p>
      </div>
      <div class="content-panel">
        <div class="eyebrow">Health</div>
        <h3><code>/health</code></h3>
        <p>Deployment health, service availability, network list, asset support, and OpenAI status.</p>
      </div>
    </div>
  `;
}

function renderServiceSummaryCard(service: ServiceDefinition, catalog: PlatformCatalog) {
  const endpoints = catalog.publishedEndpoints.filter((endpoint) => endpoint.serviceId === service.id);
  const networks = Array.from(new Set(endpoints.map((endpoint) => endpoint.network)));
  const prices = Array.from(new Set(endpoints.map((endpoint) => endpoint.priceUsd)));

  return `
    <a class="service-card" href="/services/${escapeHtml(service.id)}">
      <div class="service-card-head">
        <span class="service-icon" style="background:${serviceAccent(service.id)}">${escapeHtml(serviceIcon(service.id))}</span>
        <div>
          <h3>${escapeHtml(service.name)}</h3>
          <p>${escapeHtml(service.tagline)}</p>
        </div>
      </div>
      <div class="meta-row">
        ${networks.map((network) => `<span class="meta-pill">${escapeHtml(network)}</span>`).join("")}
        ${prices.map((price) => `<span class="meta-pill">$${escapeHtml(price)} USD</span>`).join("")}
        <span class="meta-pill">${endpoints.length} route${endpoints.length === 1 ? "" : "s"}</span>
      </div>
    </a>
  `;
}

function renderServiceReference(serviceId: string, catalog: PlatformCatalog) {
  const endpoints = getEndpointDocs(catalog).filter((endpoint) => endpoint.id.startsWith(serviceId));
  return endpoints.map((endpoint) => renderEndpointDoc(endpoint)).join("");
}

export function renderIndexPage(catalog: PlatformCatalog) {
  return layout({
    title: "xlm402 services | API catalogue on Stellar",
    description:
      "Pay-per-call APIs on Stellar with x402 discovery, route metadata, and a full documentation portal.",
    body: `
      <div class="page-shell">
        ${renderNav("home")}

        <section class="hero">
          <div>
            <div class="eyebrow">Documentation-first platform</div>
            <h1>Paid APIs on Stellar with a real docs portal.</h1>
            <p>
              Browse the live catalogue, inspect machine-readable discovery endpoints, and jump into setup guides,
              x402 payment flow details, MCP integration instructions, and JSON request/response reference docs.
            </p>
            <div class="hero-actions">
              <a class="button button-primary" href="/docs">Open documentation</a>
              <a class="button button-secondary" href="/api/catalog">Inspect API JSON</a>
            </div>
          </div>
          <div class="hero-side">
            <div class="summary-card">
              <strong>${catalog.publishedEndpoints.length}</strong>
              <span>Published paid routes across mainnet and testnet</span>
            </div>
            <div class="summary-card">
              <strong>${catalog.services.length}</strong>
              <span>Service families with shared x402 discovery metadata</span>
            </div>
            <div class="summary-card">
              <strong>USDC + XLM</strong>
              <span>Stellar settlement assets exposed in route manifests and 402 responses</span>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <div class="eyebrow">Catalogue</div>
            <h2>Live services</h2>
            <p>
              The catalogue stays focused on the paid products. The new documentation portal separates setup,
              integration guidance, and API reference into a proper docs experience.
            </p>
          </div>
          <div class="service-grid">
            ${catalog.services.map((service) => renderServiceSummaryCard(service, catalog)).join("")}
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <div class="eyebrow">Developer surfaces</div>
            <h2>Machine-readable discovery endpoints</h2>
            <p>
              Human docs and JSON discovery stay aligned so agents, dashboards, and SDKs can discover the same contract.
            </p>
          </div>
          ${renderDiscoveryCards()}
        </section>

        ${renderFooter()}
      </div>
    `,
  });
}

export function renderServicePage(service: ServiceDefinition, catalog: PlatformCatalog) {
  const serviceRoutes = catalog.publishedEndpoints.filter((endpoint) => endpoint.serviceId === service.id);
  const networks = Array.from(new Set(serviceRoutes.map((endpoint) => endpoint.network)));
  const prices = Array.from(new Set(serviceRoutes.map((endpoint) => endpoint.priceUsd)));

  return layout({
    title: `${service.name} | xlm402 services`,
    description: service.description,
    body: `
      <div class="page-shell">
        ${renderNav("service")}
        <a class="back-link" href="/">&#8592; Back to catalogue</a>

        <section class="service-header">
          <div class="service-header-top">
            <span class="service-icon" style="background:${serviceAccent(service.id)}">${escapeHtml(serviceIcon(service.id))}</span>
            <div class="eyebrow">${escapeHtml(service.audience)}</div>
          </div>
          <h1>${escapeHtml(service.name)}</h1>
          <p>${escapeHtml(service.description)}</p>
          <div class="meta-row">
            ${networks.map((network) => `<span class="meta-pill">${escapeHtml(network)}</span>`).join("")}
            ${prices.map((price) => `<span class="meta-pill">$${escapeHtml(price)} USD</span>`).join("")}
            ${service.highlights.map((highlight) => `<span class="meta-pill">${escapeHtml(highlight)}</span>`).join("")}
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <div class="eyebrow">Reference</div>
            <h2>${escapeHtml(service.name)} endpoints</h2>
            <p>
              Static reference extracted from the server code and validation layer. For the complete portal,
              including setup guides, discovery endpoints, MCP instructions, and shared response conventions,
              see <a href="/docs"><span class="inline-code">/docs</span></a>.
            </p>
          </div>
          <div class="reference-stack">
            ${renderServiceReference(service.id, catalog)}
          </div>
        </section>

        ${renderFooter()}
      </div>
    `,
  });
}

export function renderDocsPage(catalog: PlatformCatalog) {
  const endpointDocs = getEndpointDocs(catalog);
  const weatherDocs = endpointDocs.filter((endpoint) => endpoint.id.startsWith("weather-"));
  const newsDocs = endpointDocs.filter((endpoint) => endpoint.id.startsWith("news-"));
  const chatDocs = endpointDocs.filter((endpoint) => endpoint.id.startsWith("chat-"));
  const imageDocs = endpointDocs.filter((endpoint) => endpoint.id.startsWith("image-"));

  const unpaidResponseExample = json({
    error: "payment_required",
    message: "This endpoint requires x402 payment",
    price_usd: config.prices.weather,
    assets: [
      { asset: "USDC", price: config.prices.weather },
      { asset: "XLM", price: "dynamic" },
    ],
    network: "mainnet",
    pay_to: config.networks.mainnet.payToAddress,
    facilitator_url: config.networks.mainnet.facilitatorUrl,
    route: "/weather/current",
  });

  const apiCatalogExample = json({
    service: config.platformName,
    public_base_url: config.publicBaseUrl,
    payment_assets: config.xlmEnabled ? ["USDC", "XLM"] : ["USDC"],
    openai_enabled: config.openai.enabled,
    services: [
      {
        id: "weather",
        name: "Weather Intelligence",
      },
    ],
    endpoints: [
      {
        id: "weather-current",
        service: "weather",
        method: "GET",
        path: "/weather/current",
        network: "mainnet",
        price_usd: config.prices.weather,
        payment_assets: ["USDC", "XLM"],
        response_type: "application/json",
      },
    ],
  });

  const x402ManifestExample = json({
    version: 1,
    service: config.platformName,
    resources: [
      {
        id: "weather-current",
        service: "weather",
        method: "GET",
        path: "/weather/current",
        description: "Current weather conditions for a latitude and longitude.",
        payments: [
          {
            protocol: "x402",
            scheme: "exact",
            network: "stellar:pubnet",
            asset: "USDC",
            price_usd: config.prices.weather,
            pay_to: config.networks.mainnet.payToAddress,
            facilitator_url: config.networks.mainnet.facilitatorUrl,
          },
        ],
      },
    ],
  });

  return layout({
    title: "Documentation | xlm402 services",
    description:
      "Comprehensive setup and API reference documentation for xlm402 services on Stellar.",
    body: `
      <div class="page-shell">
        ${renderNav("docs")}

        <div class="docs-layout">
          <aside class="docs-sidebar">
            <div class="sidebar-card">
              <div class="sidebar-title">Guide</div>
              <div class="sidebar-links">
                <a href="#overview">Overview</a>
                <a href="#quickstart">Quickstart</a>
                <a href="#payment-flow">x402 Payment Flow</a>
                <a href="#mcp-setup">MCP Server Setup</a>
                <a href="#discovery">Discovery Endpoints</a>
                <a href="#conventions">API Conventions</a>
                <a href="#errors">Errors</a>
              </div>
            </div>
            <div class="sidebar-card">
              <div class="sidebar-title">API Reference</div>
              <div class="sidebar-group">
                <div class="sidebar-group-label">Weather</div>
                <div class="sidebar-links">
                  <a href="#weather">Overview</a>
                  <a href="#weather-current">Current</a>
                  <a href="#weather-forecast">Forecast</a>
                  <a href="#weather-archive">Archive</a>
                  <a href="#weather-history-summary">History summary</a>
                </div>
              </div>
              <div class="sidebar-group">
                <div class="sidebar-group-label">News</div>
                <div class="sidebar-links">
                  <a href="#news">Overview</a>
                  <a href="#news-category">News by category</a>
                </div>
              </div>
              <div class="sidebar-group">
                <div class="sidebar-group-label">AI</div>
                <div class="sidebar-links">
                  <a href="#chat">Chat respond</a>
                  <a href="#chat-respond">Chat endpoint</a>
                  <a href="#image">Image generate</a>
                  <a href="#image-generate">Image endpoint</a>
                </div>
              </div>
            </div>
          </aside>

          <main class="docs-content">
            <section class="doc-header" id="overview">
              <div class="eyebrow">Documentation portal</div>
              <h1 class="doc-title">Setup, pay, and integrate xlm402 services.</h1>
              <p class="doc-lead">
                This portal separates human documentation from the live catalogue. It covers local setup,
                machine-readable discovery, x402 payment behavior, MCP integration, and the exact JSON contracts
                exposed by the server code.
              </p>
              <div class="meta-row" style="margin-top:18px;">
                <span class="meta-pill">${catalog.publishedEndpoints.length} published routes</span>
                <span class="meta-pill">mainnet + testnet</span>
                <span class="meta-pill">x402 discovery manifest</span>
                <span class="meta-pill">MCP compatible</span>
              </div>
            </section>

            <section class="doc-section" id="quickstart">
              <h2>Quickstart</h2>
              <p>
                The platform is configured from <code>config/app.json</code> plus secrets in <code>.env</code>.
                Local development publishes the human docs at <code>/docs</code> and the live discovery JSON at
                <code>/api/catalog</code> and <code>/.well-known/x402</code>.
              </p>
              <div class="reference-columns">
                <div>
                  ${renderCodeBlock(
                    "Local run",
                    `cp .env.example .env
npm install
npm run dev`,
                  )}
                </div>
                <div>
                  ${renderCodeBlock(
                    "First discovery calls",
                    `curl ${config.publicBaseUrl}/api/catalog
curl ${config.publicBaseUrl}/.well-known/x402
curl "${config.publicBaseUrl}/weather/current?latitude=51.5072&longitude=-0.1276&timezone=auto"`,
                  )}
                </div>
              </div>
              <div class="callout" style="margin-top:18px;">
                <h3>Runtime layout</h3>
                <p>
                  Mainnet routes live at the root path. Testnet mirrors the weather and news families under
                  <code>/testnet</code>. AI routes are mainnet-only and publish only when <code>OPENAI_API_KEY</code>
                  is configured.
                </p>
              </div>
            </section>

            <section class="doc-section" id="payment-flow">
              <h2>x402 payment flow</h2>
              <p>
                Every paid route behaves like a normal HTTP endpoint until the server requires payment. The first
                unpaid request returns HTTP 402 with JSON guidance in the body and a base64-encoded
                <code>payment-required</code> header for x402 clients.
              </p>
              <div class="step-grid">
                <div class="step-card">
                  <div class="step-number">1</div>
                  <h3>Call the route</h3>
                  <p>Clients send a normal GET or POST request to a paid path.</p>
                </div>
                <div class="step-card">
                  <div class="step-number">2</div>
                  <h3>Receive HTTP 402</h3>
                  <p>The response includes the route, price, network, facilitator URL, pay-to address, and acceptable assets.</p>
                </div>
                <div class="step-card">
                  <div class="step-number">3</div>
                  <h3>Create the payment</h3>
                  <p>An x402 client or wallet signs the exact Stellar payment using the returned requirement details.</p>
                </div>
                <div class="step-card">
                  <div class="step-number">4</div>
                  <h3>Retry with proof</h3>
                  <p>The paid retry succeeds and returns the standard JSON envelope with the purchased data under <code>data</code>.</p>
                </div>
              </div>
              <div class="reference-columns" style="margin-top:18px;">
                <div>${renderCodeBlock("402 response JSON", unpaidResponseExample)}</div>
                <div>${renderCodeBlock("Success envelope JSON", json(sharedEnvelopeExample(config.prices.weather, "mainnet", { example: "payload" })))}</div>
              </div>
            </section>

            <section class="doc-section" id="mcp-setup">
              <h2>MCP server setup</h2>
              <p>
                For agent workflows, pair this resource server with the
                <a href="https://github.com/jamesbachini/x402-mcp-stellar" target="_blank" rel="noopener noreferrer">
                  x402 Stellar MCP server
                </a>.
                The steps below are based on that repository’s README and adapted into a single setup flow for Codex,
                Claude Code, or any MCP-compatible client.
              </p>
              <div class="reference-columns">
                <div>
                  ${renderCodeBlock(
                    "Prerequisites",
                    `Node.js 20+
Funded Stellar wallet
This xlm402 resource server running locally
Facilitator reachable for the target network`,
                  )}
                  ${renderCodeBlock(
                    "Testnet .env",
                    `STELLAR_SECRET_KEY=S...
STELLAR_NETWORK=stellar:testnet`,
                  )}
                </div>
                <div>
                  ${renderCodeBlock(
                    "Mainnet .env",
                    `STELLAR_NETWORK=stellar:pubnet
STELLAR_RPC_URL=https://rpc.lightsail.network/
X402_FACILITATOR_URL=https://channels.openzeppelin.com/x402
X402_FACILITATOR_API_KEY=<your-openzeppelin-api-key>`,
                  )}
                  ${renderCodeBlock(
                    "Run + register in Codex",
                    `npm install
cp .env.example .env
npm run dev

codex mcp add x402-stellar -- npm --silent --prefix /absolute/path/to/x402-mcp-stellar run dev`,
                  )}
                </div>
              </div>
              <div class="callout" style="margin-top:18px;">
                <h3>Operational notes</h3>
                <p>
                  The MCP server runs over stdio, loads its own project-local <code>.env</code>, exposes wallet
                  info plus paid fetch tools, and can automatically attach OpenZeppelin facilitator authorization
                  when <code>X402_FACILITATOR_API_KEY</code> is set.
                </p>
              </div>
            </section>

            <section class="doc-section" id="discovery">
              <h2>Discovery endpoints</h2>
              <p>
                Human-readable docs and machine-readable discovery are both first-class. Use these endpoints to list
                routes, prices, supported schemes, and health status programmatically.
              </p>
              ${renderDiscoveryCards()}
              <div class="reference-columns" style="margin-top:18px;">
                <div>${renderCodeBlock("/api/catalog", apiCatalogExample)}</div>
                <div>${renderCodeBlock("/.well-known/x402", x402ManifestExample)}</div>
              </div>
            </section>

            <section class="doc-section" id="conventions">
              <h2>API conventions</h2>
              <p>
                All successful paid route responses are JSON with a common envelope. GET routes use query parameters,
                POST routes require a JSON object body, and validation errors use the same compact error schema.
              </p>
              <div class="reference-columns">
                <div>
                  ${renderFieldTable("Shared success envelope", [
                    { name: "network", type: "string", required: "Yes", description: "Network label for the published route." },
                    { name: "paid", type: "boolean", required: "Yes", description: "True when payment succeeded." },
                    { name: "price_usd", type: "string", required: "Yes", description: "Decimal USD price string." },
                    { name: "assets", type: "string[]", required: "Yes", description: "Advertised settlement assets." },
                    { name: "data", type: "object | array | scalar", required: "Yes", description: "Endpoint-specific payload." },
                  ])}
                </div>
                <div>
                  ${renderCodeBlock(
                    "Shared success envelope",
                    json(sharedEnvelopeExample(config.prices.weather, "mainnet", { endpoint_specific_payload: true })),
                  )}
                </div>
              </div>
              <div class="summary-grid" style="margin-top:18px;">
                <div class="content-panel">
                  <div class="eyebrow">Base URL</div>
                  <h3>${escapeHtml(config.publicBaseUrl)}</h3>
                  <p>Use the public base URL from config or overrides. Mainnet routes live at the root path.</p>
                </div>
                <div class="content-panel">
                  <div class="eyebrow">Testnet prefix</div>
                  <h3><code>/testnet</code></h3>
                  <p>Testnet mirrors the weather and news families under a dedicated prefix.</p>
                </div>
                <div class="content-panel">
                  <div class="eyebrow">Content type</div>
                  <h3><code>application/json</code></h3>
                  <p>Every documented public and paid endpoint returns JSON.</p>
                </div>
                <div class="content-panel">
                  <div class="eyebrow">Pricing</div>
                  <h3>Decimal strings</h3>
                  <p>Route prices are configured as USD decimal strings and surfaced consistently in docs and discovery endpoints.</p>
                </div>
              </div>
            </section>

            <section class="doc-section" id="weather">
              <h2>Weather API</h2>
              <p>
                Weather routes are available on both mainnet and testnet. Current, forecast, and archive responses
                wrap Open-Meteo JSON directly. The history summary endpoint is a compact server-side aggregation.
              </p>
              <div class="reference-stack">
                ${weatherDocs.map((endpoint) => renderEndpointDoc(endpoint)).join("")}
              </div>
            </section>

            <section class="doc-section" id="news">
              <h2>News API</h2>
              <p>
                News aggregation is available on both networks with the same request contract. The server normalizes
                RSS and Atom content into a stable response shape and reports per-feed errors without failing the
                whole request when at least one source succeeds.
              </p>
              <div class="reference-stack">
                ${newsDocs.map((endpoint) => renderEndpointDoc(endpoint)).join("")}
              </div>
            </section>

            <section class="doc-section" id="chat">
              <h2>Chat API</h2>
              <p>
                The chat route is mainnet-only and uses the configured model
                <code> ${escapeHtml(config.openai.chatModel)}</code>. Publication depends on
                <code> OPENAI_API_KEY</code>, but the request and response contracts remain stable.
              </p>
              <div class="reference-stack">
                ${chatDocs.map((endpoint) => renderEndpointDoc(endpoint)).join("")}
              </div>
            </section>

            <section class="doc-section" id="image">
              <h2>Image API</h2>
              <p>
                The image generation route is mainnet-only and uses the configured model
                <code> ${escapeHtml(config.openai.imageModel)}</code>. Responses return a single base64-encoded image
                payload so downstream clients can save or forward the generated asset without an additional file fetch.
              </p>
              <div class="reference-stack">
                ${imageDocs.map((endpoint) => renderEndpointDoc(endpoint)).join("")}
              </div>
            </section>

            <section class="doc-section" id="errors">
              <h2>Errors</h2>
              <p>
                Validation, not-found, upstream, and internal failures all serialize to a compact JSON format.
                Standard route validation uses <code>invalid_request</code>. Missing routes return
                <code>not_found</code>. Unexpected upstream failures map to <code>upstream_error</code>.
              </p>
              <div class="reference-columns">
                <div>
                  ${renderFieldTable("Error response", [
                    { name: "error", type: "string", required: "Yes", description: "Machine-readable error code." },
                    { name: "message", type: "string", required: "Yes", description: "Human-readable explanation." },
                  ])}
                </div>
                <div>
                  ${renderCodeBlock(
                    "Error JSON",
                    json({
                      error: "invalid_request",
                      message: "forecast_days must be an integer between 1 and 16",
                    }),
                  )}
                </div>
              </div>
            </section>
          </main>

          <aside class="docs-toc">
            <div class="toc-card">
              <div class="toc-title">On this page</div>
              <div class="toc-links">
                <a href="#overview">Overview</a>
                <a href="#quickstart">Quickstart</a>
                <a href="#payment-flow">x402 Payment Flow</a>
                <a href="#mcp-setup">MCP Setup</a>
                <a href="#discovery">Discovery</a>
                <a href="#conventions">Conventions</a>
                <a href="#weather">Weather</a>
                <a href="#news">News</a>
                <a href="#chat">Chat</a>
                <a href="#image">Image</a>
                <a href="#errors">Errors</a>
              </div>
            </div>
          </aside>
        </div>

        ${renderFooter()}
      </div>
    `,
  });
}
