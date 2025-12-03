import { EntityRecord, CameraDevice } from '../WidgetView'
import { formatDate, formatNumber } from '../utils/formatters'

interface LinkedCamerasProps {
  venueId: string
  getScenariosGroupedByCamera: (venueId: string) => Record<string, { camera: CameraDevice | null; scenarios: EntityRecord[] }>
}

export const LinkedCamerasAndScenarios = ({ venueId, getScenariosGroupedByCamera }: LinkedCamerasProps) => {
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

interface CameraScenarioDetailsProps {
  record: EntityRecord
}

export const CameraScenarioDetails = ({ record }: CameraScenarioDetailsProps) => (
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

interface QueueVenueDetailsProps {
  record: EntityRecord
  getScenariosGroupedByCamera: (venueId: string) => Record<string, { camera: CameraDevice | null; scenarios: EntityRecord[] }>
}

export const QueueVenueDetails = ({ record, getScenariosGroupedByCamera }: QueueVenueDetailsProps) => (
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

    <LinkedCamerasAndScenarios venueId={record.unique_id} getScenariosGroupedByCamera={getScenariosGroupedByCamera} />
  </div>
)

interface OccupancyVenueDetailsProps {
  record: EntityRecord
  getScenariosGroupedByCamera: (venueId: string) => Record<string, { camera: CameraDevice | null; scenarios: EntityRecord[] }>
}

export const OccupancyVenueDetails = ({ record, getScenariosGroupedByCamera }: OccupancyVenueDetailsProps) => (
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

    <LinkedCamerasAndScenarios venueId={record.unique_id} getScenariosGroupedByCamera={getScenariosGroupedByCamera} />
  </div>
)

interface RecordMetadataProps {
  record: EntityRecord
}

export const RecordMetadata = ({ record }: RecordMetadataProps) => (
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
)

interface RecordSummaryProps {
  record: EntityRecord
}

export const RecordSummary = ({ record }: RecordSummaryProps) => {
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
    default:
      return null
  }
}
