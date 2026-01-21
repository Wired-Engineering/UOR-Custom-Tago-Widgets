import { useContext, useState } from 'preact/hooks'
import { WidgetContext } from '../WidgetView'
import { version } from '../../package.json'
import { useDashboardData } from '../hooks/useDashboardData'
import { useExpandState } from '../hooks/useExpandState'
import { CollapsibleGroup, CollapsiblePark, CollapsibleItem } from './CollapsibleGroup'
import {
  CameraScenarioDetails,
  RecordMetadata,
  RecordSummary
} from './RecordDetails'
import { CameraDeviceDetails, CameraDeviceSummary } from './CameraDeviceCard'
import { FilterType, RecordType, RECORD_TYPE_LABELS, RECORD_TYPE_ICONS, UnconfiguredScenario, VenueGroup } from '../types/dashboard'
import './EntityDataDashboard.css'

const EntityDataDashboard = () => {
  const { entityData, cameraDevices, isLoading, lastUpdate } = useContext(WidgetContext)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const {
    totalCounts,
    duplicateRecords,
    filteredDuplicateRecords,
    unconfiguredScenarios,
    filteredUnconfiguredScenarios,
    groupedCameras,
    groupedData,
    stats,
    filteredVenueGroups,
    getScenariosGroupedByCamera
  } = useDashboardData({ entityData, cameraDevices, searchQuery, filterType })

  const {
    toggleType,
    togglePark,
    toggleItem,
    expandAll,
    collapseAll,
    isTypeExpanded,
    isParkExpanded,
    isItemExpanded
  } = useExpandState()

  const copyToClipboard = (text: string) => {
    // Use execCommand fallback which works better in iframes
    const textArea = document.createElement('textarea')
    textArea.value = text
    // Avoid scrolling to bottom
    textArea.style.position = 'fixed'
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.width = '2em'
    textArea.style.height = '2em'
    textArea.style.padding = '0'
    textArea.style.border = 'none'
    textArea.style.outline = 'none'
    textArea.style.boxShadow = 'none'
    textArea.style.background = 'transparent'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      const successful = document.execCommand('copy')
      if (successful) {
        setCopiedId(text)
        setTimeout(() => setCopiedId(null), 2000)
      }
    } catch (err) {
      console.error('Failed to copy text:', err)
    }

    document.body.removeChild(textArea)
  }

  const handleExpandAll = () => expandAll(groupedData, groupedCameras)

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

  const configuredCameraCount = Object.values(groupedCameras.configured).flat().length
  const unconfiguredCameraCount = groupedCameras.unconfigured.length
  const hasNoResults = filterType !== 'devices' && filterType !== 'duplicates' && filterType !== 'unconfigured' &&
    stats.total === 0 && configuredCameraCount === 0 && unconfiguredCameraCount === 0

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
                All ({entityData.length + cameraDevices.length})
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
              {duplicateRecords?.length > 0 && (
                <button
                  className={`filter-btn filter-duplicates ${filterType === 'duplicates' ? 'active' : ''}`}
                  onClick={() => setFilterType('duplicates')}
                >
                  Duplicates ({duplicateRecords.reduce((sum, d) => sum + d.records.length, 0)})
                </button>
              )}
              {unconfiguredScenarios?.length > 0 && (
                <button
                  className={`filter-btn filter-unconfigured ${filterType === 'unconfigured' ? 'active' : ''}`}
                  onClick={() => setFilterType('unconfigured')}
                >
                  Unconfigured ({unconfiguredScenarios.length})
                </button>
              )}
            </div>

            <div className="sidebar-divider"></div>

            <h3 className="sidebar-title">View</h3>
            <div className="expand-controls">
              <button className="expand-btn" onClick={handleExpandAll}>Expand All</button>
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
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
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
              <DuplicatesView
                duplicateRecords={filteredDuplicateRecords}
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
            )}

            {/* Unconfigured Scenarios View */}
            {filterType === 'unconfigured' && (
              <UnconfiguredView
                unconfiguredScenarios={filteredUnconfiguredScenarios}
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
            )}

            {/* Devices View */}
            {filterType === 'devices' && (
              <DevicesView
                groupedCameras={groupedCameras}
                isTypeExpanded={isTypeExpanded}
                isParkExpanded={isParkExpanded}
                isItemExpanded={isItemExpanded}
                toggleType={toggleType}
                togglePark={togglePark}
                toggleItem={toggleItem}
              />
            )}

            {/* Queue Venues View */}
            {filterType === 'queue_venue' && (
              <VenueGroupsView
                venueGroups={filteredVenueGroups.queue}
                venueType="queue"
                isTypeExpanded={isTypeExpanded}
                isParkExpanded={isParkExpanded}
                isItemExpanded={isItemExpanded}
                toggleType={toggleType}
                togglePark={togglePark}
                toggleItem={toggleItem}
                getScenariosGroupedByCamera={getScenariosGroupedByCamera}
              />
            )}

            {/* Occupancy Venues View */}
            {filterType === 'occupancy_venue' && (
              <VenueGroupsView
                venueGroups={filteredVenueGroups.occupancy}
                venueType="occupancy"
                isTypeExpanded={isTypeExpanded}
                isParkExpanded={isParkExpanded}
                isItemExpanded={isItemExpanded}
                toggleType={toggleType}
                togglePark={togglePark}
                toggleItem={toggleItem}
                getScenariosGroupedByCamera={getScenariosGroupedByCamera}
              />
            )}

            {/* Entity Records View (camera scenarios only in 'all' or 'camera_scenario' filter) */}
            {(filterType === 'all' || filterType === 'camera_scenario') && (
              <>
                {Object.entries(groupedData).map(([recordType, parks]) => (
                  <EntityRecordsSection
                    key={recordType}
                    recordType={recordType as RecordType}
                    parks={parks}
                    isTypeExpanded={isTypeExpanded}
                    isParkExpanded={isParkExpanded}
                    isItemExpanded={isItemExpanded}
                    toggleType={toggleType}
                    togglePark={togglePark}
                    toggleItem={toggleItem}
                    getScenariosGroupedByCamera={getScenariosGroupedByCamera}
                  />
                ))}

                {/* Camera Devices in All View */}
                {filterType === 'all' && (
                  <CamerasInAllView
                    groupedCameras={groupedCameras}
                    isTypeExpanded={isTypeExpanded}
                    isParkExpanded={isParkExpanded}
                    isItemExpanded={isItemExpanded}
                    toggleType={toggleType}
                    togglePark={togglePark}
                    toggleItem={toggleItem}
                  />
                )}
              </>
            )}

            {hasNoResults && (
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
        <span>UDX GSLM Camera Config Explorer v{version}</span>
        <span>Made by Sam Stanton UC - PWS</span>
      </footer>
    </div>
  )
}

// Sub-components for cleaner organization

interface DuplicatesViewProps {
  duplicateRecords: ReturnType<typeof useDashboardData>['duplicateRecords']
  copiedId: string | null
  onCopy: (text: string) => void
}

const DuplicatesView = ({ duplicateRecords, copiedId, onCopy }: DuplicatesViewProps) => (
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
                      <td className="rec-id">
                        <button
                          className={`copy-id-btn ${copiedId === record.id ? 'copied' : ''}`}
                          onClick={() => onCopy(record.id)}
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
)

interface UnconfiguredViewProps {
  unconfiguredScenarios: UnconfiguredScenario[]
  copiedId: string | null
  onCopy: (text: string) => void
}

const UnconfiguredView = ({ unconfiguredScenarios, copiedId, onCopy }: UnconfiguredViewProps) => {
  // Group by hostname for better organization
  const groupedByHostname = unconfiguredScenarios.reduce((acc, item) => {
    const hostname = item.hostname || '(no hostname)'
    if (!acc[hostname]) {
      acc[hostname] = []
    }
    acc[hostname].push(item)
    return acc
  }, {} as Record<string, UnconfiguredScenario[]>)

  return (
    <div className="unconfigured-section">
      <div className="unconfigured-header">
        <h2>Unconfigured Scenarios</h2>
        <p className="unconfigured-description">
          Camera scenarios that have not been configured yet.
          These still have their auto-generated names (name = scenario_identifier).
          Click an ID to copy it.
        </p>
      </div>

      {unconfiguredScenarios.length === 0 ? (
        <div className="no-results">
          <p>No unconfigured scenarios found.</p>
        </div>
      ) : (
        <div className="unconfigured-groups">
          {Object.entries(groupedByHostname).sort(([a], [b]) => a.localeCompare(b)).map(([hostname, items]) => (
            <div key={hostname} className="unconfigured-group">
              <div className="unconfigured-group-header">
                <div className="unconfigured-hostname">
                  <span className="dup-label">Camera:</span>
                  <span className="dup-value">{hostname}</span>
                </div>
                <span className="dup-count">{items.length} scenario{items.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="unconfigured-records-list">
                <table className="dup-table">
                  <thead>
                    <tr>
                      <th>Scenario Name</th>
                      <th>Unique ID</th>
                      <th>Park</th>
                      <th>Record ID (click to copy)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.record.id} className="unconfigured-row">
                        <td className="rec-name">{item.record.name}</td>
                        <td className="rec-unique-id">{item.record.unique_id}</td>
                        <td className="rec-park">{item.record.info.park || '-'}</td>
                        <td className="rec-id">
                          <button
                            className={`copy-id-btn ${copiedId === item.record.id ? 'copied' : ''}`}
                            onClick={() => onCopy(item.record.id)}
                            title="Click to copy"
                          >
                            {copiedId === item.record.id ? 'Copied!' : item.record.id}
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

      <div className="unconfigured-summary">
        <p>
          <strong>Total unconfigured scenarios:</strong> {unconfiguredScenarios.length}
          {' | '}
          <strong>Cameras affected:</strong> {Object.keys(groupedByHostname).length}
        </p>
      </div>
    </div>
  )
}

interface DevicesViewProps {
  groupedCameras: ReturnType<typeof useDashboardData>['groupedCameras']
  isTypeExpanded: (type: string) => boolean
  isParkExpanded: (park: string) => boolean
  isItemExpanded: (id: string) => boolean
  toggleType: (type: string) => void
  togglePark: (park: string) => void
  toggleItem: (id: string) => void
  hideNoResults?: boolean
}

const DevicesView = ({
  groupedCameras,
  isTypeExpanded,
  isParkExpanded,
  isItemExpanded,
  toggleType,
  togglePark,
  toggleItem,
  hideNoResults = false
}: DevicesViewProps) => {
  const configuredCount = Object.values(groupedCameras.configured).flat().length
  const hasConfigured = configuredCount > 0
  const hasUnconfigured = groupedCameras.unconfigured.length > 0

  return (
    <>
      {hasConfigured && (
        <CollapsibleGroup
          title="Configured Cameras"
          count={configuredCount}
          isExpanded={isTypeExpanded('devices_configured')}
          onToggle={() => toggleType('devices_configured')}
          badge="DEV"
          className="type-group type-devices"
        >
          {Object.entries(groupedCameras.configured).sort(([a], [b]) => a.localeCompare(b)).map(([park, cameras]) => {
            const parkKey = `devices_${park}`
            return (
              <CollapsiblePark
                key={parkKey}
                park={park}
                count={cameras.length}
                isExpanded={isParkExpanded(parkKey)}
                onToggle={() => togglePark(parkKey)}
              >
                {cameras.sort((a, b) => a.name.localeCompare(b.name)).map(camera => (
                  <CollapsibleItem
                    key={camera.id}
                    isExpanded={isItemExpanded(camera.id)}
                    onToggle={() => toggleItem(camera.id)}
                    header={
                      <>
                        <div className="record-title">
                          <span className="record-name">{camera.name}</span>
                          <span className="record-id">{camera.hostname}</span>
                        </div>
                        <CameraDeviceSummary camera={camera} />
                      </>
                    }
                  >
                    <CameraDeviceDetails camera={camera} />
                  </CollapsibleItem>
                ))}
              </CollapsiblePark>
            )
          })}
        </CollapsibleGroup>
      )}

      {hasUnconfigured && (
        <CollapsibleGroup
          title="Unconfigured Cameras"
          count={groupedCameras.unconfigured.length}
          isExpanded={isTypeExpanded('devices_unconfigured')}
          onToggle={() => toggleType('devices_unconfigured')}
          badge="!"
          badgeClass="warning"
          className="type-group type-unconfigured"
        >
          <div className="park-content">
            {groupedCameras.unconfigured.sort((a, b) => a.name.localeCompare(b.name)).map(camera => (
              <CollapsibleItem
                key={camera.id}
                isExpanded={isItemExpanded(camera.id)}
                onToggle={() => toggleItem(camera.id)}
                header={
                  <>
                    <div className="record-title">
                      <span className="record-name">{camera.name}</span>
                      <span className="record-id">{camera.hostname || 'No hostname'}</span>
                    </div>
                    <CameraDeviceSummary camera={camera} isUnconfigured />
                  </>
                }
              >
                <CameraDeviceDetails camera={camera} />
              </CollapsibleItem>
            ))}
          </div>
        </CollapsibleGroup>
      )}

      {!hideNoResults && !hasConfigured && !hasUnconfigured && (
        <div className="no-results">
          <p>No camera devices found.</p>
        </div>
      )}
    </>
  )
}

const CamerasInAllView = (props: Omit<DevicesViewProps, 'hideNoResults'>) => (
  <DevicesView {...props} hideNoResults />
)

interface VenueGroupsViewProps {
  venueGroups: VenueGroup[]
  venueType: 'queue' | 'occupancy'
  isTypeExpanded: (type: string) => boolean
  isParkExpanded: (park: string) => boolean
  isItemExpanded: (id: string) => boolean
  toggleType: (type: string) => void
  togglePark: (park: string) => void
  toggleItem: (id: string) => void
  getScenariosGroupedByCamera: (venueId: string) => Record<string, { camera: import('../WidgetView').CameraDevice | null; scenarios: import('../WidgetView').EntityRecord[] }>
}

const VenueGroupsView = ({
  venueGroups,
  venueType,
  isTypeExpanded,
  isParkExpanded,
  isItemExpanded,
  toggleType,
  togglePark,
  toggleItem,
  getScenariosGroupedByCamera
}: VenueGroupsViewProps) => {
  // Group venues by park
  const venuesByPark: Record<string, VenueGroup[]> = {}
  venueGroups.forEach(venue => {
    const park = venue.park || 'Unknown'
    if (!venuesByPark[park]) {
      venuesByPark[park] = []
    }
    venuesByPark[park].push(venue)
  })

  const typeLabel = venueType === 'queue' ? 'Queue Venues' : 'Occupancy Venues'
  const typeIcon = venueType === 'queue' ? 'QUEUE' : 'OCC'
  const typeKey = venueType === 'queue' ? 'queue_venue' : 'occupancy_venue'

  if (venueGroups.length === 0) {
    return (
      <div className="no-results">
        <p>No {typeLabel.toLowerCase()} found.</p>
      </div>
    )
  }

  return (
    <CollapsibleGroup
      title={typeLabel}
      count={venueGroups.length}
      isExpanded={isTypeExpanded(typeKey)}
      onToggle={() => toggleType(typeKey)}
      badge={typeIcon}
      className={`type-group type-${typeKey}`}
    >
      {Object.entries(venuesByPark).sort(([a], [b]) => a.localeCompare(b)).map(([park, venues]) => {
        const parkKey = `${typeKey}_${park}`
        return (
          <CollapsiblePark
            key={parkKey}
            park={park}
            count={venues.length}
            isExpanded={isParkExpanded(parkKey)}
            onToggle={() => togglePark(parkKey)}
          >
            {venues.sort((a, b) => a.venueId.localeCompare(b.venueId)).map(venue => (
              <CollapsibleItem
                key={venue.venueId}
                isExpanded={isItemExpanded(venue.venueId)}
                onToggle={() => toggleItem(venue.venueId)}
                header={
                  <>
                    <div className="record-title">
                      <span className="record-name">{venue.venueId}</span>
                      <span className="record-id">{venue.scenarios.length} scenario{venue.scenarios.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="record-summary">
                      <span className="summary-item">
                        <span className="summary-label">Park:</span> {venue.park}
                      </span>
                    </div>
                  </>
                }
              >
                <VenueGroupDetails
                  venue={venue}
                  getScenariosGroupedByCamera={getScenariosGroupedByCamera}
                />
              </CollapsibleItem>
            ))}
          </CollapsiblePark>
        )
      })}
    </CollapsibleGroup>
  )
}

interface VenueGroupDetailsProps {
  venue: VenueGroup
  getScenariosGroupedByCamera: VenueGroupsViewProps['getScenariosGroupedByCamera']
}

const VenueGroupDetails = ({ venue, getScenariosGroupedByCamera }: VenueGroupDetailsProps) => {
  const cameraGroups = getScenariosGroupedByCamera(venue.venueId)
  const hostnames = Object.keys(cameraGroups)

  return (
    <div className="record-details">
      <div className="details-section">
        <h4>Venue Info</h4>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Venue ID</span>
            <span className="detail-value">{venue.venueId}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Venue Type</span>
            <span className="detail-value">{venue.venueType}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Park</span>
            <span className="detail-value">{venue.park}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Linked Scenarios</span>
            <span className="detail-value">{venue.scenarios.length}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Linked Cameras & Scenarios ({hostnames.length} camera{hostnames.length !== 1 ? 's' : ''})</h4>
        <div className="linked-cameras-list">
          {hostnames.sort().map(hostname => {
            const { camera, scenarios } = cameraGroups[hostname]
            return (
              <div key={hostname} className="linked-camera-group">
                <div className="linked-camera-header">
                  <span className="camera-icon">CAM</span>
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
                      <div className="scenario-row">
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
                      </div>
                      <div className="scenario-ids">
                        <span className="id-item">
                          <span className="id-label">Record ID:</span>
                          <span className="id-value">{scenario.id}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface EntityRecordsSectionProps {
  recordType: RecordType
  parks: { [park: string]: ReturnType<typeof useDashboardData>['groupedData'][string][string] }
  isTypeExpanded: (type: string) => boolean
  isParkExpanded: (park: string) => boolean
  isItemExpanded: (id: string) => boolean
  toggleType: (type: string) => void
  togglePark: (park: string) => void
  toggleItem: (id: string) => void
  getScenariosGroupedByCamera: ReturnType<typeof useDashboardData>['getScenariosGroupedByCamera']
}

const EntityRecordsSection = ({
  recordType,
  parks,
  isTypeExpanded,
  isParkExpanded,
  isItemExpanded,
  toggleType,
  togglePark,
  toggleItem,
  getScenariosGroupedByCamera
}: EntityRecordsSectionProps) => {
  const typeCount = Object.values(parks).flat().length

  return (
    <CollapsibleGroup
      title={RECORD_TYPE_LABELS[recordType]}
      count={typeCount}
      isExpanded={isTypeExpanded(recordType)}
      onToggle={() => toggleType(recordType)}
      badge={RECORD_TYPE_ICONS[recordType]}
      className={`type-group type-${recordType}`}
    >
      {Object.entries(parks).sort(([a], [b]) => a.localeCompare(b)).map(([park, records]) => {
        const parkKey = `${recordType}_${park}`
        return (
          <CollapsiblePark
            key={parkKey}
            park={park}
            count={records.length}
            isExpanded={isParkExpanded(parkKey)}
            onToggle={() => togglePark(parkKey)}
          >
            {records.sort((a, b) => a.name.localeCompare(b.name)).map(record => (
              <CollapsibleItem
                key={record.id}
                isExpanded={isItemExpanded(record.id)}
                onToggle={() => toggleItem(record.id)}
                header={
                  <>
                    <div className="record-title">
                      <span className="record-name">{record.name}</span>
                      <span className="record-id">{record.unique_id}</span>
                    </div>
                    <RecordSummary record={record} />
                  </>
                }
              >
                {record.record_type === 'camera_scenario' && <CameraScenarioDetails record={record} />}
                <RecordMetadata record={record} />
              </CollapsibleItem>
            ))}
          </CollapsiblePark>
        )
      })}
    </CollapsibleGroup>
  )
}

export default EntityDataDashboard
