import { Router } from "express";
import { getRoutePaymentAssets, type NetworkLabel } from "../config.js";
import { getArchive, getCurrentWeather, getForecast } from "../services/openMeteo.js";
import { buildHistorySummary } from "../services/weatherSummary.js";
import {
  ARCHIVE_DAILY_FIELDS,
  ARCHIVE_HOURLY_FIELDS,
  FORECAST_DAILY_FIELDS,
  FORECAST_HOURLY_FIELDS,
  parseCoordinates,
  parseDateRange,
  parseForecastDays,
  parseOptionalFields,
  parseTimezone,
} from "../utils/validate.js";
import { HttpError } from "../utils/errors.js";

type ArchiveDailyResponse = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
};

function wrapPaidResponse(data: unknown, network: NetworkLabel, priceUsd: string) {
  return {
    network,
    paid: true,
    price_usd: priceUsd,
    assets: getRoutePaymentAssets(network),
    data,
  };
}

export function createWeatherRouter({
  network,
  priceUsd,
}: {
  network: NetworkLabel;
  priceUsd: string;
}) {
  const router = Router();

  router.get("/current", async (req, res) => {
    const { latitude, longitude } = parseCoordinates(req.query);
    const timezone = parseTimezone(req.query);

    const data = await getCurrentWeather({
      latitude,
      longitude,
      timezone,
    });

    res.json(wrapPaidResponse(data, network, priceUsd));
  });

  router.get("/forecast", async (req, res) => {
    const { latitude, longitude } = parseCoordinates(req.query);
    const timezone = parseTimezone(req.query);
    const forecastDays = parseForecastDays(req.query);
    const hourly =
      parseOptionalFields(req.query, "hourly", FORECAST_HOURLY_FIELDS);
    const daily =
      parseOptionalFields(req.query, "daily", FORECAST_DAILY_FIELDS) ?? [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
      ];

    const data = await getForecast({
      latitude,
      longitude,
      timezone,
      hourly,
      daily,
      forecastDays,
    });

    res.json(wrapPaidResponse(data, network, priceUsd));
  });

  router.get("/archive", async (req, res) => {
    const { latitude, longitude } = parseCoordinates(req.query);
    const timezone = parseTimezone(req.query);
    const { startDate, endDate } = parseDateRange(req.query);
    const hourly = parseOptionalFields(req.query, "hourly", ARCHIVE_HOURLY_FIELDS);
    const daily =
      parseOptionalFields(req.query, "daily", ARCHIVE_DAILY_FIELDS) ?? [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
      ];

    const data = await getArchive({
      latitude,
      longitude,
      startDate,
      endDate,
      timezone,
      hourly,
      daily,
    });

    res.json(wrapPaidResponse(data, network, priceUsd));
  });

  router.get("/history-summary", async (req, res) => {
    const { latitude, longitude } = parseCoordinates(req.query);
    const timezone = parseTimezone(req.query);
    const { startDate, endDate } = parseDateRange(req.query);

    const archive = (await getArchive({
      latitude,
      longitude,
      startDate,
      endDate,
      timezone,
      daily: ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
    })) as { daily?: ArchiveDailyResponse };

    if (
      !archive.daily?.time ||
      !archive.daily.temperature_2m_max ||
      !archive.daily.temperature_2m_min ||
      !archive.daily.precipitation_sum
    ) {
      throw new HttpError(502, "upstream_error", "Open-Meteo archive response is missing daily summary fields");
    }

    res.json(
      wrapPaidResponse(
        {
          latitude,
          longitude,
          start_date: startDate,
          end_date: endDate,
          timezone,
          summary: buildHistorySummary(archive.daily),
        },
        network,
        priceUsd,
      ),
    );
  });

  return router;
}
