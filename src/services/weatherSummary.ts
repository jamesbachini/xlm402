type ArchiveSummaryInput = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
};

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function sum(values: number[]): number {
  return Number(values.reduce((total, value) => total + value, 0).toFixed(2));
}

export function buildHistorySummary(daily: ArchiveSummaryInput) {
  const hottestIndex = daily.temperature_2m_max.reduce(
    (bestIndex, value, index, values) => (value > values[bestIndex] ? index : bestIndex),
    0,
  );
  const coldestIndex = daily.temperature_2m_min.reduce(
    (bestIndex, value, index, values) => (value < values[bestIndex] ? index : bestIndex),
    0,
  );

  return {
    average_max_temp_c: average(daily.temperature_2m_max),
    average_min_temp_c: average(daily.temperature_2m_min),
    total_precipitation_mm: sum(daily.precipitation_sum),
    hottest_day: {
      date: daily.time[hottestIndex],
      temperature_2m_max: daily.temperature_2m_max[hottestIndex],
    },
    coldest_day: {
      date: daily.time[coldestIndex],
      temperature_2m_min: daily.temperature_2m_min[coldestIndex],
    },
  };
}

