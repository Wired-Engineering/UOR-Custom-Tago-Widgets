import { useEffect, useState } from 'preact/hooks'
import { createContext } from 'preact'
import App from './App'
import { isDevelopmentMode, mockTagoIOData } from './utils/mockData'
import "@tago-io/custom-widget"
import "@tago-io/custom-widget/dist/custom-widget.css"

interface EntityWeatherData {
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

interface WidgetContextType {
  weatherData: EntityWeatherData[]
  isLoading: boolean
  widget: any
  realtimeEventCount: number
}

export const WidgetContext = createContext<WidgetContextType>({
  weatherData: [],
  isLoading: true,
  widget: null,
  realtimeEventCount: 0
})

declare global {
  interface Window {
    TagoIO: any;
    widget?: any;
  }
}

export const WidgetView = () => {
  const [weatherData, setWeatherData] = useState<EntityWeatherData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [widget, setWidget] = useState<any>(null)
  const [realtimeEventCount, setRealtimeEventCount] = useState(0)

  const processRealtimeData = (realtimeData: any) => {
    const newWeatherData: EntityWeatherData[] = []
    
    realtimeData.forEach(function(dataGroup: any) {
      if (dataGroup.result) {
        // Group variables by time/group for weather records
        const variablesByGroup: { [key: string]: any } = {}
        
        dataGroup.result.forEach(function(dataPoint: any) {
          const groupKey = dataPoint.group || 
                          dataPoint.metadata?.forecast_time || 
                          dataPoint.time || 
                          new Date().toISOString()
          
          if (!variablesByGroup[groupKey]) {
            variablesByGroup[groupKey] = {
              time: dataPoint.time,
              group: dataPoint.group,
              metadata: dataPoint.metadata || {}
            }
          }
          
          variablesByGroup[groupKey][dataPoint.variable] = dataPoint.value
          
          if (dataPoint.metadata) {
            Object.assign(variablesByGroup[groupKey].metadata, dataPoint.metadata)
          }
        })

        // Convert to weather records
        Object.entries(variablesByGroup).forEach(([groupKey, variables]) => {
          const weatherRecord: EntityWeatherData = {
            id: `weather_${groupKey}_${Date.now()}`,
            forecast_time: variables.time || new Date().toISOString(),
            forecast_date: variables.metadata?.forecast_date || null,
            hours_from_now: variables.metadata?.hours_from_now || 0,
            temperature_two_m: variables.temperature_2m || variables.temperature_80m || 75,
            temperature_eighty_m: variables.temperature_80m || variables.temperature_2m || 77,
            precipitation: variables.precipitation || 0,
            rain: variables.rain || 0,
            showers: variables.showers || 0,
            precipitation_probability: variables.precipitation_probability || 0,
            evapotranspiration: variables.evapotranspiration || 0,
            wind_speed_ten_m: variables.wind_speed_10m || 5,
            wind_direction_ten_m: variables.wind_direction_10m || 180,
            soil_moisture_zero_to_one_cm: variables.soil_moisture_0_1cm || 0.2,
            soil_moisture_one_to_three_cm: variables.soil_moisture_1_3cm || 0.22,
            soil_moisture_three_to_nine_cm: variables.soil_moisture_3_9cm || 0.24,
            soil_moisture_nine_to_twentyseven_cm: variables.soil_moisture_9_27cm || 0.26,
            created_at: variables.time || new Date().toISOString(),
            updated_at: variables.time || new Date().toISOString()
          }
          
          newWeatherData.push(weatherRecord)
        })
      }
    })

    console.log(`✅ Created ${newWeatherData.length} weather records`)
    setRealtimeEventCount(prev => prev + 1)
    
    if (newWeatherData.length > 0) {
      setWeatherData(newWeatherData)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log('🚀 Initializing Widget at root level')

    // Development mode - use mock data
    if (isDevelopmentMode()) {
      console.log('🔧 Development mode detected - using mock data')
      setTimeout(() => {
        const mockData = mockTagoIOData()
        processRealtimeData(mockData)
      }, 1000)
      return
    }

    // Production mode - use TagoIO
    if (!window.TagoIO) {
      console.error('❌ TagoIO not available in production mode')
      return
    }

    // Initialize widget
    window.TagoIO.onStart(function(widgetConfig: any) {
      console.log('✅ Widget started!', widgetConfig)
      window.widget = widgetConfig
      setWidget(widgetConfig)
    })

    // Handle errors gracefully
    window.TagoIO.onError(function(error: any) {
      console.error('❌ Widget error:', error)
      setIsLoading(false)
    })

    // Handle real-time data
    window.TagoIO.onRealtime(function(realtimeData: any) {
      console.log('📊 Data received from onRealtime:', realtimeData)
      processRealtimeData(realtimeData)
    })

    // Signal that widget is ready
    window.TagoIO.ready({
      header: {
        color: '#005194'
      }
    })

    console.log('✅ TagoIO Widget initialized at root level')
  }, [])

  const contextValue: WidgetContextType = {
    weatherData,
    isLoading,
    widget,
    realtimeEventCount
  }

  return (
    <WidgetContext.Provider value={contextValue}>
      <App />
    </WidgetContext.Provider>
  )
}