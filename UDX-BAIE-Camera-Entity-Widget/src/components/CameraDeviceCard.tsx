import { CameraWithScenarios } from '../types/dashboard'
import { formatDate, formatNumber } from '../utils/formatters'

interface CameraDeviceDetailsProps {
  camera: CameraWithScenarios
}

export const CameraDeviceDetails = ({ camera }: CameraDeviceDetailsProps) => (
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

interface CameraDeviceSummaryProps {
  camera: CameraWithScenarios
  isUnconfigured?: boolean
}

export const CameraDeviceSummary = ({ camera, isUnconfigured = false }: CameraDeviceSummaryProps) => (
  <div className="record-summary">
    {isUnconfigured && (
      <span className="summary-item badge badge-warning">Unconfigured</span>
    )}
    <span className="summary-item">
      <span className="summary-label">Scenarios:</span> {camera.scenarios.length}
    </span>
    {!isUnconfigured && (
      <span className={`summary-item badge ${camera.device_type === 'axis-camera' ? 'badge-info' : 'badge-neutral'}`}>
        {camera.device_type}
      </span>
    )}
  </div>
)
