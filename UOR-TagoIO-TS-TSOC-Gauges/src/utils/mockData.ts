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
    
    if (group.device_name && 
        group.device_navd_current_we !== undefined &&
        group.device_navd_min_op_we !== undefined &&
        group.device_navd_max_op_we !== undefined) {
      
      waterLevels.push({
        id: groupId,
        name: group.device_name,
        currentLevel: group.device_navd_current_we,
        minOperational: group.device_navd_min_op_we,
        maxOperational: group.device_navd_max_op_we,
        normalLevel: group.device_navd_normal_we || 0,
        normalDeviation: group.device_navd_normal_we_deviation || 0,
        topOfPond: group.device_top_of_pond || group.device_navd_max_op_we + 10,
        bottomOfPond: group.device_bottom_of_pond || group.device_navd_min_op_we - 10,
        group: groupId
      })
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