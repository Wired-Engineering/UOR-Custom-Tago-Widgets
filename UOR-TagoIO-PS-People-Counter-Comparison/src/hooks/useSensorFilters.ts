import { useState, useCallback } from 'preact/compat';

export interface SensorFilters {
  selectedWorld: string;
  selectedBuilding: string;
  selectedFloor: string;
  selectedDesignation: string;
  selectedRoomType: string;
  selectedDate: string;
  minDate: string;
  maxDate: string;
}

export interface SensorFiltersActions {
  setSelectedWorld: (world: string) => void;
  setSelectedBuilding: (building: string) => void;
  setSelectedFloor: (floor: string) => void;
  setSelectedDesignation: (designation: string) => void;
  setSelectedRoomType: (roomType: string) => void;
  setSelectedDate: (date: string) => void;
  clearAllFilters: () => void;
}

export const useSensorFilters = () => {
  const [selectedWorld, setSelectedWorldState] = useState<string>('');
  const [selectedBuilding, setSelectedBuildingState] = useState<string>('');
  const [selectedFloor, setSelectedFloorState] = useState<string>('');
  const [selectedDesignation, setSelectedDesignationState] = useState<string>('');
  const [selectedRoomType, setSelectedRoomTypeState] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Calculate min and max dates for input constraints
  const today = new Date();
  const maxDate = today.toISOString().split('T')[0];
  const minDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Cascading reset logic: when a parent filter changes, child filters reset
  const setSelectedWorld = useCallback((world: string) => {
    setSelectedWorldState(world);
    setSelectedBuildingState('');
    setSelectedFloorState('');
    setSelectedDesignationState('');
    setSelectedRoomTypeState('');
  }, []);

  const setSelectedBuilding = useCallback((building: string) => {
    setSelectedBuildingState(building);
    setSelectedFloorState('');
    setSelectedDesignationState('');
    setSelectedRoomTypeState('');
  }, []);

  const setSelectedFloor = useCallback((floor: string) => {
    setSelectedFloorState(floor);
    setSelectedDesignationState('');
    setSelectedRoomTypeState('');
  }, []);

  const setSelectedDesignation = useCallback((designation: string) => {
    setSelectedDesignationState(designation);
    setSelectedRoomTypeState('');
  }, []);

  const setSelectedRoomType = useCallback((roomType: string) => {
    setSelectedRoomTypeState(roomType);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedWorldState('');
    setSelectedBuildingState('');
    setSelectedFloorState('');
    setSelectedDesignationState('');
    setSelectedRoomTypeState('');
  }, []);

  const filters: SensorFilters = {
    selectedWorld,
    selectedBuilding,
    selectedFloor,
    selectedDesignation,
    selectedRoomType,
    selectedDate,
    minDate,
    maxDate,
  };

  const actions: SensorFiltersActions = {
    setSelectedWorld,
    setSelectedBuilding,
    setSelectedFloor,
    setSelectedDesignation,
    setSelectedRoomType,
    setSelectedDate,
    clearAllFilters,
  };

  return { filters, actions };
};
