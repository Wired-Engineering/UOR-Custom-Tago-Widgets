import type { DayForecast } from './useWeatherData'

export interface ChartDataPoint {
  time: string
  temperature: number
  temperature80m: number
  precipitation: number
  rain: number
  showers: number
  precipProb: number
  windSpeed: number
  windDirection: number
  humidity: number
  soilMoisture: number
  soilMoisture1to3: number
  soilMoisture3to9: number
  soilMoisture9to27: number
  evapotranspiration: number
  index: number
  isSelected: boolean
}

export const useChartData = () => {
  const formatChartData = (day: DayForecast, selectedHourIndex: number | null): ChartDataPoint[] => {
    return day.hourlyData.map((hour, index) => ({
      time: new Date(hour.forecast_time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
      temperature: Math.round(hour.temperature_two_m),
      temperature80m: Math.round(hour.temperature_eighty_m),
      precipitation: Number(hour.precipitation.toFixed(2)),
      rain: Number(hour.rain.toFixed(2)),
      showers: Number(hour.showers.toFixed(2)),
      precipProb: Math.round(hour.precipitation_probability),
      windSpeed: Number(hour.wind_speed_ten_m.toFixed(1)),
      windDirection: Math.round(hour.wind_direction_ten_m),
      humidity: Number((hour.soil_moisture_zero_to_one_cm * 100).toFixed(1)),
      soilMoisture: Number((hour.soil_moisture_zero_to_one_cm * 100).toFixed(1)),
      soilMoisture1to3: Number((hour.soil_moisture_one_to_three_cm * 100).toFixed(1)),
      soilMoisture3to9: Number((hour.soil_moisture_three_to_nine_cm * 100).toFixed(1)),
      soilMoisture9to27: Number((hour.soil_moisture_nine_to_twentyseven_cm * 100).toFixed(1)),
      evapotranspiration: Number(hour.evapotranspiration.toFixed(3)),
      index: index,
      isSelected: index === selectedHourIndex
    }))
  }

  return {
    formatChartData
  }
}
