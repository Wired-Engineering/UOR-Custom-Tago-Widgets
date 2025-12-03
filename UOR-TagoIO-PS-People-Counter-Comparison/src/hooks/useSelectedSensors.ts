import { useState, useCallback } from 'preact/compat';
import { ProcessedSensorData } from './useSensorData';

export interface SelectedSensor {
  sensorId: string;
  sensorName: string;
  park: string;
  world: string;
  color: string;
}

export const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#87d068'];

export interface UseSelectedSensorsResult {
  selectedSensors: SelectedSensor[];
  addSensor: (sensor: ProcessedSensorData) => void;
  removeSensor: (sensorId: string) => void;
  clearSensors: () => void;
}

export const useSelectedSensors = (): UseSelectedSensorsResult => {
  const [selectedSensors, setSelectedSensors] = useState<SelectedSensor[]>([]);

  const addSensor = useCallback((sensor: ProcessedSensorData) => {
    setSelectedSensors(prev => {
      // Only add if we haven't reached the max limit
      if (prev.length < COLORS.length) {
        return [...prev, {
          sensorId: sensor.sensorId,
          sensorName: sensor.sensorName,
          park: sensor.park,
          world: sensor.world,
          color: COLORS[prev.length]
        }];
      }
      return prev;
    });
  }, []);

  const removeSensor = useCallback((sensorId: string) => {
    setSelectedSensors(prev => prev.filter(s => s.sensorId !== sensorId));
  }, []);

  const clearSensors = useCallback(() => {
    setSelectedSensors([]);
  }, []);

  return {
    selectedSensors,
    addSensor,
    removeSensor,
    clearSensors,
  };
};
