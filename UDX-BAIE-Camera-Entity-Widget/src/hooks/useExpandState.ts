import { useState, useCallback } from 'preact/hooks'
import { GroupedData, GroupedCameras } from '../types/dashboard'

interface UseExpandStateReturn {
  expandedTypes: Set<string>
  expandedParks: Set<string>
  expandedItems: Set<string>
  toggleType: (type: string) => void
  togglePark: (typeAndPark: string) => void
  toggleItem: (id: string) => void
  expandAll: (groupedData: GroupedData, groupedCameras: GroupedCameras) => void
  collapseAll: () => void
  isTypeExpanded: (type: string) => boolean
  isParkExpanded: (park: string) => boolean
  isItemExpanded: (id: string) => boolean
}

export const useExpandState = (
  initialTypes: string[] = ['camera_scenario', 'queue_venue', 'occupancy_venue', 'devices']
): UseExpandStateReturn => {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(initialTypes))
  const [expandedParks, setExpandedParks] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleType = useCallback((type: string) => {
    setExpandedTypes(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(type)) {
        newExpanded.delete(type)
      } else {
        newExpanded.add(type)
      }
      return newExpanded
    })
  }, [])

  const togglePark = useCallback((typeAndPark: string) => {
    setExpandedParks(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(typeAndPark)) {
        newExpanded.delete(typeAndPark)
      } else {
        newExpanded.add(typeAndPark)
      }
      return newExpanded
    })
  }, [])

  const toggleItem = useCallback((id: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(id)) {
        newExpanded.delete(id)
      } else {
        newExpanded.add(id)
      }
      return newExpanded
    })
  }, [])

  const expandAll = useCallback((groupedData: GroupedData, groupedCameras: GroupedCameras) => {
    const allTypes = new Set(Object.keys(groupedData))
    const allParks = new Set<string>()
    const allItems = new Set<string>()

    // Expand entity records
    Object.entries(groupedData).forEach(([type, parks]) => {
      Object.entries(parks).forEach(([park, records]) => {
        allParks.add(`${type}_${park}`)
        records.forEach(record => allItems.add(record.id))
      })
    })

    // Expand devices
    allTypes.add('devices_configured')
    allTypes.add('devices_unconfigured')

    Object.keys(groupedCameras.configured).forEach(park => {
      allParks.add(`devices_${park}`)
      groupedCameras.configured[park].forEach(camera => allItems.add(camera.id))
    })

    groupedCameras.unconfigured.forEach(camera => allItems.add(camera.id))

    setExpandedTypes(allTypes)
    setExpandedParks(allParks)
    setExpandedItems(allItems)
  }, [])

  const collapseAll = useCallback(() => {
    setExpandedTypes(new Set())
    setExpandedParks(new Set())
    setExpandedItems(new Set())
  }, [])

  const isTypeExpanded = useCallback((type: string) => expandedTypes.has(type), [expandedTypes])
  const isParkExpanded = useCallback((park: string) => expandedParks.has(park), [expandedParks])
  const isItemExpanded = useCallback((id: string) => expandedItems.has(id), [expandedItems])

  return {
    expandedTypes,
    expandedParks,
    expandedItems,
    toggleType,
    togglePark,
    toggleItem,
    expandAll,
    collapseAll,
    isTypeExpanded,
    isParkExpanded,
    isItemExpanded
  }
}
