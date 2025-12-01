import { useContext, useState, useMemo } from 'preact/hooks'
import { WidgetContext, EntityRecord, CameraDevice } from '../WidgetView'
import './EntityDataDashboard.css'

type RecordType = 'camera_scenario' | 'queue_venue' | 'occupancy_venue'
type FilterType = 'all' | RecordType | 'devices' | 'duplicates'

interface GroupedData {
  [recordType: string]: {
    [park: string]: EntityRecord[]
  }
}

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  camera_scenario: 'Camera Scenarios',
  queue_venue: 'Queue Venues',
  occupancy_venue: 'Occupancy Venues'
}

const RECORD_TYPE_ICONS: Record<RecordType, string> = {
  camera_scenario: 'CAM',
  queue_venue: 'QUEUE',
  occupancy_venue: 'OCC'
}

// Interface for camera with matched scenarios
interface CameraWithScenarios extends CameraDevice {
  scenarios: EntityRecord[]
}

const EntityDataDashboard = () => {
  const { entityData, cameraDevices, isLoading, lastUpdate } = useContext(WidgetContext)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['camera_scenario', 'queue_venue', 'occupancy_venue', 'devices']))
  const [expandedParks, setExpandedParks] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

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

    // Filter to only keys with more than one record (duplicates)
    const duplicates: { key: string; hostname: string; uniqueId: string; records: EntityRecord[] }[] = []

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
    const cameraMap: Record<string, { camera: CameraDevice | null, scenarios: EntityRecord[] }> = {}

    scenarios.forEach(scenario => {
      const hostname = scenario.info.camera_hostname || 'Unknown Camera'
      if (!cameraMap[hostname]) {
        // Find matching camera device
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
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchableText = [
          camera.name,
          camera.hostname,
          camera.park,
          camera.ip_address,
          ...camera.scenarios.map(s => s.name)
        ].filter(Boolean).join(' ').toLowerCase()

        if (!searchableText.includes(query)) {
          return
        }
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

  // Filter and group the data
  const { groupedData, stats } = useMemo(() => {
    const filtered = entityData.filter(record => {
      // Apply type filter
      if (filterType !== 'all' && record.record_type !== filterType) {
        return false
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()

        // Base searchable fields
        const baseFields = [
          record.name,
          record.unique_id,
          record.info.park,
          record.info.camera_hostname,
          record.info.camera_friendly_name,
          record.info.camera_device_id,
          record.info.scenario_type,
          record.info.venue_type,
          record.settings.venue_id,
          record.settings.venue_type,
          record.settings.direction,
          record.device_ip
        ]

        // For queue/occupancy venues, also search linked camera and scenario names
        let linkedFields: string[] = []
        if (record.record_type === 'queue_venue' || record.record_type === 'occupancy_venue') {
          const linkedScenarios = scenariosByVenueId[record.unique_id] || []
          linkedScenarios.forEach(scenario => {
            linkedFields.push(scenario.name)
            linkedFields.push(scenario.info.camera_hostname || '')
            linkedFields.push(scenario.info.camera_friendly_name || '')
            linkedFields.push(scenario.info.camera_device_id || '')
          })
        }

        const searchableText = [...baseFields, ...linkedFields]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return searchableText.includes(query)
      }

      return true
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
  }, [entityData, searchQuery, filterType])

  const toggleType = (type: string) => {
    const newExpanded = new Set(expandedTypes)
    if (newExpanded.has(type)) {
      newExpanded.delete(type)
    } else {
      newExpanded.add(type)
    }
    setExpandedTypes(newExpanded)
  }

  const togglePark = (typeAndPark: string) => {
    const newExpanded = new Set(expandedParks)
    if (newExpanded.has(typeAndPark)) {
      newExpanded.delete(typeAndPark)
    } else {
      newExpanded.add(typeAndPark)
    }
    setExpandedParks(newExpanded)
  }

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const expandAll = () => {
    const allTypes = new Set(Object.keys(groupedData))
    const allParks = new Set<string>()
    const allItems = new Set<string>()

    // Expand entity records
    Object.entries(groupedData).forEach(([type, parks]) => {
      Object.entries(parks).forEach(([park, records]) => {
        allParks.add(`${type}_${park}`)
        records.forEach(record => allItems.add(record.id))
      })
    })

    // Expand devices
    allTypes.add('devices_configured')
    allTypes.add('devices_unconfigured')

    Object.keys(groupedCameras.configured).forEach(park => {
      allParks.add(`devices_${park}`)
      groupedCameras.configured[park].forEach(camera => allItems.add(camera.id))
    })

    groupedCameras.unconfigured.forEach(camera => allItems.add(camera.id))

    setExpandedTypes(allTypes)
    setExpandedParks(allParks)
    setExpandedItems(allItems)
  }

  const collapseAll = () => {
    setExpandedTypes(new Set())
    setExpandedParks(new Set())
    setExpandedItems(new Set())
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A'
    return num.toLocaleString()
  }

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(text)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const renderCameraScenarioDetails = (record: EntityRecord) => (
    <div className="record-details">
      <div className="details-section">
        <h4>Camera Info</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Device ID</span>
            <span className="detail-value">{record.info.camera_device_id || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Hostname</span>
            <span className="detail-value">{record.info.camera_hostname || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Friendly Name</span>
            <span className="detail-value">{record.info.camera_friendly_name || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Camera Type</span>
            <span className="detail-value">{record.info.camera_type || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Scenario Type</span>
            <span className="detail-value scenario-type">{record.info.scenario_type || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Scenario ID</span>
            <span className="detail-value">{record.info.scenario_identifier || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Settings</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Configured</span>
            <span className={`detail-value badge ${record.settings.configured ? 'badge-success' : 'badge-warning'}`}>
              {record.settings.configured ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Direction</span>
            <span className={`detail-value ${record.settings.direction ? 'direction-' + record.settings.direction : ''}`}>
              {record.settings.direction || 'N/A'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Venue ID</span>
            <span className="detail-value">{record.settings.venue_id || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Venue Type</span>
            <span className="detail-value">{record.settings.venue_type || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Metrics</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Last Crossline Count</span>
            <span className="detail-value metric-value">{formatNumber(record.metrics.last_crossline_count)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Crossline Update</span>
            <span className="detail-value">{formatDate(record.metrics.last_crossline_update)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Trigger Count</span>
            <span className="detail-value">{formatNumber(record.metrics.trigger_count)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Reset</span>
            <span className="detail-value">{formatDate(record.metrics.last_reset)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Daily Reset</span>
            <span className={`detail-value badge ${record.metrics.daily_reset_performed ? 'badge-success' : 'badge-neutral'}`}>
              {record.metrics.daily_reset_performed ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Midnight Reset</span>
            <span className={`detail-value badge ${record.metrics.midnight_reset_detected ? 'badge-success' : 'badge-neutral'}`}>
              {record.metrics.midnight_reset_detected ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderQueueVenueDetails = (record: EntityRecord) => (
    <div className="record-details">
      <div className="details-section">
        <h4>Venue Info</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Venue Type</span>
            <span className="detail-value">{record.info.venue_type || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Active</span>
            <span className={`detail-value badge ${record.info.active ? 'badge-success' : 'badge-danger'}`}>
              {record.info.active ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Device ID</span>
            <span className="detail-value small-text">{record.info.device_id || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Current Status</h4>
        <div className="metric-cards">
          <div className="metric-card queue">
            <div className="metric-icon">Q</div>
            <div className="metric-info">
              <span className="metric-label">Current Queue</span>
              <span className="metric-number">{formatNumber(record.metrics.current_queue)}</span>
            </div>
          </div>
          <div className="metric-card wait">
            <div className="metric-icon">W</div>
            <div className="metric-info">
              <span className="metric-label">Wait Time</span>
              <span className="metric-number">{record.metrics.current_wait ?? 'N/A'} min</span>
            </div>
          </div>
          <div className="metric-card throughput">
            <div className="metric-icon">T</div>
            <div className="metric-info">
              <span className="metric-label">Throughput</span>
              <span className="metric-number">{record.metrics.throughput ?? 'N/A'}/min</span>
            </div>
          </div>
          <div className="metric-card confidence">
            <div className="metric-icon">C</div>
            <div className="metric-info">
              <span className="metric-label">Confidence</span>
              <span className="metric-number">{record.metrics.confidence !== undefined ? `${Math.round(record.metrics.confidence * 100)}%` : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Today's Metrics</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Total Entries</span>
            <span className="detail-value metric-value">{formatNumber(record.metrics.total_entries)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Total Exits</span>
            <span className="detail-value metric-value">{formatNumber(record.metrics.total_exits)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Rejected Exits</span>
            <span className="detail-value">{formatNumber(record.metrics.rejected_exits)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Peak Today</span>
            <span className="detail-value">{formatNumber(record.metrics.peak_today)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Peak Time</span>
            <span className="detail-value">{formatDate(record.metrics.peak_time)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Event</span>
            <span className="detail-value">{formatDate(record.metrics.last_event)}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Yesterday's Summary</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Entries</span>
            <span className="detail-value">{formatNumber(record.metrics.yesterday_entries)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Exits</span>
            <span className="detail-value">{formatNumber(record.metrics.yesterday_exits)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Final Queue</span>
            <span className="detail-value">{formatNumber(record.metrics.yesterday_final_queue)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Max Queue</span>
            <span className="detail-value">{formatNumber(record.metrics.yesterday_max_queue)}</span>
          </div>
        </div>
      </div>

      {record.metrics.force_reset && (
        <div className="details-section alert-section">
          <h4>Drift Alert</h4>
          <div className="alert-message">
            <span className="alert-icon">!</span>
            <span>{record.metrics.force_reset_reason}</span>
          </div>
        </div>
      )}

      <div className="details-section">
        <h4>Settings</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Max Wait</span>
            <span className="detail-value">{record.settings.max_wait} min</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Smoothing Factor</span>
            <span className="detail-value">{record.settings.smoothing_factor}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Round To</span>
            <span className="detail-value">{record.settings.round_to_nearest} min</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Min Exits for Calc</span>
            <span className="detail-value">{record.settings.min_exits_for_calculation}</span>
          </div>
        </div>
      </div>

      {renderLinkedCamerasAndScenarios(record.unique_id)}
    </div>
  )

  const renderOccupancyVenueDetails = (record: EntityRecord) => (
    <div className="record-details">
      <div className="details-section">
        <h4>Venue Info</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Venue Type</span>
            <span className="detail-value">{record.info.venue_type || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Active</span>
            <span className={`detail-value badge ${record.info.active ? 'badge-success' : 'badge-danger'}`}>
              {record.info.active ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Device ID</span>
            <span className="detail-value small-text">{record.info.device_id || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Current Status</h4>
        <div className="metric-cards">
          <div className="metric-card occupancy">
            <div className="metric-icon">O</div>
            <div className="metric-info">
              <span className="metric-label">Current Occupancy</span>
              <span className="metric-number large">{formatNumber(record.metrics.current_occupancy)}</span>
            </div>
          </div>
          <div className="metric-card entries">
            <div className="metric-icon">E</div>
            <div className="metric-info">
              <span className="metric-label">Total Entries</span>
              <span className="metric-number">{formatNumber(record.metrics.total_entries)}</span>
            </div>
          </div>
          <div className="metric-card exits">
            <div className="metric-icon">X</div>
            <div className="metric-info">
              <span className="metric-label">Total Exits</span>
              <span className="metric-number">{formatNumber(record.metrics.total_exits)}</span>
            </div>
          </div>
          <div className="metric-card peak">
            <div className="metric-icon">P</div>
            <div className="metric-info">
              <span className="metric-label">Peak Today</span>
              <span className="metric-number">{formatNumber(record.metrics.peak_today)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Today's Metrics</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Peak Time</span>
            <span className="detail-value">{formatDate(record.metrics.peak_time)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Event</span>
            <span className="detail-value">{formatDate(record.metrics.last_event)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Update</span>
            <span className="detail-value">{formatDate(record.metrics.last_update)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Reset</span>
            <span className="detail-value">{formatDate(record.metrics.last_reset)}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Yesterday's Summary</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Entries</span>
            <span className="detail-value">{formatNumber(record.metrics.yesterday_entries)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Exits</span>
            <span className="detail-value">{formatNumber(record.metrics.yesterday_exits)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Final Count</span>
            <span className="detail-value">{formatNumber(record.metrics.yesterday_final_count)}</span>
          </div>
        </div>
      </div>

      {record.metrics.force_reset && (
        <div className="details-section alert-section">
          <h4>Drift Alert</h4>
          <div className="alert-message">
            <span className="alert-icon">!</span>
            <span>{record.metrics.force_reset_reason}</span>
          </div>
        </div>
      )}

      <div className="details-section">
        <h4>Settings</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Max Capacity</span>
            <span className="detail-value">{record.settings.max_capacity ?? 'Not set'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Warning Threshold</span>
            <span className="detail-value">{record.settings.warning_threshold}%</span>
          </div>
        </div>
      </div>

      {renderLinkedCamerasAndScenarios(record.unique_id)}
    </div>
  )

  // Render linked cameras and scenarios for a venue
  const renderLinkedCamerasAndScenarios = (venueId: string) => {
    const cameraGroups = getScenariosGroupedByCamera(venueId)
    const hostnames = Object.keys(cameraGroups)

    if (hostnames.length === 0) {
      return (
        <div className="details-section">
          <h4>Linked Cameras & Scenarios</h4>
          <p className="no-scenarios">No scenarios linked to this venue</p>
        </div>
      )
    }

    return (
      <div className="details-section">
        <h4>Linked Cameras & Scenarios ({hostnames.length} camera{hostnames.length !== 1 ? 's' : ''})</h4>
        <div className="linked-cameras-list">
          {hostnames.sort().map(hostname => {
            const { camera, scenarios } = cameraGroups[hostname]
            return (
              <div key={hostname} className="linked-camera-group">
                <div className="linked-camera-header">
                  <span className="camera-icon">📷</span>
                  <div className="camera-info">
                    <span className="camera-name">{camera?.name || hostname}</span>
                    {camera && (
                      <span className={`camera-type-badge ${camera.device_type}`}>
                        {camera.device_type}
                      </span>
                    )}
                  </div>
                  <span className="scenario-count">{scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="linked-scenarios">
                  {scenarios.map(scenario => (
                    <div key={scenario.id} className="linked-scenario-item">
                      <div className="scenario-info">
                        <span className="scenario-name">{scenario.name}</span>
                        <div className="scenario-badges">
                          <span className={`scenario-type-badge ${scenario.info.scenario_type === 'CrosslineCounting' ? 'crossline' : 'occupancy'}`}>
                            {scenario.info.scenario_type === 'CrosslineCounting' ? 'Crossline' : 'OIA'}
                          </span>
                          {scenario.settings.direction && (
                            <span className={`direction-badge direction-${scenario.settings.direction}`}>
                              {scenario.settings.direction}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="scenario-metric">
                        {scenario.metrics.last_crossline_count !== undefined && (
                          <span className="count-value">
                            {formatNumber(scenario.metrics.last_crossline_count)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderCameraDeviceDetails = (camera: CameraWithScenarios) => (
    <div className="record-details">
      <div className="details-section">
        <h4>Device Info</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Device Type</span>
            <span className={`detail-value badge ${camera.is_configured ? 'badge-success' : 'badge-warning'}`}>
              {camera.device_type}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Hostname</span>
            <span className="detail-value">{camera.hostname || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">IP Address</span>
            <span className="detail-value">{camera.ip_address || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Park</span>
            <span className="detail-value">{camera.park || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className={`detail-value badge ${camera.is_configured ? 'badge-success' : 'badge-warning'}`}>
              {camera.is_configured ? 'Configured' : 'Unconfigured'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Input</span>
            <span className="detail-value">{formatDate(camera.last_input)}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Scenarios ({camera.scenarios.length})</h4>
        {camera.scenarios.length === 0 ? (
          <p className="no-scenarios">No scenarios configured for this camera</p>
        ) : (
          <div className="scenario-list">
            {camera.scenarios.map(scenario => (
              <div key={scenario.id} className="scenario-item">
                <div className="scenario-header">
                  <span className="scenario-name">{scenario.name}</span>
                  <span className={`scenario-type badge ${scenario.info.scenario_type === 'CrosslineCounting' ? 'badge-info' : 'badge-neutral'}`}>
                    {scenario.info.scenario_type}
                  </span>
                </div>
                <div className="scenario-details">
                  {scenario.settings.direction && (
                    <span className={`direction-badge direction-${scenario.settings.direction}`}>
                      {scenario.settings.direction}
                    </span>
                  )}
                  {scenario.settings.venue_id && (
                    <span className="venue-badge">
                      {scenario.settings.venue_type}: {scenario.settings.venue_id}
                    </span>
                  )}
                  {scenario.metrics.last_crossline_count !== undefined && (
                    <span className="count-badge">
                      Count: {formatNumber(scenario.metrics.last_crossline_count)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="details-section metadata-section">
        <h4>Device Metadata</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Device ID</span>
            <span className="detail-value small-text">{camera.id}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Created</span>
            <span className="detail-value">{formatDate(camera.created_at)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Updated</span>
            <span className="detail-value">{formatDate(camera.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderRecordSummary = (record: EntityRecord) => {
    switch (record.record_type) {
      case 'camera_scenario':
        return (
          <div className="record-summary">
            <span className="summary-item">
              <span className="summary-label">Type:</span> {record.info.scenario_type}
            </span>
            {record.settings.direction && (
              <span className={`summary-item direction direction-${record.settings.direction}`}>
                {record.settings.direction}
              </span>
            )}
            {record.metrics.last_crossline_count !== undefined && record.metrics.last_crossline_count > 0 && (
              <span className="summary-item">
                <span className="summary-label">Count:</span> {formatNumber(record.metrics.last_crossline_count)}
              </span>
            )}
          </div>
        )
      case 'queue_venue':
        return (
          <div className="record-summary">
            <span className="summary-item highlight-queue">
              <span className="summary-label">Queue:</span> {formatNumber(record.metrics.current_queue)}
            </span>
            <span className="summary-item highlight-wait">
              <span className="summary-label">Wait:</span> {record.metrics.current_wait ?? 0} min
            </span>
            <span className="summary-item">
              <span className="summary-label">Entries:</span> {formatNumber(record.metrics.total_entries)}
            </span>
          </div>
        )
      case 'occupancy_venue':
        return (
          <div className="record-summary">
            <span className="summary-item highlight-occupancy">
              <span className="summary-label">Occupancy:</span> {formatNumber(record.metrics.current_occupancy)}
            </span>
            <span className="summary-item">
              <span className="summary-label">Peak:</span> {formatNumber(record.metrics.peak_today)}
            </span>
            <span className="summary-item">
              <span className="summary-label">In/Out:</span> {formatNumber(record.metrics.total_entries)}/{formatNumber(record.metrics.total_exits)}
            </span>
          </div>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="entity-dashboard loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading Entity Data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="entity-dashboard">
      <header className="dashboard-header">
        <h1>UDX GSLM Camera Config Explorer</h1>
        <p className="header-subtitle">
          {lastUpdate && ` Updated ${lastUpdate.toLocaleString()}`}
        </p>
      </header>

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <h3 className="sidebar-title">Filters</h3>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All ({entityData.length})
              </button>
              <button
                className={`filter-btn filter-camera ${filterType === 'camera_scenario' ? 'active' : ''}`}
                onClick={() => setFilterType('camera_scenario')}
              >
                Cameras ({totalCounts.camera_scenario || 0})
              </button>
              <button
                className={`filter-btn filter-queue ${filterType === 'queue_venue' ? 'active' : ''}`}
                onClick={() => setFilterType('queue_venue')}
              >
                Queues ({totalCounts.queue_venue || 0})
              </button>
              <button
                className={`filter-btn filter-occupancy ${filterType === 'occupancy_venue' ? 'active' : ''}`}
                onClick={() => setFilterType('occupancy_venue')}
              >
                Occupancy ({totalCounts.occupancy_venue || 0})
              </button>
              <button
                className={`filter-btn filter-devices ${filterType === 'devices' ? 'active' : ''}`}
                onClick={() => setFilterType('devices')}
              >
                Devices ({totalCounts.devices || 0})
              </button>
              {duplicateRecords.length > 0 && (
                <button
                  className={`filter-btn filter-duplicates ${filterType === 'duplicates' ? 'active' : ''}`}
                  onClick={() => setFilterType('duplicates')}
                >
                  Duplicates ({duplicateRecords.reduce((sum, d) => sum + d.records.length, 0)})
                </button>
              )}
            </div>

            <div className="sidebar-divider"></div>

            <h3 className="sidebar-title">View</h3>
            <div className="expand-controls">
              <button className="expand-btn" onClick={expandAll}>Expand All</button>
              <button className="expand-btn" onClick={collapseAll}>Collapse All</button>
            </div>
          </div>
        </aside>

        <main className="dashboard-main">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, park, hostname..."
              value={searchQuery}
              onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                x
              </button>
            )}
          </div>

          <div className="dashboard-body">
            {/* Duplicates View */}
            {filterType === 'duplicates' && (
              <div className="duplicates-section">
                <div className="duplicates-header">
                  <h2>Duplicate Records</h2>
                  <p className="duplicates-description">
                    Records with the same camera_hostname AND unique_id.
                    Click an ID to copy it for deletion in the entity.
                  </p>
                </div>

                {duplicateRecords.length === 0 ? (
                  <div className="no-results">
                    <p>No duplicate records found.</p>
                  </div>
                ) : (
                  <div className="duplicate-groups">
                    {duplicateRecords.map((dupGroup, index) => (
                      <div key={dupGroup.key} className="duplicate-group">
                        <div className="duplicate-group-header">
                          <span className="dup-index">#{index + 1}</span>
                          <div className="dup-key-info">
                            <div className="dup-field">
                              <span className="dup-label">Hostname:</span>
                              <span className="dup-value">{dupGroup.hostname}</span>
                            </div>
                            <div className="dup-field">
                              <span className="dup-label">Unique ID:</span>
                              <span className="dup-value">{dupGroup.uniqueId}</span>
                            </div>
                          </div>
                          <span className="dup-count">{dupGroup.records.length} records</span>
                        </div>

                        <div className="duplicate-records-list">
                          <table className="dup-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Record Type</th>
                                <th>Created At</th>
                                <th>Record ID (click to copy)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dupGroup.records.map((record, recIndex) => (
                                <tr key={record.id} className={recIndex === 0 ? 'original' : 'duplicate'}>
                                  <td className="rec-index">
                                    {recIndex === 0 ? (
                                      <span className="badge badge-success">Keep</span>
                                    ) : (
                                      <span className="badge badge-danger">Dup</span>
                                    )}
                                  </td>
                                  <td className="rec-name">{record.name}</td>
                                  <td className="rec-type">
                                    <span className={`type-badge-small ${record.record_type}`}>
                                      {RECORD_TYPE_ICONS[record.record_type as RecordType] || '?'}
                                    </span>
                                  </td>
                                  <td className="rec-date">{formatDate(record.created_at)}</td>
                                  <td className="rec-id">
                                    <button
                                      className={`copy-id-btn ${copiedId === record.id ? 'copied' : ''}`}
                                      onClick={() => copyToClipboard(record.id)}
                                      title="Click to copy"
                                    >
                                      {copiedId === record.id ? 'Copied!' : record.id}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="duplicates-summary">
                  <p>
                    <strong>Total duplicate groups:</strong> {duplicateRecords.length}
                    {' | '}
                    <strong>Total duplicate records:</strong> {duplicateRecords.reduce((sum, d) => sum + d.records.length, 0)}
                    {' | '}
                    <strong>Records to delete:</strong> {duplicateRecords.reduce((sum, d) => sum + d.records.length - 1, 0)}
                  </p>
                </div>
              </div>
            )}

            {/* Devices View */}
            {filterType === 'devices' && (
              <>
                {/* Configured Cameras by Park */}
                {Object.keys(groupedCameras.configured).length > 0 && (
                  <div className="type-group type-devices">
                    <div
                      className="type-header"
                      onClick={() => toggleType('devices_configured')}
                    >
                      <span className="expand-icon">{expandedTypes.has('devices_configured') ? '-' : '+'}</span>
                      <span className="type-badge">DEV</span>
                      <h2>Configured Cameras</h2>
                      <span className="type-count">
                        {Object.values(groupedCameras.configured).flat().length}
                      </span>
                    </div>

                    {expandedTypes.has('devices_configured') && (
                      <div className="type-content">
                        {Object.entries(groupedCameras.configured).sort(([a], [b]) => a.localeCompare(b)).map(([park, cameras]) => {
                          const parkKey = `devices_${park}`
                          const isParkExpanded = expandedParks.has(parkKey)

                          return (
                            <div key={parkKey} className="park-group">
                              <div
                                className="park-header"
                                onClick={() => togglePark(parkKey)}
                              >
                                <span className="expand-icon">{isParkExpanded ? '-' : '+'}</span>
                                <h3>{park}</h3>
                                <span className="park-count">{cameras.length}</span>
                              </div>

                              {isParkExpanded && (
                                <div className="park-content">
                                  {cameras.sort((a, b) => a.name.localeCompare(b.name)).map(camera => {
                                    const isItemExpanded = expandedItems.has(camera.id)

                                    return (
                                      <div key={camera.id} className={`record-item ${isItemExpanded ? 'expanded' : ''}`}>
                                        <div
                                          className="record-header"
                                          onClick={() => toggleItem(camera.id)}
                                        >
                                          <span className="expand-icon">{isItemExpanded ? '-' : '+'}</span>
                                          <div className="record-title">
                                            <span className="record-name">{camera.name}</span>
                                            <span className="record-id">{camera.hostname}</span>
                                          </div>
                                          <div className="record-summary">
                                            <span className="summary-item">
                                              <span className="summary-label">Scenarios:</span> {camera.scenarios.length}
                                            </span>
                                            <span className={`summary-item badge ${camera.device_type === 'axis-camera' ? 'badge-info' : 'badge-neutral'}`}>
                                              {camera.device_type}
                                            </span>
                                          </div>
                                        </div>

                                        {isItemExpanded && (
                                          <div className="record-content">
                                            {renderCameraDeviceDetails(camera)}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Unconfigured Cameras */}
                {groupedCameras.unconfigured.length > 0 && (
                  <div className="type-group type-unconfigured">
                    <div
                      className="type-header"
                      onClick={() => toggleType('devices_unconfigured')}
                    >
                      <span className="expand-icon">{expandedTypes.has('devices_unconfigured') ? '-' : '+'}</span>
                      <span className="type-badge warning">!</span>
                      <h2>Unconfigured Cameras</h2>
                      <span className="type-count">{groupedCameras.unconfigured.length}</span>
                    </div>

                    {expandedTypes.has('devices_unconfigured') && (
                      <div className="type-content">
                        <div className="park-content">
                          {groupedCameras.unconfigured.sort((a, b) => a.name.localeCompare(b.name)).map(camera => {
                            const isItemExpanded = expandedItems.has(camera.id)

                            return (
                              <div key={camera.id} className={`record-item ${isItemExpanded ? 'expanded' : ''}`}>
                                <div
                                  className="record-header"
                                  onClick={() => toggleItem(camera.id)}
                                >
                                  <span className="expand-icon">{isItemExpanded ? '-' : '+'}</span>
                                  <div className="record-title">
                                    <span className="record-name">{camera.name}</span>
                                    <span className="record-id">{camera.hostname || 'No hostname'}</span>
                                  </div>
                                  <div className="record-summary">
                                    <span className="summary-item badge badge-warning">Unconfigured</span>
                                    <span className="summary-item">
                                      <span className="summary-label">Scenarios:</span> {camera.scenarios.length}
                                    </span>
                                  </div>
                                </div>

                                {isItemExpanded && (
                                  <div className="record-content">
                                    {renderCameraDeviceDetails(camera)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {Object.keys(groupedCameras.configured).length === 0 && groupedCameras.unconfigured.length === 0 && (
                  <div className="no-results">
                    <p>No camera devices found.</p>
                  </div>
                )}
              </>
            )}

            {/* Entity Records View */}
            {filterType !== 'devices' && filterType !== 'duplicates' && Object.entries(groupedData).map(([recordType, parks]) => {
              const typeKey = recordType as RecordType
              const isTypeExpanded = expandedTypes.has(recordType)
              const typeCount = Object.values(parks).flat().length

              return (
                <div key={recordType} className={`type-group type-${recordType}`}>
                  <div
                    className="type-header"
                    onClick={() => toggleType(recordType)}
                  >
                    <span className="expand-icon">{isTypeExpanded ? '-' : '+'}</span>
                    <span className="type-badge">{RECORD_TYPE_ICONS[typeKey]}</span>
                    <h2>{RECORD_TYPE_LABELS[typeKey]}</h2>
                    <span className="type-count">{typeCount}</span>
                  </div>

                  {isTypeExpanded && (
                    <div className="type-content">
                      {Object.entries(parks).sort(([a], [b]) => a.localeCompare(b)).map(([park, records]) => {
                        const parkKey = `${recordType}_${park}`
                        const isParkExpanded = expandedParks.has(parkKey)

                        return (
                          <div key={parkKey} className="park-group">
                            <div
                              className="park-header"
                              onClick={() => togglePark(parkKey)}
                            >
                              <span className="expand-icon">{isParkExpanded ? '-' : '+'}</span>
                              <h3>{park}</h3>
                              <span className="park-count">{records.length}</span>
                            </div>

                            {isParkExpanded && (
                              <div className="park-content">
                                {records.sort((a, b) => a.name.localeCompare(b.name)).map(record => {
                                  const isItemExpanded = expandedItems.has(record.id)

                                  return (
                                    <div key={record.id} className={`record-item ${isItemExpanded ? 'expanded' : ''}`}>
                                      <div
                                        className="record-header"
                                        onClick={() => toggleItem(record.id)}
                                      >
                                        <span className="expand-icon">{isItemExpanded ? '-' : '+'}</span>
                                        <div className="record-title">
                                          <span className="record-name">{record.name}</span>
                                          <span className="record-id">{record.unique_id}</span>
                                        </div>
                                        {renderRecordSummary(record)}
                                      </div>

                                      {isItemExpanded && (
                                        <div className="record-content">
                                          {record.record_type === 'camera_scenario' && renderCameraScenarioDetails(record)}
                                          {record.record_type === 'queue_venue' && renderQueueVenueDetails(record)}
                                          {record.record_type === 'occupancy_venue' && renderOccupancyVenueDetails(record)}

                                          <div className="details-section metadata-section">
                                            <h4>Record Metadata</h4>
                                            <div className="detail-grid">
                                              <div className="detail-item">
                                                <span className="detail-label">Record ID</span>
                                                <span className="detail-value small-text">{record.id}</span>
                                              </div>
                                              <div className="detail-item">
                                                <span className="detail-label">Created</span>
                                                <span className="detail-value">{formatDate(record.created_at)}</span>
                                              </div>
                                              <div className="detail-item">
                                                <span className="detail-label">Updated</span>
                                                <span className="detail-value">{formatDate(record.updated_at)}</span>
                                              </div>
                                              {record.device_ip && (
                                                <div className="detail-item">
                                                  <span className="detail-label">Device IP</span>
                                                  <span className="detail-value">{record.device_ip}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {filterType !== 'devices' && filterType !== 'duplicates' && stats.total === 0 && (
              <div className="no-results">
                <p>No records found matching your criteria.</p>
                {searchQuery && (
                  <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <footer className="dashboard-footer">
        <span>UDX GSLM Camera Config Explorer v1.0.0</span>
        <span>Made by Sam Stanton UC - PWS</span>
      </footer>
    </div>
  )
}

export default EntityDataDashboard
