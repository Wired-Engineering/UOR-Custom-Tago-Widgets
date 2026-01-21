import { EntityRecord, CameraDevice } from '../WidgetView'
import { UnconfiguredScenario, DuplicateGroup } from '../types/dashboard'

/**
 * Builds a comprehensive searchable index for an entity record
 * Includes all relevant fields: IDs, names, hostnames, parks, settings, etc.
 */
export const buildEntitySearchIndex = (record: EntityRecord): string => {
  const fields: (string | undefined | null)[] = [
    // Core identifiers
    record.id,
    record.unique_id,
    record.name,
    record.record_type,

    // Info fields
    record.info.park,
    record.info.camera_hostname,
    record.info.camera_friendly_name,
    record.info.camera_device_id,
    record.info.camera_type,
    record.info.scenario_identifier,
    record.info.scenario_type,
    record.info.venue_type,
    record.info.device_id,

    // Settings
    record.settings.venue_id,
    record.settings.venue_type,
    record.settings.direction,

    // Device IP
    record.device_ip,
  ]

  return fields
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * Builds a comprehensive searchable index for a camera device
 */
export const buildCameraSearchIndex = (camera: CameraDevice, scenarios: EntityRecord[] = []): string => {
  const fields: (string | undefined | null)[] = [
    // Core identifiers
    camera.id,
    camera.name,
    camera.hostname,
    camera.device_type,

    // Location info
    camera.park,
    camera.location,
    camera.ip_address,

    // Tags (values)
    ...Object.values(camera.tags || {}),

    // Include scenario names and IDs for searchability
    ...scenarios.map(s => s.name),
    ...scenarios.map(s => s.id),
    ...scenarios.map(s => s.unique_id),
  ]

  return fields
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * Builds searchable index for unconfigured scenarios
 */
export const buildUnconfiguredSearchIndex = (item: UnconfiguredScenario): string => {
  const fields: (string | undefined | null)[] = [
    item.record.id,
    item.record.unique_id,
    item.record.name,
    item.hostname,
    item.macAddress,
    item.deviceScenario,
    item.record.info.park,
    item.record.info.scenario_identifier,
  ]

  return fields
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * Builds searchable index for duplicate groups
 */
export const buildDuplicateGroupSearchIndex = (group: DuplicateGroup): string => {
  const fields: (string | undefined | null)[] = [
    group.hostname,
    group.uniqueId,
    group.key,
    ...group.records.map(r => r.id),
    ...group.records.map(r => r.name),
    ...group.records.map(r => r.info.park),
  ]

  return fields
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * Enhanced entity record filter with linked scenario search
 */
export const filterEntityRecord = (
  record: EntityRecord,
  query: string,
  linkedScenarios: EntityRecord[] = []
): boolean => {
  if (!query) return true

  const lowerQuery = query.toLowerCase()

  // Build base search index
  let searchIndex = buildEntitySearchIndex(record)

  // For venues, also include linked scenario data
  if (record.record_type === 'queue_venue' || record.record_type === 'occupancy_venue') {
    linkedScenarios.forEach(scenario => {
      searchIndex += ' ' + buildEntitySearchIndex(scenario)
    })
  }

  return searchIndex.includes(lowerQuery)
}

/**
 * Filter camera devices with their scenarios
 */
export const filterCameraDevice = (
  camera: CameraDevice,
  scenarios: EntityRecord[],
  query: string
): boolean => {
  if (!query) return true
  const searchIndex = buildCameraSearchIndex(camera, scenarios)
  return searchIndex.includes(query.toLowerCase())
}

/**
 * Filter unconfigured scenarios
 */
export const filterUnconfiguredScenario = (
  item: UnconfiguredScenario,
  query: string
): boolean => {
  if (!query) return true
  const searchIndex = buildUnconfiguredSearchIndex(item)
  return searchIndex.includes(query.toLowerCase())
}

/**
 * Filter duplicate groups
 */
export const filterDuplicateGroup = (
  group: DuplicateGroup,
  query: string
): boolean => {
  if (!query) return true
  const searchIndex = buildDuplicateGroupSearchIndex(group)
  return searchIndex.includes(query.toLowerCase())
}
