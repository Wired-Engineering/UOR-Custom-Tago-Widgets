import { EntityRecord, CameraDevice } from '../WidgetView'

export type RecordType = 'camera_scenario' | 'queue_venue' | 'occupancy_venue'
export type FilterType = 'all' | RecordType | 'devices' | 'duplicates' | 'unconfigured'

export interface UnconfiguredScenario {
  record: import('../WidgetView').EntityRecord
  hostname: string
  macAddress: string
  deviceScenario: string
}

export interface GroupedData {
  [recordType: string]: {
    [park: string]: EntityRecord[]
  }
}

export interface CameraWithScenarios extends CameraDevice {
  scenarios: EntityRecord[]
}

export interface DuplicateGroup {
  key: string
  hostname: string
  uniqueId: string
  records: EntityRecord[]
}

export interface VenueGroup {
  venueId: string
  venueType: 'queue' | 'occupancy'
  park: string
  scenarios: EntityRecord[]
}

export interface GroupedCameras {
  configured: { [park: string]: CameraWithScenarios[] }
  unconfigured: CameraWithScenarios[]
}

export interface DashboardStats {
  total: number
  byType: Record<string, number>
  byPark: Record<string, number>
}

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  camera_scenario: 'Camera Scenarios',
  queue_venue: 'Queue Venues',
  occupancy_venue: 'Occupancy Venues'
}

export const RECORD_TYPE_ICONS: Record<RecordType, string> = {
  camera_scenario: 'CAM',
  queue_venue: 'QUEUE',
  occupancy_venue: 'OCC'
}
