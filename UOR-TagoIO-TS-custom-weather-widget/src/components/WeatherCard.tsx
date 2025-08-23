import './WeatherCard.css'

interface WeatherCardProps {
  title: string
  value: number | string
  unit: string
  icon: string
  type: 'temperature' | 'humidity' | 'pressure' | 'wind' | 'direction' | 'precipitation'
}

const WeatherCard = ({ title, value, unit, icon, type }: WeatherCardProps) => {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'number') {
      return val.toFixed(1)
    }
    return String(val)
  }

  const getCardClass = () => {
    switch (type) {
      case 'temperature':
        return 'temperature-card'
      case 'humidity':
        return 'humidity-card'
      case 'pressure':
        return 'pressure-card'
      case 'wind':
        return 'wind-card'
      case 'direction':
        return 'direction-card'
      case 'precipitation':
        return 'precipitation-card'
      default:
        return 'default-card'
    }
  }

  return (
    <div className={`weather-card ${getCardClass()}`}>
      <div className="card-header">
        <span className="card-icon">{icon}</span>
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="card-content">
        <div className="card-value">
          {formatValue(value)}
          <span className="card-unit">{unit}</span>
        </div>
      </div>
    </div>
  )
}

export default WeatherCard