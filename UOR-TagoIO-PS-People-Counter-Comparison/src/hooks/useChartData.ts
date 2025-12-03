import { useMemo } from 'preact/compat';
import { ProcessedSensorData } from './useSensorData';
import { SelectedSensor } from './useSelectedSensors';

export interface ChartDataPoint {
  hour: string;
  [sensorName: string]: number | string;
}

export const useChartData = (
  selectedSensors: SelectedSensor[],
  processedData: ProcessedSensorData[],
  selectedDate: string
): ChartDataPoint[] => {
  return useMemo(() => {
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
};
