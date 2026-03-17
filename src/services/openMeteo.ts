import { config } from "../config.js";
import { MemoryCache } from "../utils/cache.js";
import { HttpError } from "../utils/errors.js";

type QueryValue = string | number | undefined;

const cache = new MemoryCache<unknown>(config.cacheTtlSeconds * 1000);

function buildUrl(baseUrl: string, path: string, query: Record<string, QueryValue>): string {
  const url = new URL(path, `${baseUrl}/`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function fetchJson(url: string) {
  const cached = cache.get(url);
  if (cached) {
    return cached;
  }

  let response: Response;

  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(config.requestTimeoutMs),
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    throw new HttpError(502, "upstream_error", `Open-Meteo request failed: ${String(error)}`);
  }

  if (!response.ok) {
    throw new HttpError(
      502,
      "upstream_error",
      `Open-Meteo request failed with status ${response.status}`,
    );
  }

  const json = (await response.json()) as unknown;
  cache.set(url, json);
  return json;
}

export async function getForecast(params: {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly?: string[];
  daily?: string[];
  forecastDays?: number;
}) {
  const url = buildUrl(config.openMeteoBaseUrl, "/v1/forecast", {
    latitude: params.latitude,
    longitude: params.longitude,
    timezone: params.timezone,
    hourly: params.hourly?.join(","),
    daily: params.daily?.join(","),
    forecast_days: params.forecastDays,
  });

  return fetchJson(url);
}

export async function getCurrentWeather(params: {
  latitude: number;
  longitude: number;
  timezone: string;
}) {
  const url = buildUrl(config.openMeteoBaseUrl, "/v1/forecast", {
    latitude: params.latitude,
    longitude: params.longitude,
    timezone: params.timezone,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
      "is_day",
    ].join(","),
  });

  return fetchJson(url);
}

export async function getArchive(params: {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  timezone: string;
  hourly?: string[];
  daily?: string[];
}) {
  const url = buildUrl(config.openMeteoArchiveBaseUrl, "/v1/archive", {
    latitude: params.latitude,
    longitude: params.longitude,
    start_date: params.startDate,
    end_date: params.endDate,
    timezone: params.timezone,
    hourly: params.hourly?.join(","),
    daily: params.daily?.join(","),
  });

  return fetchJson(url);
}
