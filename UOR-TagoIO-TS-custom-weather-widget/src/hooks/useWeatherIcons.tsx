import ReactAnimatedWeather from 'react-animated-weather'

type IconType = 'CLEAR_DAY' | 'PARTLY_CLOUDY_DAY' | 'CLOUDY' | 'RAIN' | 'SLEET' | 'SNOW'

export const useWeatherIcons = () => {
  const getWeatherIconType = (temp: number, precipitation: number, precipProb: number): IconType => {
    if (precipitation > 0.5) return 'RAIN'
    if (precipitation > 0.1) return 'SLEET'
    if (precipProb > 70) return 'CLOUDY'
    if (temp > 85) return 'CLEAR_DAY'
    if (temp > 70) return 'PARTLY_CLOUDY_DAY'
    if (temp > 50) return 'CLOUDY'
    if (temp < 32) return 'SNOW'
    return 'CLOUDY'
  }

  const getWeatherIcon = (temp: number, precipitation: number, precipProb: number, isLarge = false, isSelected = false) => {
    const iconType = getWeatherIconType(temp, precipitation, precipProb)
    const size = isLarge ? 64 : 32
    const color = isSelected ? "#ffffff" : "#005194"

    return (
      <div className="animated-weather-icon">
        <ReactAnimatedWeather
          icon={iconType}
          color={color}
          size={size}
          animate={true}
        />
      </div>
    )
  }

  const getWeatherCondition = (temp: number, precipitation: number, precipProb: number): string => {
    if (precipitation > 0.5) return 'Heavy Rain'
    if (precipitation > 0.1) return 'Light Rain'
    if (precipProb > 70) return 'Cloudy'
    if (temp > 85) return 'Sunny'
    if (temp > 70) return 'Partly Cloudy'
    if (temp > 50) return 'Cloudy'
    return 'Cold'
  }

  return {
    getWeatherIconType,
    getWeatherIcon,
    getWeatherCondition
  }
}
