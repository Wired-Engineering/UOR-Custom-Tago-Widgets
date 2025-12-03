import { useState, useEffect } from 'react'

export interface EntityWeatherData {
  id: string
  forecast_time: string
  forecast_date?: string | null
  hours_from_now: number
  temperature_two_m: number
  temperature_eighty_m: number
  precipitation: number
  rain: number
  showers: number
  precipitation_probability: number
  evapotranspiration: number
  wind_speed_ten_m: number
  wind_direction_ten_m: number
  soil_moisture_zero_to_one_cm: number
  soil_moisture_one_to_three_cm: number
  soil_moisture_three_to_nine_cm: number
  soil_moisture_nine_to_twentyseven_cm: number
  created_at: string
  updated_at: string
}

export interface DayForecast {
  date: string
  dayName: string
  minTemp: number
  maxTemp: number
  avgTemp: number
  totalPrecipitation: number
  avgPrecipitationProb: number
  avgWindSpeed: number
  dominantWindDirection: number
  hourlyData: EntityWeatherData[]
}

export interface WeekData {
  day: string
  min: number
  max: number
  precip: number
  wind: number
  humidity: number
  soil_moisture: number
  evapotranspiration: number
}

export const useWeatherData = (weatherData: EntityWeatherData[]) => {
  const [dayForecasts, setDayForecasts] = useState<DayForecast[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    if (weatherData.length > 0) {
      processDataIntoDays(weatherData)
      setLastUpdate(new Date())
    }
  }, [weatherData])

  const processDataIntoDays = (data: EntityWeatherData[]) => {
    const dayGroups: { [key: string]: EntityWeatherData[] } = {}

    data.forEach(item => {
      // Use local date from forecast_time to group by local days
      const localDate = new Date(item.forecast_time)
      const dateKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`

      if (!dayGroups[dateKey]) {
        dayGroups[dateKey] = []
      }
      dayGroups[dateKey].push(item)
    })

    const processedDays: DayForecast[] = Object.entries(dayGroups).map(([dateKey, hourlyData]) => {
      const temperatures = hourlyData.map(d => d.temperature_two_m).filter(t => t != null)
      const precipitations = hourlyData.map(d => d.precipitation || 0)
      const precipProbs = hourlyData.map(d => d.precipitation_probability || 0)
      const windSpeeds = hourlyData.map(d => d.wind_speed_ten_m || 0)
      const windDirections = hourlyData.map(d => d.wind_direction_ten_m || 0)

      // Parse date components to create proper local date
      const [year, month, day] = dateKey.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })

      return {
        date: dateKey,
        dayName,
        minTemp: Math.min(...temperatures),
        maxTemp: Math.max(...temperatures),
        avgTemp: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
        totalPrecipitation: precipitations.reduce((a, b) => a + b, 0),
        avgPrecipitationProb: precipProbs.reduce((a, b) => a + b, 0) / precipProbs.length,
        avgWindSpeed: windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length,
        dominantWindDirection: windDirections.reduce((a, b) => a + b, 0) / windDirections.length,
        hourlyData: hourlyData.sort((a, b) => new Date(a.forecast_time).getTime() - new Date(b.forecast_time).getTime())
      }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    setDayForecasts(processedDays)
  }

  const weekData: WeekData[] = dayForecasts.map((day: DayForecast) => ({
    day: day.dayName,
    min: Math.round(day.minTemp),
    max: Math.round(day.maxTemp),
    precip: Math.round(day.avgPrecipitationProb),
    wind: Math.round(day.avgWindSpeed),
    humidity: Math.round(day.hourlyData.reduce((acc, hour) => acc + (hour.soil_moisture_zero_to_one_cm * 100), 0) / day.hourlyData.length),
    soil_moisture: Math.round(day.hourlyData.reduce((acc, hour) => acc + (hour.soil_moisture_zero_to_one_cm * 100), 0) / day.hourlyData.length),
    evapotranspiration: Number((day.hourlyData.reduce((acc, hour) => acc + hour.evapotranspiration, 0) / day.hourlyData.length).toFixed(3))
  }))

  return {
    dayForecasts,
    weekData,
    lastUpdate
  }
}
