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
          if (variables.name && 
              variables.navd_current_we !== undefined) {
            
            // Find the most recent timestamp from all variables in this group
            const mostRecentTime = (Object.values(variables.variableTimes) as string[]).reduce((latest: string, current: string) => {
              return new Date(current).getTime() > new Date(latest).getTime() ? current : latest
            }, variables.time || new Date().toISOString())
            
            const waterLevelRecord: EntityWaterLevelData = {
              id: groupKey,
              name: variables.name,
              currentLevel: Number(variables.navd_current_we + 1.14),
              minOperational: variables.navd_min_op_we !== undefined && variables.navd_min_op_we !== null ? Number(variables.navd_min_op_we + 1.14) : undefined,
              maxOperational: variables.navd_max_op_we !== undefined && variables.navd_max_op_we !== null ? Number(variables.navd_max_op_we + 1.14) : undefined,
              normalLevel: Number(variables.navd_normal_we + 1.14) || 0,
              normalDeviation: variables.navd_normal_we_deviation || 0,
              topOfPond: variables.navd_alarm_top !== undefined && variables.navd_alarm_top !== null ? Number(variables.navd_alarm_top + 1.14) : undefined,
              bottomOfPond: variables.navd_alarm_bop !== undefined && variables.navd_alarm_bop !== null ? Number(variables.navd_alarm_bop + 1.14) : undefined,
              maxAlarm: variables.navd_max_alarm_we !== undefined && variables.navd_max_alarm_we !== null ? Number(variables.navd_max_alarm_we + 1.14) : undefined,
              minAlarm: variables.navd_min_alarm_we !== undefined && variables.navd_min_alarm_we !== null ? Number(variables.navd_min_alarm_we + 1.14) : undefined,
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
      // Deduplicate by pond name - keep the most recent record for each pond
      const uniquePonds = new Map<string, EntityWaterLevelData>()

      newWaterLevelData.forEach(record => {
        const existing = uniquePonds.get(record.name)
        if (!existing || new Date(record.last_updated).getTime() > new Date(existing.last_updated).getTime()) {
          uniquePonds.set(record.name, record)
        }
      })

      // Convert back to array and sort alphabetically by device name
      const uniqueData = Array.from(uniquePonds.values())
      const sortedData = uniqueData.sort((a, b) => a.name.localeCompare(b.name))

      console.log(`✅ After deduplication: ${sortedData.length} unique ponds`)
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