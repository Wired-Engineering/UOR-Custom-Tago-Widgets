// @ts-nocheck - React/Recharts compatibility handled at runtime via preact/compat
import { useContext } from 'react'
import { WidgetContext } from '../WidgetView'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts'
import './WeatherDashboard.css'
import packageJson from '../../package.json'

// Import custom hooks
import { useWeatherData } from '../hooks/useWeatherData'
import { useDaySelection } from '../hooks/useDaySelection'
import { useChartData } from '../hooks/useChartData'
import { useWeatherIcons } from '../hooks/useWeatherIcons'
import type { DayForecast, EntityWeatherData } from '../hooks/useWeatherData'

const WeatherDashboard = () => {
  const { weatherData, isLoading } = useContext(WidgetContext)

  // Custom hooks
  const { dayForecasts, weekData, lastUpdate } = useWeatherData(weatherData)
  const {
    selectedDay,
    selectedHourIndex,
    selectedMetric,
    setSelectedDay,
    setSelectedMetric,
    handleChartClick,
    handleHourClick
  } = useDaySelection(dayForecasts)
  const { formatChartData } = useChartData()
  const { getWeatherIcon, getWeatherCondition } = useWeatherIcons()

  if (isLoading) {
    return (
      <div className="weather-dashboard-modern loading">
        <div className="loading-container">
          <div className="loading-animation">
            <div className="weather-loading-icon">☀️</div>
          </div>
          <p className="loading-text">Loading Weather Forecast...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="weather-dashboard-modern">
      <header className="compact-header">
        <div className="header-content">
          <div className="app-title">
            <h1>UOR - Weather Forecast</h1>
            <p> v{packageJson.version} - Updates every 6 hours</p>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <div className="week-forecast-card">
          <h2 className="section-title">7-Day Forecast</h2>
          <div className="week-forecast-grid">
            {dayForecasts.map((day: DayForecast, index: number) => {
              // Check if this day is actually today
              const today = new Date()
              const todayDateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
              const isToday = day.date === todayDateKey

              // Parse date components to create proper local date for display
              const [year, month, dayNum] = day.date.split('-').map(Number)
              const displayDate = new Date(year, month - 1, dayNum)

              return (
              <div
                key={day.date}
                className={`day-card ${selectedDay?.date === day.date ? 'selected' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <div className="day-card-header">
                  <span className="day-name">{isToday ? 'Today' : day.dayName}</span>
                  <span className="day-date">{displayDate.toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: '2-digit'
                  })}</span>
                </div>

                {getWeatherIcon(day.avgTemp, day.totalPrecipitation, day.avgPrecipitationProb, false, selectedDay?.date === day.date)}

                <div className="day-temps">
                  <span className="temp-high">{Math.round(day.maxTemp)}°</span>
                  <span className="temp-separator">/</span>
                  <span className="temp-low">{Math.round(day.minTemp)}°</span>
                </div>

                <div className="day-rain">
                  <span className="rain-icon">💧</span>
                  <span className="rain-chance">{Math.round(day.avgPrecipitationProb)}%</span>
                </div>
              </div>
            )})}
          </div>
        </div>

        {selectedDay && (
          <div className="charts-section">
            <div className="metric-selector">
              <button
                className={`metric-btn ${selectedMetric === 'temperature' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('temperature')}
              >
                Temperature
              </button>
              <button
                className={`metric-btn ${selectedMetric === 'precipitation' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('precipitation')}
              >
                Precipitation
              </button>
              <button
                className={`metric-btn ${selectedMetric === 'wind' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('wind')}
              >
                Wind
              </button>
              <button
                className={`metric-btn ${selectedMetric === 'humidity' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('humidity')}
              >
                Humidity
              </button>
              <button
                className={`metric-btn ${selectedMetric === 'soil_moisture' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('soil_moisture')}
              >
                Soil Moisture
              </button>
              <button
                className={`metric-btn ${selectedMetric === 'evapotranspiration' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('evapotranspiration')}
              >
                Evapotranspiration
              </button>
            </div>

            <div className="chart-container">
              <h3 className="chart-title">
                {(() => {
                  const [year, month, day] = selectedDay.date.split('-').map(Number)
                  const displayDate = new Date(year, month - 1, day)
                  return `${selectedDay.dayName} - ${displayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                })()}
              </h3>

              <ResponsiveContainer width="100%" height={300}>
                {selectedMetric === 'temperature' && (
                  <AreaChart data={formatChartData(selectedDay, selectedHourIndex)} onClick={handleChartClick}>
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#57a773" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#57a773" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis
                      stroke="#666"
                      domain={['dataMin - 5', 'dataMax + 5']}
                      label={{
                        value: '°F',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                      labelStyle={{ color: '#666' }}
                      formatter={(value: number) => [`${value}°F`, 'Temperature']}
                    />
                    <Area
                      type="monotone"
                      dataKey="temperature"
                      stroke="#57a773"
                      strokeWidth={2}
                      fill="url(#tempGradient)"
                    />
                    {selectedHourIndex !== null && (
                      <ReferenceDot
                        x={formatChartData(selectedDay, selectedHourIndex)[selectedHourIndex]?.time}
                        y={formatChartData(selectedDay, selectedHourIndex)[selectedHourIndex]?.temperature}
                        r={6}
                        fill="#005194"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )}
                  </AreaChart>
                )}

                {selectedMetric === 'precipitation' && (
                  <BarChart data={formatChartData(selectedDay, selectedHourIndex)} onClick={handleChartClick}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis
                      stroke="#666"
                      domain={[0, 100]}
                      label={{
                        value: '%',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                      labelStyle={{ color: '#666' }}
                      formatter={(value: number) => [`${value}%`, 'Precipitation Chance']}
                    />
                    <Bar dataKey="precipProb" fill="#9bd1e5" radius={[8, 8, 0, 0]} />
                  </BarChart>
                )}

                {selectedMetric === 'wind' && (
                  <LineChart data={formatChartData(selectedDay, selectedHourIndex)} onClick={handleChartClick}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis
                      stroke="#666"
                      label={{
                        value: 'mph',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                      labelStyle={{ color: '#666' }}
                      formatter={(value: number) => [`${value} mph`, 'Wind Speed']}
                    />
                    <Line
                      type="monotone"
                      dataKey="windSpeed"
                      stroke="#157145"
                      strokeWidth={2}
                      dot={{ fill: '#157145', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    {selectedHourIndex !== null && (
                      <ReferenceDot
                        x={formatChartData(selectedDay, selectedHourIndex)[selectedHourIndex]?.time}
                        y={formatChartData(selectedDay, selectedHourIndex)[selectedHourIndex]?.windSpeed}
                        r={6}
                        fill="#005194"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                )}

                {selectedMetric === 'humidity' && (
                  <AreaChart data={formatChartData(selectedDay, selectedHourIndex)} onClick={handleChartClick}>
                    <defs>
                      <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9bd1e5" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#9bd1e5" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis
                      stroke="#666"
                      domain={[0, 100]}
                      label={{
                        value: '%',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                      labelStyle={{ color: '#666' }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Humidity']}
                    />
                    <Area
                      type="monotone"
                      dataKey="humidity"
                      stroke="#9bd1e5"
                      strokeWidth={2}
                      fill="url(#humidityGradient)"
                    />
                    {selectedHourIndex !== null && (
                      <ReferenceDot
                        x={formatChartData(selectedDay, selectedHourIndex)[selectedHourIndex]?.time}
                        y={formatChartData(selectedDay, selectedHourIndex)[selectedHourIndex]?.humidity}
                        r={6}
                        fill="#005194"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )}
                  </AreaChart>
                )}

                {selectedMetric === 'soil_moisture' && (
                  <AreaChart data={formatChartData(selectedDay, selectedHourIndex)} onClick={handleChartClick}>
                    <defs>
                      <linearGradient id="soilGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#57a773" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#57a773" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis
                      stroke="#666"
                      domain={[0, 100]}
                      label={{
                        value: '%',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                      labelStyle={{ color: '#666' }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Soil Moisture']}
                    />
                    <Area
                      type="monotone"
                      dataKey="soilMoisture"
                      stroke="#57a773"
                      strokeWidth={2}
                      fill="url(#soilGradient)"
                    />
                    {selectedHourIndex !== null && (
                      <ReferenceDot
                        x={formatChartData(selectedDay, selectedHourIndex)[selectedHourIndex]?.time}
                        y={formatChartData(selectedDay, selectedHourIndex)[selectedHourIndex]?.soilMoisture}
                        r={6}
                        fill="#005194"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )}
                  </AreaChart>
                )}

                {selectedMetric === 'evapotranspiration' && (
                  <AreaChart data={formatChartData(selectedDay, selectedHourIndex)} onClick={handleChartClick}>
                    <defs>
                      <linearGradient id="evapGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#157145" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#157145" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis
                      stroke="#666"
                      label={{
                        value: 'inch',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                      labelStyle={{ color: '#666' }}
                      formatter={(value: number) => [`${value.toFixed(3)} inch`, 'Evapotranspiration']}
                    />
                    <Area
                      type="monotone"
                      dataKey="evapotranspiration"
                      stroke="#157145"
                      strokeWidth={2}
                      fill="url(#evapGradient)"
                    />
                    {selectedHourIndex !== null && (
                      <ReferenceDot
                        x={formatChartData(selectedDay, selectedHourIndex)[selectedHourIndex]?.time}
                        y={formatChartData(selectedDay, selectedHourIndex)[selectedHourIndex]?.evapotranspiration}
                        r={6}
                        fill="#005194"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="hourly-details">
              <h3 className="section-title">Hourly Breakdown</h3>
              <div className="hourly-scroll">
                {selectedDay.hourlyData.map((hour: EntityWeatherData, index: number) => (
                    <div
                      key={hour.id}
                      className={`hour-card ${index === selectedHourIndex ? 'selected' : ''}`}
                      onClick={() => handleHourClick(index)}
                    >
                      <div className="hour-time">
                        {new Date(hour.forecast_time).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          hour12: true
                        })}
                      </div>
                      {getWeatherIcon(hour.temperature_two_m, hour.precipitation, hour.precipitation_probability, false, index === selectedHourIndex)}
                      <div className="hour-temp">{Math.round(hour.temperature_two_m)}°</div>
                      <div className="hour-precip">
                        <span>💧 {Math.round(hour.precipitation_probability)}%</span>
                      </div>
                      {index === selectedHourIndex && (
                        <div className="hour-details">
                          <div className="detail-row">
                            <span>Wind:</span>
                            <span>{hour.wind_speed_ten_m.toFixed(1)} mph {Math.round(hour.wind_direction_ten_m)}°</span>
                          </div>
                          <div className="detail-row">
                            <span>Temp 80m:</span>
                            <span>{Math.round(hour.temperature_eighty_m)}°F</span>
                          </div>
                          <div className="detail-row">
                            <span>Rain:</span>
                            <span>{hour.rain.toFixed(2)}"</span>
                          </div>
                          <div className="detail-row">
                            <span>Soil:</span>
                            <span>{(hour.soil_moisture_zero_to_one_cm * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        <div className="additional-info">

          {weekData.length > 0 && (
            <div className="info-card">
              <h3 className="card-title">
                {selectedMetric === 'temperature' && '7-Day Temperature Trend'}
                {selectedMetric === 'precipitation' && '7-Day Precipitation Trend'}
                {selectedMetric === 'wind' && '7-Day Wind Speed Trend'}
                {selectedMetric === 'humidity' && '7-Day Humidity Trend'}
                {selectedMetric === 'soil_moisture' && '7-Day Soil Moisture Trend'}
                {selectedMetric === 'evapotranspiration' && '7-Day Evapotranspiration Trend'}
              </h3>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={weekData}>
                  <defs>
                    <linearGradient id="weekTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={
                        selectedMetric === 'temperature' ? '#57a773' :
                        selectedMetric === 'precipitation' ? '#9bd1e5' :
                        selectedMetric === 'wind' ? '#157145' :
                        selectedMetric === 'soil_moisture' ? '#57a773' :
                        selectedMetric === 'evapotranspiration' ? '#157145' : '#9bd1e5'
                      } stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={
                        selectedMetric === 'temperature' ? '#57a773' :
                        selectedMetric === 'precipitation' ? '#9bd1e5' :
                        selectedMetric === 'wind' ? '#157145' :
                        selectedMetric === 'soil_moisture' ? '#57a773' :
                        selectedMetric === 'evapotranspiration' ? '#157145' : '#9bd1e5'
                      } stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#666" />
                  <YAxis
                    stroke="#666"
                    label={{
                      value: selectedMetric === 'temperature' ? '°F' :
                              selectedMetric === 'precipitation' ? '%' :
                              selectedMetric === 'wind' ? 'mph' :
                              selectedMetric === 'soil_moisture' ? '%' :
                              selectedMetric === 'evapotranspiration' ? 'inch' : '%',
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                    labelStyle={{ color: '#666' }}
                    formatter={(value: number) => [
                      selectedMetric === 'temperature' ? `${value}°F` :
                      selectedMetric === 'precipitation' ? `${value}%` :
                      selectedMetric === 'wind' ? `${value} mph` :
                      selectedMetric === 'soil_moisture' ? `${value}%` :
                      selectedMetric === 'evapotranspiration' ? `${value} inch` : `${value}%`,
                      selectedMetric === 'temperature' ? 'High Temp' :
                      selectedMetric === 'precipitation' ? 'Precipitation' :
                      selectedMetric === 'wind' ? 'Wind Speed' :
                      selectedMetric === 'soil_moisture' ? 'Soil Moisture' :
                      selectedMetric === 'evapotranspiration' ? 'Evapotranspiration' : 'Humidity'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey={
                      selectedMetric === 'temperature' ? 'max' :
                      selectedMetric === 'precipitation' ? 'precip' :
                      selectedMetric === 'wind' ? 'wind' :
                      selectedMetric === 'soil_moisture' ? 'soil_moisture' :
                      selectedMetric === 'evapotranspiration' ? 'evapotranspiration' : 'humidity'
                    }
                    stroke={
                      selectedMetric === 'temperature' ? '#57a773' :
                      selectedMetric === 'precipitation' ? '#9bd1e5' :
                      selectedMetric === 'wind' ? '#157145' :
                      selectedMetric === 'soil_moisture' ? '#57a773' :
                      selectedMetric === 'evapotranspiration' ? '#157145' : '#9bd1e5'
                    }
                    strokeWidth={2}
                    fill="url(#weekTrendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>


      <div className="attribution">
        <span>
        This TagoIO Widget uses global NOAA GFS weather forecast and high-resolution HRRR forecasts provided by Open-Meteo.
        </span>
       <span>Made by Sam Stanton UC - PWS</span>
      </div>
    </div>
  )
}

export default WeatherDashboard
