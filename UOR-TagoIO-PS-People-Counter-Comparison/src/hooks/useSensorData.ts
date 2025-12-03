import { useMemo } from 'preact/compat';
import { SensorData } from '../WidgetView';
import { SensorFilters } from './useSensorFilters';

export interface ProcessedSensorData {
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

interface RawDataItem {
  id: string;
  variable: string;
  value: string | number;
  group: string;
  time: string;
}

export interface SensorDataResult {
  processedData: ProcessedSensorData[];
  worlds: string[];
  buildings: string[];
  floors: string[];
  designations: string[];
  roomTypes: string[];
  availableSensors: ProcessedSensorData[];
}

export const useSensorData = (
  sensorData: SensorData[],
  filters: SensorFilters,
  selectedSensors: any[]
): SensorDataResult => {
  // Convert sensor data to raw data format
  const rawData: RawDataItem[] = useMemo(() => {
    return sensorData.flatMap(sensor => [
      { id: `${sensor.id}-name`, variable: 'device_name', value: sensor.deviceName, group: sensor.group, time: sensor.time },
      { id: `${sensor.id}-park`, variable: 'park', value: sensor.park, group: sensor.group, time: sensor.time },
      { id: `${sensor.id}-world`, variable: 'world', value: sensor.world, group: sensor.group, time: sensor.time },
      { id: `${sensor.id}-building`, variable: 'building', value: sensor.building, group: sensor.group, time: sensor.time },
      { id: `${sensor.id}-floor`, variable: 'floor', value: sensor.floor, group: sensor.group, time: sensor.time },
      { id: `${sensor.id}-designation`, variable: 'designation', value: sensor.designation, group: sensor.group, time: sensor.time },
      { id: `${sensor.id}-room_type`, variable: 'room_type', value: sensor.roomType, group: sensor.group, time: sensor.time },
      { id: `${sensor.id}-in`, variable: 'device_period_in', value: sensor.totalIn, group: sensor.group, time: sensor.time }
    ]);
  }, [sensorData]);

  // Process data with date filtering
  const processedData = useMemo(() => {
    console.log(`🔍 Processing data for date: ${filters.selectedDate}`);
    console.log(`📊 Raw data sample:`, rawData.slice(0, 3));

    // Filter raw data by selected date
    const filteredData = rawData.filter(item => {
      if (!filters.selectedDate) return true;

      const itemDate = new Date(item.time);
      const start = new Date(filters.selectedDate + 'T00:00:00.000Z');
      const end = new Date(filters.selectedDate + 'T23:59:59.999Z');

      const isInRange = itemDate >= start && itemDate <= end;

      // Log first few items for debugging
      if (rawData.indexOf(item) < 3) {
        console.log(`📅 Item ${item.id}: ${item.time} -> ${itemDate.toISOString()} (${isInRange ? 'IN' : 'OUT'} range ${start.toISOString()} to ${end.toISOString()})`);
      }

      return isInRange;
    });

    console.log(`📅 Filtered data: ${filteredData.length} points (from ${rawData.length} total) for date ${filters.selectedDate}`);

    const sensorMap = new Map<string, ProcessedSensorData>();

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
  }, [rawData, filters.selectedDate]);

  // Derive filter options from processed data
  const worlds = useMemo(() => {
    const worldList = [...new Set(processedData.map(sensor => sensor.world))].filter(Boolean).sort();
    console.log('Available worlds:', worldList);
    console.log('Processed data:', processedData.slice(0, 3));
    return worldList;
  }, [processedData]);

  const buildings = useMemo(() => {
    if (!filters.selectedWorld) return [];
    const filteredSensors = processedData.filter(sensor => sensor.world === filters.selectedWorld);
    return [...new Set(filteredSensors.map(sensor => sensor.building))].filter(Boolean).sort();
  }, [processedData, filters.selectedWorld]);

  const floors = useMemo(() => {
    if (!filters.selectedWorld) return [];
    const filteredSensors = processedData.filter(sensor =>
      sensor.world === filters.selectedWorld &&
      (!filters.selectedBuilding || sensor.building === filters.selectedBuilding));
    return [...new Set(filteredSensors.map(sensor => sensor.floor))].filter(Boolean).sort();
  }, [processedData, filters.selectedWorld, filters.selectedBuilding]);

  const designations = useMemo(() => {
    if (!filters.selectedWorld) return [];
    const filteredSensors = processedData.filter(sensor =>
      sensor.world === filters.selectedWorld &&
      (!filters.selectedBuilding || sensor.building === filters.selectedBuilding) &&
      (!filters.selectedFloor || sensor.floor === filters.selectedFloor));
    return [...new Set(filteredSensors.map(sensor => sensor.designation))].filter(Boolean).sort();
  }, [processedData, filters.selectedWorld, filters.selectedBuilding, filters.selectedFloor]);

  const roomTypes = useMemo(() => {
    if (!filters.selectedWorld) return [];
    const filteredSensors = processedData.filter(sensor =>
      sensor.world === filters.selectedWorld &&
      (!filters.selectedBuilding || sensor.building === filters.selectedBuilding) &&
      (!filters.selectedFloor || sensor.floor === filters.selectedFloor) &&
      (!filters.selectedDesignation || sensor.designation === filters.selectedDesignation));
    return [...new Set(filteredSensors.map(sensor => sensor.roomType))].filter(Boolean).sort();
  }, [processedData, filters.selectedWorld, filters.selectedBuilding, filters.selectedFloor, filters.selectedDesignation]);

  // Compute available sensors based on filters
  const availableSensors = useMemo(() => {
    // Don't show any sensors if world is not selected or no data loaded
    if (!filters.selectedWorld || processedData.length === 0) {
      return [];
    }

    const filtered = processedData.filter(sensor => {
      const worldMatch = sensor.world === filters.selectedWorld;
      const buildingMatch = !filters.selectedBuilding || sensor.building === filters.selectedBuilding;
      const floorMatch = !filters.selectedFloor || sensor.floor === filters.selectedFloor;
      const designationMatch = !filters.selectedDesignation || sensor.designation === filters.selectedDesignation;
      const roomTypeMatch = !filters.selectedRoomType || sensor.roomType === filters.selectedRoomType;
      const notSelected = !selectedSensors.find(s => s.sensorId === sensor.sensorId);

      return worldMatch && buildingMatch && floorMatch && designationMatch && roomTypeMatch && notSelected;
    });

    console.log('Filter conditions:', {
      selectedWorld: filters.selectedWorld,
      selectedBuilding: filters.selectedBuilding,
      selectedFloor: filters.selectedFloor,
      selectedDesignation: filters.selectedDesignation,
      selectedRoomType: filters.selectedRoomType,
      selectedSensorsCount: selectedSensors.length
    });
    console.log('Available sensors after filtering:', filtered.length);

    return filtered;
  }, [processedData, filters.selectedWorld, filters.selectedBuilding, filters.selectedFloor,
      filters.selectedDesignation, filters.selectedRoomType, selectedSensors]);

  return {
    processedData,
    worlds,
    buildings,
    floors,
    designations,
    roomTypes,
    availableSensors,
  };
};
