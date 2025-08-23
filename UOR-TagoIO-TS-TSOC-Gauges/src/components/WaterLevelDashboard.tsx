import { useContext } from 'preact/hooks'
import { WidgetContext } from '../WidgetView'
import WaterLevelGauge from './WaterLevelGauge'
import './WaterLevelDashboard.css'
import packageJson from '../../package.json'

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
      <div className="dashboard-header">
        <h1>Water Level Monitoring Dashboard v{packageJson.version}</h1>
        <div className="version-info" style={{ 
          fontSize: '12px', 
          color: 'white', 
          marginTop: '4px',
          fontWeight: 'normal'
        }}>
        </div>
      </div>
      
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
      
      <div className="attribution">
        <span>
          This TagoIO Widget monitors water levels using sensor data from Milesight EM500-SWL Sensors.
        </span>
        <span>Made by Sam Stanton UC - PWS</span>
      </div>
    </div>
  )
}

export default WaterLevelDashboard