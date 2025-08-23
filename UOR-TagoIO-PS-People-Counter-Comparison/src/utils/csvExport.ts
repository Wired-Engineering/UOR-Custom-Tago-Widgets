import Papa from 'papaparse';

export interface SensorExportData {
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

export interface CSVRow {
  sensorName: string;
  park: string;
  world: string;
  building: string;
  floor: string;
  designation: string;
  roomType: string;
  hour: string;
  trafficCount: number;
  timestamp: string;
}

export const exportSensorDataToCSV = (sensors: SensorExportData[], filename?: string) => {
  const csvData: CSVRow[] = [];
  
  sensors.forEach(sensor => {
    Object.entries(sensor.hourlyData).forEach(([hour, count]) => {
      // Create a timestamp for the hour (using today's date)
      const today = new Date();
      const [hourNum] = hour.split(':');
      const timestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hourNum));
      
      csvData.push({
        sensorName: sensor.sensorName,
        park: sensor.park,
        world: sensor.world,
        building: sensor.building || '',
        floor: sensor.floor || '',
        designation: sensor.designation || '',
        roomType: sensor.roomType || '',
        hour: hour,
        trafficCount: count,
        timestamp: timestamp.toISOString()
      });
    });
  });
  
  // Sort by sensor name, then by hour
  csvData.sort((a, b) => {
    if (a.sensorName !== b.sensorName) {
      return a.sensorName.localeCompare(b.sensorName);
    }
    return a.hour.localeCompare(b.hour);
  });
  
  // Convert to CSV
  const csv = Papa.unparse(csvData, {
    header: true,
    columns: [
      'sensorName',
      'park', 
      'world',
      'building',
      'floor', 
      'designation',
      'roomType',
      'hour',
      'trafficCount',
      'timestamp'
    ]
  });
  
  // Create and download file
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `sensor-data-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportChartDataToCSV = (chartData: any[], selectedSensors: { sensorName: string }[], filename?: string) => {
  if (!chartData.length || !selectedSensors.length) {
    console.warn('No data to export');
    return;
  }
  
  // Transform chart data for CSV export
  const csvData = chartData.map(hourData => {
    const row: any = { hour: hourData.hour };
    selectedSensors.forEach(sensor => {
      row[sensor.sensorName] = hourData[sensor.sensorName] || 0;
    });
    return row;
  });
  
  // Convert to CSV
  const csv = Papa.unparse(csvData, {
    header: true
  });
  
  // Create and download file
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `sensor-comparison-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};