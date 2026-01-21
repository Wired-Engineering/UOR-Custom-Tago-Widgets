import { EntityRecord } from '../WidgetView'

interface CameraScenarioDetailsProps {
  record: EntityRecord
}

export const CameraScenarioDetails = ({ record }: CameraScenarioDetailsProps) => (
  <div className="record-details">
    <div className="details-section">
      <h4>Camera Info</h4>
      <div className="detail-grid">
        <div className="detail-item">
          <span className="detail-label">Camera Device ID</span>
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
          <span className="detail-label">Scenario Identifier</span>
          <span className="detail-value">{record.info.scenario_identifier || 'N/A'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Scenario Device ID</span>
          <span className="detail-value small-text">{record.info.device_id || 'N/A'}</span>
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
  </div>
)

interface RecordMetadataProps {
  record: EntityRecord
}

export const RecordMetadata = ({ record }: RecordMetadataProps) => (
  <div className="details-section metadata-section">
    <h4>Entity Record Metadata</h4>
    <div className="detail-grid">
      <div className="detail-item">
        <span className="detail-label">Record ID</span>
        <span className="detail-value small-text">{record.id}</span>
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
  if (record.record_type !== 'camera_scenario') {
    return null
  }

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
    </div>
  )
}
