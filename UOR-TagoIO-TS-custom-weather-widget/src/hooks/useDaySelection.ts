import { useState, useEffect } from 'react'
import type { DayForecast } from './useWeatherData'

export type MetricType = 'temperature' | 'precipitation' | 'wind' | 'humidity' | 'soil_moisture' | 'evapotranspiration'

export const useDaySelection = (dayForecasts: DayForecast[]) => {
  const [selectedDay, setSelectedDay] = useState<DayForecast | null>(null)
  const [selectedHourIndex, setSelectedHourIndex] = useState<number | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('temperature')

  // Auto-select first day when forecasts become available
  useEffect(() => {
    if (dayForecasts.length > 0 && !selectedDay) {
      setSelectedDay(dayForecasts[0])
    }
  }, [dayForecasts, selectedDay])

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedIndex = data.activePayload[0].payload.index
      setSelectedHourIndex(clickedIndex === selectedHourIndex ? null : clickedIndex)
    }
  }

  const handleHourClick = (index: number) => {
    setSelectedHourIndex(index === selectedHourIndex ? null : index)
  }

  const handleDaySelect = (day: DayForecast) => {
    setSelectedDay(day)
    // Reset hour selection when changing days
    setSelectedHourIndex(null)
  }

  const handleMetricChange = (metric: MetricType) => {
    setSelectedMetric(metric)
  }

  return {
    selectedDay,
    selectedHourIndex,
    selectedMetric,
    setSelectedDay: handleDaySelect,
    setSelectedMetric: handleMetricChange,
    handleChartClick,
    handleHourClick
  }
}
