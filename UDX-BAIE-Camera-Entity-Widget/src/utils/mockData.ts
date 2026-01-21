import { EntityRecord, CameraDevice } from '../WidgetView'
import mockDataJson from './mock-data.json'

// TagoIO data item interface
interface TagoDataItem {
  id: string
  variable: string
  value: string | number | boolean
  type: string
  group: string
  location: string
  metadata: string
  time: string
}

// Check if string looks like base64-encoded gzip (starts with H4sI which is gzip magic bytes in base64)
const isCompressedData = (value: string): boolean => {
  return typeof value === 'string' && value.startsWith('H4sI')
}

// Decompress gzip/base64 encoded data (sync version using pako would be ideal, but for now skip compressed in mock)
const tryParseValue = (value: string): any => {
  // Skip compressed data in mock parsing - it will be handled by the async processRealtimeData
  if (isCompressedData(value)) {
    console.log('Skipping compressed mock data - will be handled by async parser')
    return null
  }
  return JSON.parse(value)
}

// Parse entity records from the TagoIO JSON format
const parseEntityRecords = (): EntityRecord[] => {
  const data = mockDataJson as TagoDataItem[]

  // Filter for entity_record variables and parse the JSON values
  const entityRecords = data
    .filter(item => item.variable === 'entity_record')
    .map(item => {
      try {
        return tryParseValue(item.value as string) as EntityRecord
      } catch (e) {
        console.error('Failed to parse entity record:', e)
        return null
      }
    })
    .filter((record): record is EntityRecord => record !== null)

  return entityRecords
}

// Parse camera devices from the TagoIO JSON format
const parseCameraDevices = (): CameraDevice[] => {
  const data = mockDataJson as TagoDataItem[]

  // Filter for camera_device variables and parse the JSON values
  const cameraDevices = data
    .filter(item => item.variable === 'camera_device')
    .map(item => {
      try {
        return tryParseValue(item.value as string) as CameraDevice
      } catch (e) {
        console.error('Failed to parse camera device:', e)
        return null
      }
    })
    .filter((device): device is CameraDevice => device !== null)

  // If no camera devices in JSON, generate mock ones from entity records
  if (cameraDevices.length === 0) {
    return generateMockCameraDevices()
  }

  return cameraDevices
}

// Generate mock camera devices from entity records (for development)
const generateMockCameraDevices = (): CameraDevice[] => {
  const entityRecords = parseEntityRecords()
  const cameraScenarios = entityRecords.filter(r => r.record_type === 'camera_scenario')

  // Get unique hostnames
  const hostnameMap = new Map<string, { hostname: string, park: string, friendlyName: string }>()
  cameraScenarios.forEach(scenario => {
    const hostname = scenario.info.camera_hostname
    if (hostname && !hostnameMap.has(hostname)) {
      hostnameMap.set(hostname, {
        hostname,
        park: scenario.info.park,
        friendlyName: scenario.info.camera_friendly_name || hostname
      })
    }
  })

  // Create mock camera devices
  const devices: CameraDevice[] = []
  let index = 0
  hostnameMap.forEach(({ hostname, park, friendlyName }) => {
    // Determine device type based on hostname pattern
    let device_type: CameraDevice['device_type'] = 'axis-camera'
    if (hostname.toLowerCase().includes('hanwha')) {
      device_type = 'hanwha-camera'
    }

    // Randomly make some cameras "unconfigured" for testing
    const is_configured = index % 5 !== 0

    devices.push({
      id: `mock-camera-${index}`,
      name: friendlyName,
      device_type: is_configured ? device_type : 'camera',
      hostname: hostname,
      park: park,
      location: null,
      ip_address: `10.${50 + Math.floor(index / 10)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      tags: {
        device_type: is_configured ? device_type : 'camera',
        hostname: hostname,
        park: park
      },
      last_input: new Date().toISOString(),
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      is_configured
    })
    index++
  })

  return devices
}

const mockCameraDevices: CameraDevice[] = parseCameraDevices()

// Get the raw mock data in TagoIO format (preserves time field)
export const getMockRawData = (): TagoDataItem[] => {
  return mockDataJson as TagoDataItem[]
}

export const getMockCameraDevices = (): CameraDevice[] => {
  console.log(`Mock data loaded with ${mockCameraDevices.length} camera devices`)
  return mockCameraDevices
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
