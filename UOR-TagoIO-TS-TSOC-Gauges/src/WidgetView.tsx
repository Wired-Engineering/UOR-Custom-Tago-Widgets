import { useEffect, useState } from 'preact/hooks'
import { createContext } from 'preact'
import App from './app'
import { isDevelopmentMode, mockWaterLevelTagoIOData } from './utils/mockData'
import "@tago-io/custom-widget"
import "@tago-io/custom-widget/dist/custom-widget.css"

export interface EntityWaterLevelData {
  id: string
  name: string
  currentLevel: number
  minOperational?: number
  maxOperational?: number
  normalLevel: number
  normalDeviation: number
  topOfPond?: number
  bottomOfPond?: number
  maxAlarm?: number
  minAlarm?: number
  deviceBattery?: number
  group: string
  created_at: string
  updated_at: string
  last_updated: string
  metadata?: Record<string, any>
}

interface WidgetContextType {
  waterLevelData: EntityWaterLevelData[]
  isLoading: boolean
  widget: any
  realtimeEventCount: number
}

export const WidgetContext = createContext<WidgetContextType>({
  waterLevelData: [],
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
  const [waterLevelData, setWaterLevelData] = useState<EntityWaterLevelData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [widget, setWidget] = useState<any>(null)
  const [realtimeEventCount, setRealtimeEventCount] = useState(0)

  const processRealtimeData = (realtimeData: any) => {
    const newWaterLevelData: EntityWaterLevelData[] = []
    
    realtimeData.forEach(function(dataGroup: any) {
      if (dataGroup.result) {
        // Group variables by group ID for water level records
        const variablesByGroup: { [key: string]: any } = {}
        
        dataGroup.result.forEach(function(dataPoint: any) {
          const groupKey = dataPoint.group || new Date().toISOString()
          
          if (!variablesByGroup[groupKey]) {
            variablesByGroup[groupKey] = {
              time: dataPoint.time,
              group: dataPoint.group,
              metadata: {},
              variableTimes: {} // Track timestamp for each variable
            }
          }
          
          // Only use this data point if it's more recent than what we already have for this variable
          const currentVariableTime = variablesByGroup[groupKey].variableTimes[dataPoint.variable]
          const newDataPointTime = new Date(dataPoint.time).getTime()
          
          if (!currentVariableTime || newDataPointTime > new Date(currentVariableTime).getTime()) {
            variablesByGroup[groupKey][dataPoint.variable] = dataPoint.value
            variablesByGroup[groupKey].variableTimes[dataPoint.variable] = dataPoint.time
            
            // Update group time to the most recent time across all variables
            if (newDataPointTime > new Date(variablesByGroup[groupKey].time).getTime()) {
              variablesByGroup[groupKey].time = dataPoint.time
            }
          }
          
          // Store metadata for each variable separately
          if (dataPoint.metadata) {
            variablesByGroup[groupKey].metadata[dataPoint.variable] = dataPoint.metadata
          }
        })

        // Convert to water level records
        Object.entries(variablesByGroup).forEach(([groupKey, variables]) => {
          // Only create a record if we have the required water level data
          if (variables.device_name && 
              variables.device_navd_current_we !== undefined) {
            
            // Find the most recent timestamp from all variables in this group
            const mostRecentTime = (Object.values(variables.variableTimes) as string[]).reduce((latest: string, current: string) => {
              return new Date(current).getTime() > new Date(latest).getTime() ? current : latest
            }, variables.time || new Date().toISOString())
            
            const waterLevelRecord: EntityWaterLevelData = {
              id: groupKey,
              name: variables.device_name,
              currentLevel: variables.device_navd_current_we,
              minOperational: variables.device_navd_min_op_we !== undefined && variables.device_navd_min_op_we !== null ? variables.device_navd_min_op_we : undefined,
              maxOperational: variables.device_navd_max_op_we !== undefined && variables.device_navd_max_op_we !== null ? variables.device_navd_max_op_we : undefined,
              normalLevel: variables.device_navd_normal_we || 0,
              normalDeviation: variables.device_navd_normal_we_deviation || 0,
              topOfPond: variables.device_navd_alarm_top !== undefined && variables.device_navd_alarm_top !== null ? variables.device_navd_alarm_top : undefined,
              bottomOfPond: variables.device_navd_alarm_bop !== undefined && variables.device_navd_alarm_bop !== null ? variables.device_navd_alarm_bop : undefined,
              maxAlarm: variables.device_navd_max_alarm_we !== undefined && variables.device_navd_max_alarm_we !== null ? variables.device_navd_max_alarm_we : undefined,
              minAlarm: variables.device_navd_min_alarm_we !== undefined && variables.device_navd_min_alarm_we !== null ? variables.device_navd_min_alarm_we : undefined,
              deviceBattery: variables.device_battery !== undefined && variables.device_battery !== null ? variables.device_battery : undefined,
              group: groupKey,
              created_at: variables.time || new Date().toISOString(),
              updated_at: variables.time || new Date().toISOString(),
              last_updated: mostRecentTime,
              metadata: variables.metadata || {}
            }
            
            newWaterLevelData.push(waterLevelRecord)
          }
        })
      }
    })

    console.log(`✅ Created ${newWaterLevelData.length} water level records`)
    setRealtimeEventCount(prev => prev + 1)
    
    if (newWaterLevelData.length > 0) {
      // Sort alphabetically by device name
      const sortedData = newWaterLevelData.sort((a, b) => a.name.localeCompare(b.name))
      setWaterLevelData(sortedData)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log('🚀 Initializing Water Level Widget')

    // Development mode - use mock data
    if (isDevelopmentMode()) {
      console.log('🔧 Development mode detected - using mock water level data')
      setTimeout(() => {
        const mockData = mockWaterLevelTagoIOData()
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
      console.log('📊 Water level data received from onRealtime:', realtimeData)
      processRealtimeData(realtimeData)
    })

    // Signal that widget is ready
    window.TagoIO.ready({
      header: {
        color: '#667eea'
      }
    })

    console.log('✅ TagoIO Water Level Widget initialized')
  }, [])

  const contextValue: WidgetContextType = {
    waterLevelData,
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