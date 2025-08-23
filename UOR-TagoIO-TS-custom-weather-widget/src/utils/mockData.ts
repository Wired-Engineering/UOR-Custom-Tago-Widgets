import mockDataJson from './mock-data.json'

export const mockTagoIOData = () => {
  const mockRealtimeData = [{
    result: [] as any[]
  }]
  
  const hourlyData = mockDataJson.hourly
  const currentTime = new Date()
  
  // Process all available hours from the mock data
  for (let i = 0; i < hourlyData.time.length; i++) {
    const timeString = hourlyData.time[i]
    const forecastTime = new Date(timeString)
    const hoursFromNow = Math.round((forecastTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60))
    
    // Parse the date and hour for group ID
    const [datePart, timePart] = timeString.split('T')
    const hour = timePart.split(':')[0]
    const groupId = `${datePart}_${hour}`
    
    // Create metadata similar to the real data
    const metadata = {
      hours_from_now: hoursFromNow,
      forecast_hour: i,
      forecast_date: datePart,
      forecast_time: `${hour}:00`
    }
    
    // Add all variables for this hour
    const variables = [
      { 
        variable: 'temperature_2m', 
        value: hourlyData.temperature_2m[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.temperature_2m
      },
      { 
        variable: 'temperature_80m', 
        value: hourlyData.temperature_80m[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.temperature_80m
      },
      { 
        variable: 'precipitation', 
        value: hourlyData.precipitation[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.precipitation
      },
      { 
        variable: 'rain', 
        value: hourlyData.rain[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.rain
      },
      { 
        variable: 'showers', 
        value: hourlyData.showers[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.showers
      },
      { 
        variable: 'precipitation_probability', 
        value: hourlyData.precipitation_probability[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.precipitation_probability
      },
      { 
        variable: 'evapotranspiration', 
        value: hourlyData.evapotranspiration[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.evapotranspiration
      },
      { 
        variable: 'wind_speed_10m', 
        value: hourlyData.wind_speed_10m[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.wind_speed_10m
      },
      { 
        variable: 'wind_direction_10m', 
        value: hourlyData.wind_direction_10m[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.wind_direction_10m
      },
      { 
        variable: 'soil_moisture_0_1cm', 
        value: hourlyData.soil_moisture_0_to_1cm[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.soil_moisture_0_to_1cm
      },
      { 
        variable: 'soil_moisture_1_3cm', 
        value: hourlyData.soil_moisture_1_to_3cm[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.soil_moisture_1_to_3cm
      },
      { 
        variable: 'soil_moisture_3_9cm', 
        value: hourlyData.soil_moisture_3_to_9cm[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.soil_moisture_3_to_9cm
      },
      { 
        variable: 'soil_moisture_9_27cm', 
        value: hourlyData.soil_moisture_9_to_27cm[i], 
        time: forecastTime.toISOString(), 
        group: groupId,
        metadata,
        unit: mockDataJson.hourly_units.soil_moisture_9_to_27cm
      }
    ]
    
    mockRealtimeData[0].result.push(...variables)
  }
  
  console.log(`✅ Generated mock data with ${mockRealtimeData[0].result.length} data points from mock-data.json`)
  return mockRealtimeData
}

// Development mode detection using Parcel
export const isDevelopmentMode = () => {
  // Check if TagoIO is available (production environment indicator)
  const hasTagoIO = typeof window !== 'undefined' && (window as any).TagoIO
  
  // Use Parcel's NODE_ENV to detect development mode
  const isDevEnv = process.env.NODE_ENV === 'development'
  
  // Return true if either TagoIO is not available OR we're explicitly in development
  return !hasTagoIO || isDevEnv
}

// Production mode detection using Parcel
export const isProductionMode = () => {
  return process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && (window as any).TagoIO
}