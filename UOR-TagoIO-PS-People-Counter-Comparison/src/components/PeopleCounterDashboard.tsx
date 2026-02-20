import { useContext } from 'preact/compat';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { WidgetContext } from '../WidgetView';
import { exportChartDataToCSV, exportSensorDataToCSV, SensorExportData } from '../utils/csvExport';
import { isDevelopmentMode } from '../utils/mockData';
import packageJson from '../../package.json';
import { useSensorFilters } from '../hooks/useSensorFilters';
import { useSensorData } from '../hooks/useSensorData';
import { useSelectedSensors } from '../hooks/useSelectedSensors';
import { useChartData } from '../hooks/useChartData';
import './PeopleCounterDashboard.css';

// Type assertion for recharts components to work with Preact
const Chart = LineChart as any;
const ChartLine = Line as any;
const ChartXAxis = XAxis as any;
const ChartYAxis = YAxis as any;
const ChartGrid = CartesianGrid as any;
const ChartTooltip = Tooltip as any;
const ChartLegend = Legend as any;
const ChartContainer = ResponsiveContainer as any;

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, item: any) => sum + (item.value || 0), 0);

    return (
      <div style={{
        backgroundColor: 'white',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{`Time: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ margin: '4px 0', color: entry.color }}>
            {`${entry.dataKey}: ${entry.value}`}
          </p>
        ))}
        <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #eee' }} />
        <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#333' }}>
          {`Total: ${total}`}
        </p>
      </div>
    );
  }
  return null;
};

const PeopleCounterDashboard = () => {
  const { sensorData, isLoading } = useContext(WidgetContext);
  const isDevMode = isDevelopmentMode();

  // Use custom hooks
  const { filters, actions } = useSensorFilters();
  const { selectedSensors, addSensor, removeSensor, clearSensors } = useSelectedSensors();
  const {
    processedData,
    worlds,
    buildings,
    floors,
    designations,
    roomTypes,
    availableSensors
  } = useSensorData(sensorData, filters, selectedSensors);
  const chartData = useChartData(selectedSensors, processedData, filters.selectedDate);

  const handleExportCSV = () => {
    if (selectedSensors.length === 0) {
      alert('Please select at least one sensor to export data.');
      return;
    }

    // Convert chart data to CSV format
    exportChartDataToCSV(chartData, selectedSensors, `sensor-comparison-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportDetailedCSV = () => {
    if (selectedSensors.length === 0) {
      alert('Please select at least one sensor to export data.');
      return;
    }

    // Convert processed sensor data to detailed CSV format
    const detailedData: SensorExportData[] = selectedSensors.map(selected => {
      const sensor = processedData.find(s => s.sensorId === selected.sensorId);
      return {
        sensorId: selected.sensorId,
        sensorName: selected.sensorName,
        park: selected.park,
        world: selected.world,
        building: sensor?.building || '',
        floor: sensor?.floor || '',
        designation: sensor?.designation || '',
        roomType: sensor?.roomType || '',
        hourlyData: sensor?.hourlyData || {}
      };
    });

    exportSensorDataToCSV(detailedData, `sensor-detailed-data-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleClearAll = () => {
    actions.clearAllFilters();
    clearSensors();
  };

  if (isLoading) {
    return (
      <div className="people-counter-dashboard loading">
        <div className="loading-container">
          <div className="loading-animation">
            <div className="loading-icon">📊</div>
          </div>
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading Sensor Data...</p>
          <p className="loading-subtext">Preparing your traffic analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', padding: '20px', gap: '20px' }}>
      {/* Selection Panel */}
      <div style={{
        width: '450px',
        minWidth: '450px',
        maxWidth: '450px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        height: 'calc(100vh - 40px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Data Selection</h3>

        {/* Date Range Filter */}
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e8f4f8', borderRadius: '6px', border: '1px solid #2196F3' }}>
          <input
            type="date"
            value={filters.selectedDate}
            min={filters.minDate}
            max={filters.maxDate}
            onInput={(e) => actions.setSelectedDate((e.target as HTMLInputElement).value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '14px'
            }}
          />
        </div>

        <button
          onClick={handleClearAll}
          disabled={!filters.selectedWorld && !filters.selectedBuilding && !filters.selectedFloor && !filters.selectedDesignation && !filters.selectedRoomType && selectedSensors.length === 0}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            backgroundColor: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: (!filters.selectedWorld && !filters.selectedBuilding && !filters.selectedFloor && !filters.selectedDesignation && !filters.selectedRoomType && selectedSensors.length === 0) ? 0.5 : 1,
            transition: 'opacity 0.2s',
            marginBottom: '20px'
          }}
        >
          Clear All Selections
        </button>

        {/* World Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>World:</label>
          <select
            value={filters.selectedWorld}
            onInput={(e) => actions.setSelectedWorld((e.target as HTMLSelectElement).value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          >
            <option value="">Select a world</option>
            {worlds.map(world => (
              <option key={world} value={world}>{world}</option>
            ))}
          </select>
          {worlds.length === 0 && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              No worlds found in this park
            </div>
          )}
        </div>

        {/* Building Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Building:</label>
          <select
            value={filters.selectedBuilding}
            onInput={(e) => actions.setSelectedBuilding((e.target as HTMLSelectElement).value)}
            disabled={!filters.selectedWorld}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: !filters.selectedWorld ? '#f5f5f5' : '#fff',
              cursor: !filters.selectedWorld ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="">All buildings</option>
            {buildings.map(building => (
              <option key={building} value={building}>{building}</option>
            ))}
          </select>
        </div>

        {/* Floor Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Floor:</label>
          <select
            value={filters.selectedFloor}
            onInput={(e) => actions.setSelectedFloor((e.target as HTMLSelectElement).value)}
            disabled={!filters.selectedWorld}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: !filters.selectedWorld ? '#f5f5f5' : '#fff',
              cursor: !filters.selectedWorld ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="">All floors</option>
            {floors.map(floor => (
              <option key={floor} value={floor}>{floor}</option>
            ))}
          </select>
        </div>

        {/* Designation Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Designation:</label>
          <select
            value={filters.selectedDesignation}
            onInput={(e) => actions.setSelectedDesignation((e.target as HTMLSelectElement).value)}
            disabled={!filters.selectedWorld}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: !filters.selectedWorld ? '#f5f5f5' : '#fff',
              cursor: !filters.selectedWorld ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="">All designations</option>
            {designations.map(designation => (
              <option key={designation} value={designation}>{designation}</option>
            ))}
          </select>
        </div>

        {/* Room Type Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Room Type:</label>
          <select
            value={filters.selectedRoomType}
            onInput={(e) => actions.setSelectedRoomType((e.target as HTMLSelectElement).value)}
            disabled={!filters.selectedWorld}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: !filters.selectedWorld ? '#f5f5f5' : '#fff',
              cursor: !filters.selectedWorld ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="">All room types</option>
            {roomTypes.map(roomType => (
              <option key={roomType} value={roomType}>{roomType}</option>
            ))}
          </select>
        </div>

        {/* Available Sensors */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Available Sensors:</label>
          <div style={{
            height: '300px',
            overflowY: 'auto',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#fff'
          }}>
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                <div style={{ fontSize: '14px', marginBottom: '10px' }}>Loading sensors...</div>
              </div>
            ) : (
              <>
            {availableSensors.map(sensor => {
              const metadataItems = [];

              // Only show metadata that isn't currently filtered
              if (!filters.selectedBuilding && sensor.building) {
                metadataItems.push(`Building: ${sensor.building}`);
              }
              if (!filters.selectedFloor && sensor.floor) {
                metadataItems.push(`Floor: ${sensor.floor}`);
              }
              if (!filters.selectedDesignation && sensor.designation) {
                metadataItems.push(`${sensor.designation}`);
              }
              if (!filters.selectedRoomType && sensor.roomType) {
                metadataItems.push(`${sensor.roomType}`);
              }

              return (
                <div
                  key={sensor.sensorId}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    backgroundColor: '#fff',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => addSensor(sensor)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {sensor.sensorName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
                    {sensor.world}
                  </div>
                  {metadataItems.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {metadataItems.join(' • ')}
                    </div>
                  )}
                </div>
              );
            })}
            {availableSensors.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                {!filters.selectedWorld ? 'Select a world to see sensors' :
                 'No sensors available for selected filters'}
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chart Panel */}
      <div style={{ flex: 1, backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Hourly Traffic Count (IN) - 24 Hour Period</h3>

        {/* Selected Sensors - Horizontal Layout */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Selected Sensors:</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleExportCSV}
                disabled={selectedSensors.length === 0}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedSensors.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedSensors.length === 0 ? 0.5 : 1,
                  transition: 'opacity 0.2s'
                }}
                title="Export chart data as CSV"
              >
                Export CSV
              </button>
              <button
                onClick={handleExportDetailedCSV}
                disabled={selectedSensors.length === 0}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedSensors.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedSensors.length === 0 ? 0.5 : 1,
                  transition: 'opacity 0.2s'
                }}
                title="Export detailed sensor data as CSV"
              >
                Export Detailed
              </button>
            </div>
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            minHeight: '40px',
            padding: '8px',
            backgroundColor: '#fff',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}>
            {selectedSensors.length === 0 ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                color: '#999',
                fontSize: '14px',
                fontStyle: 'italic'
              }}>
                No sensors selected - use the filters on the left to add sensors
              </div>
            ) : (
              selectedSensors.map(sensor => (
                <div
                  key={sensor.sensorId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    backgroundColor: sensor.color,
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <span style={{ marginRight: '8px' }}>{sensor.sensorName}</span>
                  <button
                    onClick={() => removeSensor(sensor.sensorId)}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.3)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1
                    }}
                    title="Remove sensor"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <ChartContainer width="100%" height="100%" minWidth={0}>
            <Chart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <ChartGrid strokeDasharray="3 3" />
              <ChartXAxis dataKey="hour" />
              <ChartYAxis allowDecimals={false} />
              <ChartTooltip content={<CustomTooltip />} />
              <ChartLegend />
              {selectedSensors.map(sensor => (
                <ChartLine
                  key={sensor.sensorId}
                  type="monotone"
                  dataKey={sensor.sensorName}
                  stroke={sensor.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </Chart>
          </ChartContainer>
          <div style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '12px', color: '#666' }}>
            v{packageJson.version}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeopleCounterDashboard;
