import { useEffect, useState } from 'preact/hooks'
import { createContext } from 'preact'
import App from './app'
import { isDevelopmentMode, mockTagoIOData } from './utils/mockData'
import "@tago-io/custom-widget"
import "@tago-io/custom-widget/dist/custom-widget.css"

export interface WidgetData {
  id: string
  name: string
  value: number
  group: string
  time: string
  metadata?: Record<string, any>
}

interface WidgetContextType {
  data: WidgetData[]
  isLoading: boolean
  widget: any
  realtimeEventCount: number
}

export const WidgetContext = createContext<WidgetContextType>({
  data: [],
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
  const [data, setData] = useState<WidgetData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [widget, setWidget] = useState<any>(null)
  const [realtimeEventCount, setRealtimeEventCount] = useState(0)

  const processRealtimeData = (realtimeData: any) => {
    const newData: WidgetData[] = []
    
    realtimeData.forEach(function(dataGroup: any) {
      if (dataGroup.result) {
        // Group variables by group ID
        const variablesByGroup: { [key: string]: any } = {}
        
        dataGroup.result.forEach(function(dataPoint: any) {
          const groupKey = dataPoint.group || new Date().toISOString()
          
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

        // Convert to widget data records
        Object.entries(variablesByGroup).forEach(([groupKey, variables]) => {
          // Customize this section based on your widget's data requirements
          const record: WidgetData = {
            id: groupKey,
            name: variables.device_name || 'Unknown Device',
            value: variables.value || variables.main_value || 0,
            group: groupKey,
            time: variables.time || new Date().toISOString(),
            metadata: variables.metadata || {}
          }
          
          newData.push(record)
        })
      }
    })

    console.log(`✅ Created ${newData.length} data records`)
    setRealtimeEventCount(prev => prev + 1)
    
    if (newData.length > 0) {
      setData(newData)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log('🚀 Initializing TagoIO Widget')

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
        color: '#667eea'
      }
    })

    console.log('✅ TagoIO Widget initialized')
  }, [])

  const contextValue: WidgetContextType = {
    data,
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