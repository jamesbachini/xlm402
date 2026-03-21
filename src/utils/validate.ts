import { HttpError } from "./errors.js";
import type { ChatRequest, ImageRequest } from "../services/openai.js";
import { isNewsCategory, type NewsCategory } from "../services/newsFeeds.js";
import type {
  CollectRequest,
  ExtractFormat,
  ExtractPageRequest,
} from "../services/scrape.js";

export const FORECAST_HOURLY_FIELDS = new Set([
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "rain",
  "showers",
  "snowfall",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "visibility",
  "weather_code",
]);

export const FORECAST_DAILY_FIELDS = new Set([
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "sunrise",
  "sunset",
  "daylight_duration",
  "sunshine_duration",
  "uv_index_max",
  "precipitation_sum",
  "rain_sum",
  "showers_sum",
  "snowfall_sum",
  "precipitation_hours",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
]);

export const ARCHIVE_HOURLY_FIELDS = new Set([
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "rain",
  "showers",
  "snowfall",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "weather_code",
]);

export const ARCHIVE_DAILY_FIELDS = new Set([
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "precipitation_sum",
  "rain_sum",
  "showers_sum",
  "snowfall_sum",
  "precipitation_hours",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
]);

const CHAT_REASONING_EFFORTS = new Set<ChatRequest["reasoningEffort"]>([
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
]);
const CHAT_REASONING_EFFORT_ALIASES = new Map<string, ChatRequest["reasoningEffort"]>([
  ["minimal", "low"],
]);
const IMAGE_SIZES = new Set<ImageRequest["size"]>([
  "auto",
  "1024x1024",
  "1536x1024",
  "1024x1536",
]);
const IMAGE_QUALITIES = new Set<ImageRequest["quality"]>([
  "auto",
  "low",
  "medium",
  "high",
]);
const IMAGE_BACKGROUNDS = new Set<ImageRequest["background"]>([
  "auto",
  "opaque",
  "transparent",
]);
const IMAGE_OUTPUT_FORMATS = new Set<ImageRequest["outputFormat"]>([
  "jpeg",
  "png",
  "webp",
]);
const IMAGE_MODERATION_LEVELS = new Set<ImageRequest["moderation"]>(["auto", "low"]);
const EXTRACT_FORMATS = new Set<ExtractFormat>(["text", "markdown"]);
const COLLECTION_SCOPES = new Set<CollectRequest["scope"]>(["same_origin"]);
const COLLECTION_DEDUPE_MODES = new Set<CollectRequest["dedupe"]>([
  "canonical_url",
  "final_url",
]);

type Coordinates = {
  latitude: number;
  longitude: number;
};

function parseNumber(name: string, raw: string | undefined): number {
  if (!raw) {
    throw new HttpError(400, "invalid_request", `${name} is required`);
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new HttpError(400, "invalid_request", `${name} must be a valid number`);
  }

  return value;
}

export function parseCoordinates(query: Record<string, unknown>): Coordinates {
  const latitude = parseNumber("latitude", typeof query.latitude === "string" ? query.latitude : undefined);
  const longitude = parseNumber(
    "longitude",
    typeof query.longitude === "string" ? query.longitude : undefined,
  );

  if (latitude < -90 || latitude > 90) {
    throw new HttpError(400, "invalid_request", "latitude must be between -90 and 90");
  }

  if (longitude < -180 || longitude > 180) {
    throw new HttpError(400, "invalid_request", "longitude must be between -180 and 180");
  }

  return { latitude, longitude };
}

export function parseTimezone(query: Record<string, unknown>): string {
  const timezone = typeof query.timezone === "string" && query.timezone.trim() ? query.timezone.trim() : "auto";
  return timezone;
}

export function parseForecastDays(query: Record<string, unknown>): number | undefined {
  const raw = typeof query.forecast_days === "string" ? query.forecast_days : undefined;
  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 16) {
    throw new HttpError(400, "invalid_request", "forecast_days must be an integer between 1 and 16");
  }

  return value;
}

function parseIsoDate(name: string, raw: string | undefined): string {
  if (!raw) {
    throw new HttpError(400, "invalid_request", `${name} is required`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new HttpError(400, "invalid_request", `${name} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "invalid_request", `${name} must be a valid date`);
  }

  return raw;
}

export function parseDateRange(query: Record<string, unknown>): { startDate: string; endDate: string } {
  const startDate = parseIsoDate(
    "start_date",
    typeof query.start_date === "string" ? query.start_date : undefined,
  );
  const endDate = parseIsoDate("end_date", typeof query.end_date === "string" ? query.end_date : undefined);

  if (startDate > endDate) {
    throw new HttpError(400, "invalid_request", "start_date must be before or equal to end_date");
  }

  const diffDays = Math.floor(
    (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000,
  );

  if (diffDays > 366) {
    throw new HttpError(400, "invalid_request", "date range must not exceed 366 days");
  }

  return { startDate, endDate };
}

function parseFieldList(
  raw: string | undefined,
  fieldType: "hourly" | "daily",
  allowedFields: Set<string>,
): string[] | undefined {
  if (!raw) {
    return undefined;
  }

  const values = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new HttpError(400, "invalid_request", `${fieldType} must contain at least one field`);
  }

  const invalid = values.filter((value) => !allowedFields.has(value));
  if (invalid.length > 0) {
    throw new HttpError(
      400,
      "invalid_request",
      `${fieldType} contains unsupported fields: ${invalid.join(", ")}`,
    );
  }

  return values;
}

export function parseOptionalFields(
  query: Record<string, unknown>,
  fieldType: "hourly" | "daily",
  allowedFields: Set<string>,
): string[] | undefined {
  return parseFieldList(typeof query[fieldType] === "string" ? query[fieldType] : undefined, fieldType, allowedFields);
}

export function parsePositiveInteger(
  value: unknown,
  name: string,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_request", `${name} must be a string integer`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new HttpError(
      400,
      "invalid_request",
      `${name} must be an integer between ${min} and ${max}`,
    );
  }

  return parsed;
}

export function parseNewsCategory(value: string | undefined): NewsCategory {
  if (!value || !isNewsCategory(value)) {
    throw new HttpError(
      400,
      "invalid_request",
      "category must be one of: tech, ai, global, economics",
    );
  }

  return value;
}

function ensureObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "invalid_request", "Request body must be a JSON object");
  }

  return value as Record<string, unknown>;
}

function parseOptionalString(value: unknown, name: string, maxLength: number): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_request", `${name} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, "invalid_request", `${name} must not be empty`);
  }

  if (trimmed.length > maxLength) {
    throw new HttpError(400, "invalid_request", `${name} must be at most ${maxLength} characters`);
  }

  return trimmed;
}

function parseBoundedInteger(
  value: unknown,
  name: string,
  min: number,
  max: number,
  fallback: number,
) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new HttpError(400, "invalid_request", `${name} must be an integer`);
  }

  if (value < min || value > max) {
    throw new HttpError(
      400,
      "invalid_request",
      `${name} must be between ${min} and ${max}`,
    );
  }

  return value;
}

function parseEnumValue<T extends string>(
  value: unknown,
  name: string,
  allowed: Set<T>,
  fallback: T,
): T {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_request", `${name} must be a string`);
  }

  const trimmed = value.trim() as T;
  if (!allowed.has(trimmed)) {
    throw new HttpError(
      400,
      "invalid_request",
      `${name} must be one of: ${Array.from(allowed).join(", ")}`,
    );
  }

  return trimmed;
}

function parseChatReasoningEffort(value: unknown): ChatRequest["reasoningEffort"] {
  if (value === undefined) {
    return "medium";
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_request", "reasoning_effort must be a string");
  }

  const trimmed = value.trim();
  const normalized = CHAT_REASONING_EFFORT_ALIASES.get(trimmed) ?? trimmed;

  if (!CHAT_REASONING_EFFORTS.has(normalized as ChatRequest["reasoningEffort"])) {
    throw new HttpError(
      400,
      "invalid_request",
      `reasoning_effort must be one of: ${Array.from(CHAT_REASONING_EFFORTS).join(", ")}`,
    );
  }

  return normalized as ChatRequest["reasoningEffort"];
}

function parseMetadata(value: unknown): Record<string, string> {
  if (value === undefined) {
    return {};
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "invalid_request", "metadata must be an object");
  }

  const entries = Object.entries(value);
  if (entries.length > 16) {
    throw new HttpError(400, "invalid_request", "metadata can contain at most 16 keys");
  }

  return Object.fromEntries(
    entries.map(([key, rawValue]) => {
      if (typeof rawValue !== "string") {
        throw new HttpError(400, "invalid_request", `metadata.${key} must be a string`);
      }

      const normalizedKey = key.trim();
      const normalizedValue = rawValue.trim();

      if (!normalizedKey || normalizedKey.length > 64) {
        throw new HttpError(400, "invalid_request", `metadata key ${key} is invalid`);
      }

      if (!normalizedValue || normalizedValue.length > 512) {
        throw new HttpError(400, "invalid_request", `metadata.${key} must be 1..512 characters`);
      }

      return [normalizedKey, normalizedValue];
    }),
  );
}

function parseBooleanFlag(value: unknown, name: string, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "boolean") {
    throw new HttpError(400, "invalid_request", `${name} must be a boolean`);
  }

  return value;
}

function parseStringList(value: unknown, name: string, maxItems: number): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new HttpError(400, "invalid_request", `${name} must be an array of strings`);
  }

  if (value.length > maxItems) {
    throw new HttpError(400, "invalid_request", `${name} can contain at most ${maxItems} items`);
  }

  return value.map((entry, index) => {
    if (typeof entry !== "string") {
      throw new HttpError(
        400,
        "invalid_request",
        `${name}[${index}] must be a string`,
      );
    }

    const trimmed = entry.trim();
    if (!trimmed) {
      throw new HttpError(
        400,
        "invalid_request",
        `${name}[${index}] must not be empty`,
      );
    }

    if (trimmed.length > 256) {
      throw new HttpError(
        400,
        "invalid_request",
        `${name}[${index}] must be at most 256 characters`,
      );
    }

    return trimmed;
  });
}

export function parseChatRequest(body: unknown): ChatRequest {
  const input = ensureObject(body);
  const prompt = parseOptionalString(input.prompt, "prompt", 32000);

  if (!prompt) {
    throw new HttpError(400, "invalid_request", "prompt is required");
  }

  return {
    prompt,
    system: parseOptionalString(input.system, "system", 12000),
    maxOutputTokens: parseBoundedInteger(
      input.max_output_tokens,
      "max_output_tokens",
      64,
      4096,
      800,
    ),
    reasoningEffort: parseChatReasoningEffort(input.reasoning_effort),
    metadata: parseMetadata(input.metadata),
  };
}

export function parseImageRequest(body: unknown): ImageRequest {
  const input = ensureObject(body);
  const prompt = parseOptionalString(input.prompt, "prompt", 32000);

  if (!prompt) {
    throw new HttpError(400, "invalid_request", "prompt is required");
  }

  const outputFormat = parseEnumValue(
    input.output_format,
    "output_format",
    IMAGE_OUTPUT_FORMATS,
    "jpeg",
  );
  const background = parseEnumValue(
    input.background,
    "background",
    IMAGE_BACKGROUNDS,
    "auto",
  );

  if (background === "transparent" && outputFormat === "jpeg") {
    throw new HttpError(
      400,
      "invalid_request",
      "transparent backgrounds require png or webp output_format",
    );
  }

  return {
    prompt,
    size: parseEnumValue(input.size, "size", IMAGE_SIZES, "auto"),
    quality: parseEnumValue(input.quality, "quality", IMAGE_QUALITIES, "high"),
    background,
    outputFormat,
    moderation: parseEnumValue(
      input.moderation,
      "moderation",
      IMAGE_MODERATION_LEVELS,
      "auto",
    ),
  };
}

export function parseScrapeRequest(body: unknown): ExtractPageRequest {
  const input = ensureObject(body);
  const url = parseOptionalString(input.url, "url", 2048);

  if (!url) {
    throw new HttpError(400, "invalid_request", "url is required");
  }

  return {
    url,
    format: parseEnumValue(input.format, "format", EXTRACT_FORMATS, "markdown"),
    includeLinks: parseBooleanFlag(input.include_links, "include_links", true),
    includeMetadata: parseBooleanFlag(input.include_metadata, "include_metadata", true),
    includeJsonLd: parseBooleanFlag(input.include_json_ld, "include_json_ld", true),
    maxChars: parseBoundedInteger(input.max_chars, "max_chars", 1000, 100000, 50000),
  };
}

export function parseCollectRequest(body: unknown): CollectRequest {
  const input = ensureObject(body);
  const seedUrl = parseOptionalString(input.seed_url, "seed_url", 2048);

  if (!seedUrl) {
    throw new HttpError(400, "invalid_request", "seed_url is required");
  }

  return {
    seedUrl,
    scope: parseEnumValue(input.scope, "scope", COLLECTION_SCOPES, "same_origin"),
    maxPages: parseBoundedInteger(input.max_pages, "max_pages", 1, 10, 10),
    maxDepth: parseBoundedInteger(input.max_depth, "max_depth", 0, 2, 2),
    includePatterns: parseStringList(input.include_patterns, "include_patterns", 20),
    excludePatterns: parseStringList(input.exclude_patterns, "exclude_patterns", 20),
    format: parseEnumValue(input.format, "format", EXTRACT_FORMATS, "markdown"),
    dedupe: parseEnumValue(
      input.dedupe,
      "dedupe",
      COLLECTION_DEDUPE_MODES,
      "canonical_url",
    ),
    maxCharsPerPage: parseBoundedInteger(
      input.max_chars_per_page,
      "max_chars_per_page",
      1000,
      50000,
      30000,
    ),
  };
}
