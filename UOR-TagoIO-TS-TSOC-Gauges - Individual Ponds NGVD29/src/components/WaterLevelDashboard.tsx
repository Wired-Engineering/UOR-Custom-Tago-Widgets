import { useContext } from 'preact/hooks'
import { WidgetContext } from '../WidgetView'
import WaterLevelGauge from './WaterLevelGauge'
import './WaterLevelDashboard.css'

const WaterLevelDashboard = () => {
  const { waterLevelData, isLoading } = useContext(WidgetContext)
 
  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading water level data...</div>
      </div>
    )
  }
  
  if (waterLevelData.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="no-data">No water level data available</div>
      </div>
    )
  }
  
  return (
    <div className="dashboard-container">
      
      <div className="dashboard-content">
          <div className="bars-section">
            <div className="bars-grid">
              {waterLevelData.map(level => (
                <WaterLevelGauge
                  key={`bar-${level.id}`}
                  name={level.name}
                  currentLevel={level.currentLevel}
                  minOperational={level.minOperational}
                  maxOperational={level.maxOperational}
                  normalLevel={level.normalLevel}
                  normalDeviation={level.normalDeviation}
                  topOfPond={level.topOfPond}
                  bottomOfPond={level.bottomOfPond}
                  maxAlarm={level.maxAlarm}
                  minAlarm={level.minAlarm}
                  lastUpdated={level.last_updated}
                />
              ))}
            </div>
          </div>
      </div>
    </div>
  )
}

export default WaterLevelDashboard