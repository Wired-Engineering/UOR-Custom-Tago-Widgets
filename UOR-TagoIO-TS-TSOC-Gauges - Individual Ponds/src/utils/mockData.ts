import mockDataJson from './mock-data.json'

export interface WaterLevelData {
  id: string
  name: string
  currentLevel: number
  minOperational: number
  maxOperational: number
  normalLevel: number
  normalDeviation: number
  topOfPond: number
  bottomOfPond: number
  maxAlarm?: number
  minAlarm?: number
  last_updated?: string
  group: string
}

export const mockWaterLevelData = (): WaterLevelData[] => {
  // Check if mockDataJson is an array (it should be based on the structure)
  const waterData = Array.isArray(mockDataJson) ? mockDataJson : []
  const groupedData: { [key: string]: any } = {}
  
  // Group data by group ID
  waterData.forEach((item: any) => {
    if (!groupedData[item.group]) {
      groupedData[item.group] = {}
    }
    groupedData[item.group][item.variable] = item.value
  })
  
  // Transform grouped data into water level data
  const waterLevels: WaterLevelData[] = []
  
  Object.keys(groupedData).forEach(groupId => {
    const group = groupedData[groupId]
    
    if (group.name && 
        group.navd_current_we !== undefined) {
      
      // Extract values, treating 0 as a valid value
      const waterLevel = {
        id: groupId,
        name: group.name,
        currentLevel: group.navd_current_we,
        minOperational: group.navd_min_op_we,
        maxOperational: group.navd_max_op_we,
        normalLevel: group.navd_normal_we || 0,
        normalDeviation: group.navd_normal_we_deviation || 0,
        topOfPond: group.navd_alarm_top || (group.navd_max_op_we !== undefined ? group.navd_max_op_we + 10 : 100),
        bottomOfPond: group.navd_alarm_bop || (group.navd_min_op_we !== undefined ? group.navd_min_op_we - 10 : 0),
        maxAlarm: group.navd_max_alarm_we,
        minAlarm: group.navd_min_alarm_we,
        last_updated: new Date().toISOString(),
        group: groupId
      }      
      waterLevels.push(waterLevel)
    }
  })
  
  console.log(`✅ Generated water level data for ${waterLevels.length} sensors`)
  return waterLevels
}

// Mock TagoIO data structure for water levels
export const mockWaterLevelTagoIOData = () => {
  const mockRealtimeData = [{
    result: mockDataJson
  }]
  
  console.log(`✅ Generated mock TagoIO data with ${mockDataJson.length} data points`)
  return mockRealtimeData
}

// Development mode detection using Parcel
export const isDevelopmentMode = () => {
  // Check if TagoIO is available (production environment indicator)
  const hasTagoIO = typeof window !== 'undefined' && (window as any).TagoIO
  
  // Use Parcel's NODE_ENV to detect development mode
  const isDevEnv = process.env.NODE_ENV === 'development'
  
  // Return true if either TagoIO is not available OR we're explicitly in development
  return !hasTagoIO || isDevEnv
}

// Production mode detection using Parcel
export const isProductionMode = () => {
  return process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && (window as any).TagoIO
}