import { useEffect, useState } from 'preact/hooks'
import { createContext } from 'preact'
import App from './app'
import { isDevelopmentMode, mockPeopleCounterTagoIOData } from './utils/mockData'
import "@tago-io/custom-widget"
import "@tago-io/custom-widget/dist/custom-widget.css"

export interface SensorData {
  id: string
  deviceName: string
  park: string
  world: string
  building: string
  designation: string
  roomType: string
  floor: string
  totalIn: number
  battery?: number
  group: string
  time: string
  metadata?: Record<string, any>
}

interface WidgetContextType {
  sensorData: SensorData[]
  isLoading: boolean
  widget: any
  realtimeEventCount: number
  availableDevices: any[]
  fetchHistoricalDataForRange: (startDate: string, endDate: string, selectedDeviceIds?: string[]) => Promise<void>
  fetchAvailableDevices: () => Promise<void>
}

export const WidgetContext = createContext<WidgetContextType>({
  sensorData: [],
  isLoading: true,
  widget: null,
  realtimeEventCount: 0,
  availableDevices: [],
  fetchHistoricalDataForRange: async () => {},
  fetchAvailableDevices: async () => {}
})

declare global {
  interface Window {
    TagoIO: any;
    widget?: any;
  }
}

export const WidgetView = () => {
  const [sensorData, setSensorData] = useState<SensorData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [widget, setWidget] = useState<any>(null)
  const [realtimeEventCount, setRealtimeEventCount] = useState(0)
  const [availableDevices, setAvailableDevices] = useState<any[]>([])

  const processRealtimeData = (realtimeData: any) => {
    const newSensorData: SensorData[] = []
    
    realtimeData.forEach(function(dataGroup: any) {
      if (dataGroup.result) {
        // Create individual records for each data point
        // This allows us to have multiple hourly data points per sensor
        dataGroup.result.forEach(function(dataPoint: any) {
          if (dataPoint.variable === 'device_period_in' && dataPoint.group) {
            // For each device_period_in, create a sensor record
            const sensorRecord: SensorData = {
              id: `${dataPoint.group}-${dataPoint.time}`,
              deviceName: '', // Will be filled from other data points
              park: '',
              world: '',
              building: '',
              designation: '',
              roomType: '',
              floor: '',
              totalIn: parseInt(dataPoint.value) || 0,
              group: dataPoint.group,
              time: dataPoint.time || new Date().toISOString(),
              metadata: dataPoint.metadata || {}
            }
            
            // Find other variables for this group to fill in sensor details
            dataGroup.result.forEach(function(otherPoint: any) {
              if (otherPoint.group === dataPoint.group) {
                switch(otherPoint.variable) {
                  case 'device_name': sensorRecord.deviceName = otherPoint.value; break;
                  case 'park': sensorRecord.park = otherPoint.value; break;
                  case 'world': sensorRecord.world = otherPoint.value; break;
                  case 'building': sensorRecord.building = otherPoint.value; break;
                  case 'floor': sensorRecord.floor = otherPoint.value; break;
                  case 'designation': sensorRecord.designation = otherPoint.value; break;
                  case 'room_type': sensorRecord.roomType = otherPoint.value; break;
                }
              }
            })
            
            // Only add if we have the required fields
            if (sensorRecord.deviceName && sensorRecord.park && sensorRecord.world) {
              newSensorData.push(sensorRecord)
            }
          }
        })
      }
    })

    console.log(`✅ Created ${newSensorData.length} sensor records`)
    setRealtimeEventCount(prev => prev + 1)
    
    if (newSensorData.length > 0) {
      setSensorData(newSensorData)
      setIsLoading(false)
    }
  }


  const fetchHistoricalDataForRange = async (startDate: string, endDate: string, selectedDeviceIds?: string[]) => {
    try {
      console.log('📅 Historical data is provided directly from device with up to 10,000 records')
      // Since data comes directly from selected device, we don't need to fetch historical data
      // The realtime data already contains the historical records we need
      setIsLoading(false)
    } catch (error) {
      console.error('❌ Error with historical data:', error)
      setIsLoading(false)
    }
  }

  const fetchAvailableDevicesHandler = async () => {
    try {
      console.log('📋 Available devices loaded from direct data source')
      // Since data comes directly from selected device, we don't need to fetch available devices
      // The widget will process the incoming realtime data automatically
      setAvailableDevices([])
    } catch (error) {
      console.error('❌ Error with available devices:', error)
    }
  }

  useEffect(() => {
    console.log('🚀 Initializing People Counter Widget')

    // Development mode - use mock data
    if (isDevelopmentMode()) {
      console.log('🔧 Development mode detected - using mock people counter data')
      setTimeout(() => {
        const mockData = mockPeopleCounterTagoIOData()
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
    window.TagoIO.onStart(async function(widgetConfig: any) {
      console.log('✅ Widget started!', widgetConfig)
      window.widget = widgetConfig
      setWidget(widgetConfig)
      
      // Data comes directly from device, no need to fetch historical data
      console.log('📊 Widget ready to process realtime data with up to 10,000 historical records')
      
      // Set loading to false after widget starts - data will come through realtime
      setIsLoading(false)
    })

    // Handle errors gracefully
    window.TagoIO.onError(function(error: any) {
      console.error('❌ Widget error:', error)
      setIsLoading(false)
    })

    // Handle real-time data (for ongoing updates)
    window.TagoIO.onRealtime(function(realtimeData: any) {
      console.log('📊 People counter real-time data received:', realtimeData)
      processRealtimeData(realtimeData)
    })

    // Signal that widget is ready
    window.TagoIO.ready({
      header: {
        color: '#667eea'
      }
    })

    console.log('✅ TagoIO People Counter Widget initialized')
  }, [])

  const contextValue: WidgetContextType = {
    sensorData,
    isLoading,
    widget,
    realtimeEventCount,
    availableDevices,
    fetchHistoricalDataForRange,
    fetchAvailableDevices: fetchAvailableDevicesHandler
  }

  return (
    <WidgetContext.Provider value={contextValue}>
      <App />
    </WidgetContext.Provider>
  )
}