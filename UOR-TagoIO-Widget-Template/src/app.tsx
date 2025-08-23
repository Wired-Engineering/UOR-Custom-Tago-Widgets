import { useContext } from 'preact/hooks'
import { WidgetContext } from './WidgetView'
import './app.css'

const App = () => {
  const { data, isLoading, realtimeEventCount } = useContext(WidgetContext)

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading widget data...</p>
      </div>
    )
  }

  return (
    <div className="widget-container">
      <div className="widget-header">
        <h1>TagoIO Custom Widget</h1>
        <div className="realtime-indicator">
          Events: {realtimeEventCount}
        </div>
      </div>
      
      <div className="widget-content">
        {data.length === 0 ? (
          <div className="no-data">
            <p>No data available</p>
          </div>
        ) : (
          <div className="data-grid">
            {data.map((item) => (
              <div key={item.id} className="data-card">
                <h3>{item.name}</h3>
                <div className="data-value">{item.value}</div>
                <div className="data-time">
                  {new Date(item.time).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App