import { useMemo } from 'preact/hooks'
import { EntityRecord, CameraDevice } from '../WidgetView'
import {
  GroupedData,
  CameraWithScenarios,
  DuplicateGroup,
  GroupedCameras,
  DashboardStats,
  FilterType,
  UnconfiguredScenario
} from '../types/dashboard'
import {
  filterEntityRecord,
  filterCameraDevice,
  filterUnconfiguredScenario,
  filterDuplicateGroup
} from '../utils/searchUtils'

interface UseDashboardDataProps {
  entityData: EntityRecord[]
  cameraDevices: CameraDevice[]
  searchQuery: string
  filterType: FilterType
}

interface UseDashboardDataReturn {
  totalCounts: Record<string, number>
  duplicateRecords: DuplicateGroup[]
  filteredDuplicateRecords: DuplicateGroup[]
  unconfiguredScenarios: UnconfiguredScenario[]
  filteredUnconfiguredScenarios: UnconfiguredScenario[]
  camerasWithScenarios: CameraWithScenarios[]
  scenariosByVenueId: Record<string, EntityRecord[]>
  groupedCameras: GroupedCameras
  groupedData: GroupedData
  stats: DashboardStats
  getScenariosGroupedByCamera: (venueId: string) => Record<string, { camera: CameraDevice | null; scenarios: EntityRecord[] }>
}

export const useDashboardData = ({
  entityData,
  cameraDevices,
  searchQuery,
  filterType
}: UseDashboardDataProps): UseDashboardDataReturn => {
  // Calculate total counts from unfiltered data (for filter buttons)
  const totalCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    entityData.forEach(record => {
      counts[record.record_type] = (counts[record.record_type] || 0) + 1
    })
    counts.devices = cameraDevices.length
    return counts
  }, [entityData, cameraDevices])

  // Detect duplicate records (same camera_hostname AND unique_id)
  const duplicateRecords = useMemo(() => {
    const keyMap = new Map<string, EntityRecord[]>()

    entityData.forEach(record => {
      const hostname = record.info.camera_hostname || ''
      const uniqueId = record.unique_id || ''
      const key = `${hostname}|${uniqueId}`

      if (!keyMap.has(key)) {
        keyMap.set(key, [])
      }
      keyMap.get(key)!.push(record)
    })

    const duplicates: DuplicateGroup[] = []

    keyMap.forEach((records, key) => {
      if (records.length > 1) {
        const [hostname, uniqueId] = key.split('|')
        duplicates.push({
          key,
          hostname: hostname || '(no hostname)',
          uniqueId: uniqueId || '(no unique_id)',
          records: records.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        })
      }
    })

    return duplicates
  }, [entityData])

  // Detect unconfigured scenarios (where name === info.scenario_identifier)
  const unconfiguredScenarios = useMemo(() => {
    const unconfigured: UnconfiguredScenario[] = []

    entityData.forEach(record => {
      if (record.record_type !== 'camera_scenario') return

      const scenarioIdentifier = record.info.scenario_identifier || ''

      if (record.name === scenarioIdentifier) {
        const hostname = record.info.camera_hostname || ''
        // Extract MAC address from hostname if present (e.g., axis-B8A44FFF01B7)
        const macMatch = hostname.match(/-([A-F0-9]{12})$/i)
        const macAddress = macMatch ? macMatch[1] : ''

        unconfigured.push({
          record,
          hostname,
          macAddress,
          deviceScenario: scenarioIdentifier
        })
      }
    })

    // Sort by hostname then by device/scenario
    return unconfigured.sort((a, b) => {
      const hostnameCompare = a.hostname.localeCompare(b.hostname)
      if (hostnameCompare !== 0) return hostnameCompare
      return a.deviceScenario.localeCompare(b.deviceScenario)
    })
  }, [entityData])

  // Match camera devices with their scenarios by hostname
  const camerasWithScenarios = useMemo(() => {
    const cameraScenarios = entityData.filter(r => r.record_type === 'camera_scenario')

    return cameraDevices.map(camera => {
      const matchedScenarios = cameraScenarios.filter(scenario =>
        scenario.info.camera_hostname?.toLowerCase() === camera.hostname?.toLowerCase()
      )
      return {
        ...camera,
        scenarios: matchedScenarios
      } as CameraWithScenarios
    })
  }, [entityData, cameraDevices])

  // Create lookup for scenarios linked to venues (by venue_id)
  const scenariosByVenueId = useMemo(() => {
    const lookup: Record<string, EntityRecord[]> = {}
    const cameraScenarios = entityData.filter(r => r.record_type === 'camera_scenario')

    cameraScenarios.forEach(scenario => {
      const venueId = scenario.settings.venue_id
      if (venueId) {
        if (!lookup[venueId]) {
          lookup[venueId] = []
        }
        lookup[venueId].push(scenario)
      }
    })

    return lookup
  }, [entityData])

  // Get scenarios grouped by camera for a specific venue
  const getScenariosGroupedByCamera = (venueId: string) => {
    const scenarios = scenariosByVenueId[venueId] || []
    const cameraMap: Record<string, { camera: CameraDevice | null; scenarios: EntityRecord[] }> = {}

    scenarios.forEach(scenario => {
      const hostname = scenario.info.camera_hostname || 'Unknown Camera'
      if (!cameraMap[hostname]) {
        const matchingCamera = cameraDevices.find(c =>
          c.hostname?.toLowerCase() === hostname.toLowerCase()
        ) || null
        cameraMap[hostname] = { camera: matchingCamera, scenarios: [] }
      }
      cameraMap[hostname].scenarios.push(scenario)
    })

    return cameraMap
  }

  // Group cameras by park and configuration status
  const groupedCameras = useMemo(() => {
    const configured: { [park: string]: CameraWithScenarios[] } = {}
    const unconfigured: CameraWithScenarios[] = []

    camerasWithScenarios.forEach(camera => {
      // Apply search filter using centralized search utility
      if (!filterCameraDevice(camera, camera.scenarios, searchQuery)) {
        return
      }

      if (!camera.is_configured) {
        unconfigured.push(camera)
      } else {
        const park = camera.park || 'Unknown'
        if (!configured[park]) {
          configured[park] = []
        }
        configured[park].push(camera)
      }
    })

    return { configured, unconfigured }
  }, [camerasWithScenarios, searchQuery])

  // Filter and group the entity data
  const { groupedData, stats } = useMemo(() => {
    const filtered = entityData.filter(record => {
      // Apply type filter
      if (filterType !== 'all' && filterType !== 'devices' && filterType !== 'duplicates' && filterType !== 'unconfigured' && record.record_type !== filterType) {
        return false
      }

      // Apply search filter using centralized search utility
      const linkedScenarios = (record.record_type === 'queue_venue' || record.record_type === 'occupancy_venue')
        ? scenariosByVenueId[record.unique_id] || []
        : []

      return filterEntityRecord(record, searchQuery, linkedScenarios)
    })

    // Group by record_type, then by park
    const grouped: GroupedData = {}
    const recordTypeCounts: Record<string, number> = {}
    const parkCounts: Record<string, number> = {}

    filtered.forEach(record => {
      const type = record.record_type
      const park = record.info.park || 'Unknown'

      if (!grouped[type]) {
        grouped[type] = {}
      }
      if (!grouped[type][park]) {
        grouped[type][park] = []
      }
      grouped[type][park].push(record)

      recordTypeCounts[type] = (recordTypeCounts[type] || 0) + 1
      parkCounts[park] = (parkCounts[park] || 0) + 1
    })

    return {
      groupedData: grouped,
      stats: {
        total: filtered.length,
        byType: recordTypeCounts,
        byPark: parkCounts
      }
    }
  }, [entityData, searchQuery, filterType, scenariosByVenueId])

  // Filter duplicates by search query
  const filteredDuplicateRecords = useMemo(() => {
    if (!searchQuery) return duplicateRecords
    return duplicateRecords.filter(group => filterDuplicateGroup(group, searchQuery))
  }, [duplicateRecords, searchQuery])

  // Filter unconfigured scenarios by search query
  const filteredUnconfiguredScenarios = useMemo(() => {
    if (!searchQuery) return unconfiguredScenarios
    return unconfiguredScenarios.filter(item => filterUnconfiguredScenario(item, searchQuery))
  }, [unconfiguredScenarios, searchQuery])

  return {
    totalCounts,
    duplicateRecords,
    filteredDuplicateRecords,
    unconfiguredScenarios,
    filteredUnconfiguredScenarios,
    camerasWithScenarios,
    scenariosByVenueId,
    groupedCameras,
    groupedData,
    stats,
    getScenariosGroupedByCamera
  }
}
