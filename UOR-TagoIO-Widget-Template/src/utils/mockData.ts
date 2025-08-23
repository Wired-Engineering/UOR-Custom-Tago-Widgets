import mockDataJson from './mock-data.json'

export interface MockWidgetData {
  id: string
  name: string
  value: number
  group: string
  time: string
}

export const mockWidgetData = (): MockWidgetData[] => {
  // Check if mockDataJson is an array (it should be based on the structure)
  const data = Array.isArray(mockDataJson) ? mockDataJson : []
  const groupedData: { [key: string]: any } = {}
  
  // Group data by group ID
  data.forEach((item: any) => {
    if (!groupedData[item.group]) {
      groupedData[item.group] = { time: item.time }
    }
    groupedData[item.group][item.variable] = item.value
  })
  
  // Transform grouped data into widget data
  const widgets: MockWidgetData[] = []
  
  Object.keys(groupedData).forEach(groupId => {
    const group = groupedData[groupId]
    
    if (group.device_name) {
      widgets.push({
        id: groupId,
        name: group.device_name,
        value: parseFloat(group.value) || parseFloat(group.main_value) || Math.random() * 100,
        group: groupId,
        time: group.time || new Date().toISOString()
      })
    }
  })
  
  console.log(`✅ Generated widget data for ${widgets.length} items`)
  return widgets
}

// Mock TagoIO data structure
export const mockTagoIOData = () => {
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