import { useState, useMemo, useContext } from 'preact/compat';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { WidgetContext } from '../WidgetView';
import { exportChartDataToCSV, exportSensorDataToCSV, SensorExportData } from '../utils/csvExport';
import { isDevelopmentMode } from '../utils/mockData';
import packageJson from '../../package.json'

// Type assertion for recharts components to work with Preact
const Chart = LineChart as any;
const ChartLine = Line as any;
const ChartXAxis = XAxis as any;
const ChartYAxis = YAxis as any;
const ChartGrid = CartesianGrid as any;
const ChartTooltip = Tooltip as any;
const ChartLegend = Legend as any;
const ChartContainer = ResponsiveContainer as any;

interface SensorData {
  sensorId: string;
  sensorName: string;
  park: string;
  world: string;
  building: string;
  floor: string;
  designation: string;
  roomType: string;
  hourlyData: { [hour: string]: number };
}

interface SelectedSensor {
  sensorId: string;
  sensorName: string;
  park: string;
  world: string;
  color: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#87d068'];

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
  const { sensorData, isLoading, availableDevices, fetchAvailableDevices } = useContext(WidgetContext);
  const [selectedSensors, setSelectedSensors] = useState<SelectedSensor[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  // Calculate min and max dates for input constraints
  const today = new Date();
  const maxDate = today.toISOString().split('T')[0];
  const minDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const isDevMode = isDevelopmentMode();
  
  // Data comes directly from selected device, no need to auto-load devices

  // Convert sensor data to the format expected by processing
  const rawData = sensorData.flatMap(sensor => [
    { id: `${sensor.id}-name`, variable: 'device_name', value: sensor.deviceName, group: sensor.group, time: sensor.time },
    { id: `${sensor.id}-park`, variable: 'park', value: sensor.park, group: sensor.group, time: sensor.time },
    { id: `${sensor.id}-world`, variable: 'world', value: sensor.world, group: sensor.group, time: sensor.time },
    { id: `${sensor.id}-building`, variable: 'building', value: sensor.building, group: sensor.group, time: sensor.time },
    { id: `${sensor.id}-floor`, variable: 'floor', value: sensor.floor, group: sensor.group, time: sensor.time },
    { id: `${sensor.id}-designation`, variable: 'designation', value: sensor.designation, group: sensor.group, time: sensor.time },
    { id: `${sensor.id}-room_type`, variable: 'room_type', value: sensor.roomType, group: sensor.group, time: sensor.time },
    { id: `${sensor.id}-in`, variable: 'device_period_in', value: sensor.totalIn, group: sensor.group, time: sensor.time }
  ]);

  const processedData = useMemo(() => {
    console.log(`🔍 Processing data for date: ${selectedDate}`);
    console.log(`📊 Raw data sample:`, rawData.slice(0, 3));
    
    // Filter raw data by selected date
    const filteredData = rawData.filter(item => {
      if (!selectedDate) return true; // No date filter applied
      
      const itemDate = new Date(item.time);
      const start = new Date(selectedDate + 'T00:00:00.000Z');
      const end = new Date(selectedDate + 'T23:59:59.999Z');
      
      const isInRange = itemDate >= start && itemDate <= end;
      
      // Log first few items for debugging
      if (rawData.indexOf(item) < 3) {
        console.log(`📅 Item ${item.id}: ${item.time} -> ${itemDate.toISOString()} (${isInRange ? 'IN' : 'OUT'} range ${start.toISOString()} to ${end.toISOString()})`);
      }
      
      return isInRange;
    });
    
    console.log(`📅 Filtered data: ${filteredData.length} points (from ${rawData.length} total) for date ${selectedDate}`);
    
    const sensorMap = new Map<string, SensorData>();
    
    filteredData.forEach(item => {
      const sensorId = item.group;
      
      if (!sensorMap.has(sensorId)) {
        sensorMap.set(sensorId, {
          sensorId,
          sensorName: '',
          park: '',
          world: '',
          building: '',
          floor: '',
          designation: '',
          roomType: '',
          hourlyData: {}
        });
      }
      
      const sensor = sensorMap.get(sensorId)!;
      
      if (item.variable === 'device_name') {
        sensor.sensorName = item.value as string;
      } else if (item.variable === 'park') {
        sensor.park = item.value as string;
      } else if (item.variable === 'world') {
        sensor.world = item.value as string;
      } else if (item.variable === 'building') {
        sensor.building = item.value as string;
      } else if (item.variable === 'floor') {
        sensor.floor = item.value as string;
      } else if (item.variable === 'designation') {
        sensor.designation = item.value as string;
      } else if (item.variable === 'room_type') {
        sensor.roomType = item.value as string;
      } else if (item.variable === 'device_period_in') {
        const hour = new Date(item.time).getHours();
        const hourKey = `${hour.toString().padStart(2, '0')}:00`;
        // Accumulate traffic count for each hour (sum multiple data points)
        if (!sensor.hourlyData[hourKey]) {
          sensor.hourlyData[hourKey] = 0;
        }
        sensor.hourlyData[hourKey] += Number(item.value) || 0;
      }
    });
    
    return Array.from(sensorMap.values()).filter(sensor => 
      sensor.sensorName && sensor.park && sensor.world
    );
  }, [rawData, selectedDate]);

  const worlds = useMemo(() => {
    const worldList = [...new Set(processedData.map(sensor => sensor.world))].filter(Boolean).sort();
    console.log('Available worlds:', worldList);
    console.log('Processed data:', processedData.slice(0, 3));
    return worldList;
  }, [processedData]);

  const buildings = useMemo(() => {
    if (!selectedWorld) return [];
    const filteredSensors = processedData.filter(sensor => sensor.world === selectedWorld);
    return [...new Set(filteredSensors.map(sensor => sensor.building))].filter(Boolean).sort();
  }, [processedData, selectedWorld]);

  const floors = useMemo(() => {
    if (!selectedWorld) return [];
    const filteredSensors = processedData.filter(sensor => 
      sensor.world === selectedWorld &&
      (!selectedBuilding || sensor.building === selectedBuilding));
    return [...new Set(filteredSensors.map(sensor => sensor.floor))].filter(Boolean).sort();
  }, [processedData, selectedWorld, selectedBuilding]);

  const designations = useMemo(() => {
    if (!selectedWorld) return [];
    const filteredSensors = processedData.filter(sensor => 
      sensor.world === selectedWorld &&
      (!selectedBuilding || sensor.building === selectedBuilding) &&
      (!selectedFloor || sensor.floor === selectedFloor));
    return [...new Set(filteredSensors.map(sensor => sensor.designation))].filter(Boolean).sort();
  }, [processedData, selectedWorld, selectedBuilding, selectedFloor]);

  const roomTypes = useMemo(() => {
    if (!selectedWorld) return [];
    const filteredSensors = processedData.filter(sensor => 
      sensor.world === selectedWorld &&
      (!selectedBuilding || sensor.building === selectedBuilding) &&
      (!selectedFloor || sensor.floor === selectedFloor) &&
      (!selectedDesignation || sensor.designation === selectedDesignation));
    return [...new Set(filteredSensors.map(sensor => sensor.roomType))].filter(Boolean).sort();
  }, [processedData, selectedWorld, selectedBuilding, selectedFloor, selectedDesignation]);

  const availableSensors = useMemo(() => {
    // Don't show any sensors if world is not selected or no data loaded
    if (!selectedWorld || processedData.length === 0) {
      return [];
    }
    
    const filtered = processedData.filter(sensor => {
      const worldMatch = sensor.world === selectedWorld;
      const buildingMatch = !selectedBuilding || sensor.building === selectedBuilding;
      const floorMatch = !selectedFloor || sensor.floor === selectedFloor;
      const designationMatch = !selectedDesignation || sensor.designation === selectedDesignation;
      const roomTypeMatch = !selectedRoomType || sensor.roomType === selectedRoomType;
      const notSelected = !selectedSensors.find(s => s.sensorId === sensor.sensorId);
      
      return worldMatch && buildingMatch && floorMatch && designationMatch && roomTypeMatch && notSelected;
    });
    
    console.log('Filter conditions:', { 
      selectedWorld, selectedBuilding, selectedFloor, 
      selectedDesignation, selectedRoomType, selectedSensorsCount: selectedSensors.length 
    });
    console.log('Available sensors after filtering:', filtered.length);
    
    return filtered;
  }, [processedData, selectedWorld, selectedBuilding, selectedFloor, selectedDesignation, selectedRoomType, selectedSensors]);

  const chartData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const now = new Date();
    const currentHour = now.getHours();
    const currentDate = now.toISOString().split('T')[0];
    
    // Only show hours up to current time if we're looking at today
    const validHours = hours.filter((_, index) => {
      // If we're showing today's data, only show hours up to current hour
      if (selectedDate === currentDate) {
        return index <= currentHour;
      }
      // For past dates, show all hours
      return true;
    });
    
    const chartPoints = validHours.map(hour => {
      const dataPoint: any = { hour };
      
      selectedSensors.forEach(sensor => {
        const sensorData = processedData.find(s => s.sensorId === sensor.sensorId);
        dataPoint[sensor.sensorName] = sensorData?.hourlyData[hour] || 0;
      });
      
      return dataPoint;
    });
    
    // Filter out data points where all sensor values are 0 (to clean up the chart)
    return chartPoints.filter(point => {
      return selectedSensors.some(sensor => (point[sensor.sensorName] || 0) > 0);
    });
  }, [selectedSensors, processedData, selectedDate]);

  const addSensor = (sensor: SensorData) => {
    if (selectedSensors.length < COLORS.length) {
      setSelectedSensors(prev => [...prev, {
        sensorId: sensor.sensorId,
        sensorName: sensor.sensorName,
        park: sensor.park,
        world: sensor.world,
        color: COLORS[prev.length]
      }]);
    }
  };

  const removeSensor = (sensorId: string) => {
    setSelectedSensors(prev => prev.filter(s => s.sensorId !== sensorId));
  };

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



  // Removed device loading check since data comes directly from selected device

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading sensor data...</div>
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
            value={selectedDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setSelectedDate((e.target as HTMLInputElement).value)}
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
          onClick={() => {
            setSelectedWorld('');
            setSelectedBuilding('');
            setSelectedFloor('');
            setSelectedDesignation('');
            setSelectedRoomType('');
            setSelectedSensors([]);
          }}
          disabled={!selectedWorld && !selectedBuilding && !selectedFloor && !selectedDesignation && !selectedRoomType && selectedSensors.length === 0}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            backgroundColor: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: (!selectedWorld && !selectedBuilding && !selectedFloor && !selectedDesignation && !selectedRoomType && selectedSensors.length === 0) ? 0.5 : 1,
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
            value={selectedWorld} 
            onChange={(e) => {
              setSelectedWorld((e.target as HTMLSelectElement).value);
              setSelectedBuilding('');
              setSelectedFloor('');
              setSelectedDesignation('');
              setSelectedRoomType('');
            }}
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
            value={selectedBuilding} 
            onChange={(e) => {
              setSelectedBuilding((e.target as HTMLSelectElement).value);
              setSelectedFloor('');
              setSelectedDesignation('');
              setSelectedRoomType('');
            }}
            disabled={!selectedWorld}
            style={{ 
              width: '100%', 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              backgroundColor: !selectedWorld ? '#f5f5f5' : '#fff',
              cursor: !selectedWorld ? 'not-allowed' : 'pointer'
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
            value={selectedFloor} 
            onChange={(e) => {
              setSelectedFloor((e.target as HTMLSelectElement).value);
              setSelectedDesignation('');
              setSelectedRoomType('');
            }}
            disabled={!selectedWorld}
            style={{ 
              width: '100%', 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              backgroundColor: !selectedWorld ? '#f5f5f5' : '#fff',
              cursor: !selectedWorld ? 'not-allowed' : 'pointer'
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
            value={selectedDesignation} 
            onChange={(e) => {
              setSelectedDesignation((e.target as HTMLSelectElement).value);
              setSelectedRoomType('');
            }}
            disabled={!selectedWorld}
            style={{ 
              width: '100%', 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              backgroundColor: !selectedWorld ? '#f5f5f5' : '#fff',
              cursor: !selectedWorld ? 'not-allowed' : 'pointer'
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
            value={selectedRoomType} 
            onChange={(e) => setSelectedRoomType((e.target as HTMLSelectElement).value)}
            disabled={!selectedWorld}
            style={{ 
              width: '100%', 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              backgroundColor: !selectedWorld ? '#f5f5f5' : '#fff',
              cursor: !selectedWorld ? 'not-allowed' : 'pointer'
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
                <div style={{ fontSize: '14px', marginBottom: '10px' }}>📊 Loading sensors...</div>
              </div>
            ) : (
              <>
            {availableSensors.map(sensor => {
              const metadataItems = [];
              
              // Only show metadata that isn't currently filtered
              if (!selectedBuilding && sensor.building) {
                metadataItems.push(`Building: ${sensor.building}`);
              }
              if (!selectedFloor && sensor.floor) {
                metadataItems.push(`Floor: ${sensor.floor}`);
              }
              if (!selectedDesignation && sensor.designation) {
                metadataItems.push(`${sensor.designation}`);
              }
              if (!selectedRoomType && sensor.roomType) {
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
                {!selectedWorld ? 'Select a world to see sensors' : 
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
        
        <div style={{ flex: 1 }}>
          <ChartContainer width="100%" height="100%">
            <Chart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <ChartGrid strokeDasharray="3 3" />
              <ChartXAxis dataKey="hour" />
              <ChartYAxis />
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