import mockDataJson from './mock-data.json'

export interface PeopleCounterData {
  id: string
  deviceName: string
  park: string
  world: string
  building: string
  designation: string
  roomType: string
  floor: string
  periodIn: number
  periodOut: number
  totalIn: number
  totalOut: number
  battery?: number
  group: string
  time: string
}

export const mockPeopleCounterData = (): PeopleCounterData[] => {
  // Check if mockDataJson is an array (it should be based on the structure)
  const sensorData = Array.isArray(mockDataJson) ? mockDataJson : []
  const groupedData: { [key: string]: any } = {}
  
  // Group data by group ID
  sensorData.forEach((item: any) => {
    if (!groupedData[item.group]) {
      groupedData[item.group] = { time: item.time }
    }
    groupedData[item.group][item.variable] = item.value
  })
  
  // Transform grouped data into people counter data
  const sensors: PeopleCounterData[] = []
  
  Object.keys(groupedData).forEach(groupId => {
    const group = groupedData[groupId]
    
    if (group.device_name && group.park && group.world) {
      sensors.push({
        id: groupId,
        deviceName: group.device_name,
        park: group.park,
        world: group.world,
        building: group.building || '',
        designation: group.designation || '',
        roomType: group.room_type || '',
        floor: group.floor || '',
        periodIn: parseInt(group.device_period_in) || 0,
        periodOut: parseInt(group.device_period_out) || 0,
        totalIn: parseInt(group.device_total_in) || 0,
        totalOut: parseInt(group.device_total_out) || 0,
        battery: group.device_battery ? parseInt(group.device_battery) : undefined,
        group: groupId,
        time: group.time || new Date().toISOString()
      })
    }
  })
  
  console.log(`✅ Generated people counter data for ${sensors.length} sensors`)
  return sensors
}

// Mock TagoIO data structure for people counters
export const mockPeopleCounterTagoIOData = () => {
  const mockRealtimeData = [{
    result: mockDataJson
  }]
  
  console.log(`✅ Generated mock TagoIO data with ${mockDataJson.length} data points`)
  return mockRealtimeData
}


// Development mode detection
export const isDevelopmentMode = () => {
  return !(window as any).TagoIO || process.env.NODE_ENV === 'development'
}