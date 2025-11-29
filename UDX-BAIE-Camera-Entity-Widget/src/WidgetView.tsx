import { useEffect, useState } from 'preact/hooks'
import { createContext } from 'preact'
import App from './App'
import { isDevelopmentMode, getMockEntityData, getMockCameraDevices } from './utils/mockData'
import "@tago-io/custom-widget"
import "@tago-io/custom-widget/dist/custom-widget.css"

// Camera device interface from TagoIO devices
export interface CameraDevice {
  id: string
  name: string
  device_type: 'axis-camera' | 'hanwha-camera' | 'camera' | 'unknown'
  hostname: string | null
  park: string | null
  location: string | null
  ip_address: string | null
  tags: Record<string, string>
  last_input: string | null
  created_at: string
  updated_at: string
  is_configured: boolean
}

// Entity data interfaces based on the actual entity data structure
export interface EntityRecord {
  id: string
  created_at: string
  updated_at: string
  record_type: 'camera_scenario' | 'queue_venue' | 'occupancy_venue'
  unique_id: string
  name: string
  info: {
    camera_hostname?: string
    camera_friendly_name?: string
    camera_type?: string
    camera_device_id?: string
    scenario_identifier?: string
    scenario_type?: string
    venue_type?: string
    park: string
    active?: boolean
    device_id?: string
  }
  settings: {
    configured?: boolean
    direction?: string | null
    venue_id?: string | null
    venue_type?: string | null
    min_exits_for_calculation?: number
    max_wait?: number
    smoothing_factor?: number
    round_to_nearest?: number
    debug_mode?: boolean
    max_capacity?: number | null
    warning_threshold?: number
  }
  metrics: {
    last_crossline_count?: number
    last_crossline_update?: string | null
    trigger_count?: number
    last_reset?: string
    daily_reset_performed?: boolean
    midnight_reset_detected?: boolean
    yesterday_entries?: number
    yesterday_exits?: number
    yesterday_final_queue?: number
    yesterday_final_count?: number
    yesterday_max_queue?: number
    total_entries?: number
    total_exits?: number
    current_queue?: number
    current_wait?: number
    current_occupancy?: number
    throughput?: number
    rejected_exits?: number
    peak_today?: number
    peak_time?: string | null
    last_update?: string
    last_event?: string
    reset_reason?: string
    force_reset?: boolean
    force_reset_reason?: string
    drift_amount?: number
    last_wait?: number
    confidence?: number
  }
  timestamps?: {
    entry_timestamps?: number[]
    exit_timestamps?: number[]
  } | null
  device_ip?: string | null
}

interface WidgetContextType {
  entityData: EntityRecord[]
  cameraDevices: CameraDevice[]
  isLoading: boolean
  widget: any
  realtimeEventCount: number
  lastUpdate: Date | null
}

export const WidgetContext = createContext<WidgetContextType>({
  entityData: [],
  cameraDevices: [],
  isLoading: true,
  widget: null,
  realtimeEventCount: 0,
  lastUpdate: null
})

declare global {
  interface Window {
    TagoIO: any;
    widget?: any;
  }
}

export const WidgetView = () => {
  const [entityData, setEntityData] = useState<EntityRecord[]>([])
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [widget, setWidget] = useState<any>(null)
  const [realtimeEventCount, setRealtimeEventCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const processRealtimeData = (realtimeData: any) => {
    console.log('Processing realtime data:', realtimeData)

    // Entity data now comes as multiple entity_record variables, each containing a single JSON record
    let records: EntityRecord[] = []
    let cameras: CameraDevice[] = []

    if (Array.isArray(realtimeData)) {
      // Check if it's the TagoIO realtime format with result arrays
      if (realtimeData[0]?.result) {
        realtimeData.forEach((dataGroup: any) => {
          if (dataGroup.result && Array.isArray(dataGroup.result)) {
            // Find all entity_record variables and parse each one
            const entityRecordPoints = dataGroup.result.filter((dp: any) => dp.variable === 'entity_record')

            entityRecordPoints.forEach((dp: any) => {
              if (dp.value) {
                try {
                  const parsed = typeof dp.value === 'string'
                    ? JSON.parse(dp.value)
                    : dp.value
                  if (parsed && typeof parsed === 'object') {
                    records.push(parsed)
                  }
                } catch (e) {
                  console.error('Error parsing entity record:', e, dp.value)
                }
              }
            })

            // Find all camera_device variables and parse each one
            const cameraDevicePoints = dataGroup.result.filter((dp: any) => dp.variable === 'camera_device')

            cameraDevicePoints.forEach((dp: any) => {
              if (dp.value) {
                try {
                  const parsed = typeof dp.value === 'string'
                    ? JSON.parse(dp.value)
                    : dp.value
                  if (parsed && typeof parsed === 'object') {
                    cameras.push(parsed)
                  }
                } catch (e) {
                  console.error('Error parsing camera device:', e, dp.value)
                }
              }
            })

            // Also check for legacy entity_data format (single JSON array)
            if (records.length === 0) {
              const entityDataPoint = dataGroup.result.find((dp: any) => dp.variable === 'entity_data')
              if (entityDataPoint && entityDataPoint.value) {
                try {
                  const parsed = typeof entityDataPoint.value === 'string'
                    ? JSON.parse(entityDataPoint.value)
                    : entityDataPoint.value
                  if (Array.isArray(parsed)) {
                    records = parsed
                  }
                } catch (e) {
                  console.error('Error parsing entity data:', e)
                }
              }
            }
          }
        })
      } else {
        // Direct array of entity records
        records = realtimeData
      }
    }

    // Sort records by index from metadata if available, otherwise by name
    records.sort((a: any, b: any) => {
      if (a.metadata?.index !== undefined && b.metadata?.index !== undefined) {
        return a.metadata.index - b.metadata.index
      }
      return (a.name || '').localeCompare(b.name || '')
    })

    // Sort camera devices by name
    cameras.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

    console.log(`Processed ${records.length} entity records and ${cameras.length} camera devices`)
    setRealtimeEventCount(prev => prev + 1)
    setLastUpdate(new Date())

    if (records.length > 0) {
      setEntityData(records)
      setIsLoading(false)
    }

    if (cameras.length > 0) {
      setCameraDevices(cameras)
    }
  }

  useEffect(() => {
    console.log('Initializing Entity Data Widget')

    // Development mode - use mock data
    if (isDevelopmentMode()) {
      console.log('Development mode detected - using mock data')
      setTimeout(() => {
        const mockData = getMockEntityData()
        const mockCameras = getMockCameraDevices()
        processRealtimeData(mockData)
        setCameraDevices(mockCameras)
        console.log(`Loaded ${mockCameras.length} mock camera devices`)
      }, 500)
      return
    }

    // Production mode - use TagoIO
    if (!window.TagoIO) {
      console.error('TagoIO not available in production mode')
      return
    }

    // Initialize widget
    window.TagoIO.onStart(function(widgetConfig: any) {
      console.log('Widget started!', widgetConfig)
      window.widget = widgetConfig
      setWidget(widgetConfig)
    })

    // Handle errors gracefully
    window.TagoIO.onError(function(error: any) {
      console.error('Widget error:', error)
      setIsLoading(false)
    })

    // Handle real-time data
    window.TagoIO.onRealtime(function(realtimeData: any) {
      console.log('Data received from onRealtime:', realtimeData)
      processRealtimeData(realtimeData)
    })

    // Signal that widget is ready
    window.TagoIO.ready({
      header: {
        color: '#005194'
      }
    })

    console.log('TagoIO Widget initialized')
  }, [])

  const contextValue: WidgetContextType = {
    entityData,
    cameraDevices,
    isLoading,
    widget,
    realtimeEventCount,
    lastUpdate
  }

  return (
    <WidgetContext.Provider value={contextValue}>
      <App />
    </WidgetContext.Provider>
  )
}
