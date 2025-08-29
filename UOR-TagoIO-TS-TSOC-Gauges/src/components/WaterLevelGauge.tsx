import { useState } from 'preact/compat'
import type { FunctionComponent } from 'preact'
import { PieChart, Pie, Cell } from 'recharts'
import './WaterLevelGauge.css'

interface WaterGaugeProps {
  name: string
  currentLevel: number
  minOperational?: number
  maxOperational?: number
  normalLevel: number
  normalDeviation: number
  topOfPond?: number
  bottomOfPond?: number
  maxAlarm?: number
  minAlarm?: number
  lastUpdated: string
}

const WaterGauge: FunctionComponent<WaterGaugeProps> = ({
  name,
  currentLevel,
  minOperational,
  maxOperational,
  normalLevel,
  normalDeviation,
  topOfPond,
  bottomOfPond,
  maxAlarm,
  minAlarm,
  lastUpdated
}) => {
  // Use values directly from data - only treat 0 as undefined for non-bottom-of-pond values
  const effectiveMinOp = minOperational
  const effectiveMaxOp = maxOperational
  const effectiveMinAlarm = minAlarm
  const effectiveMaxAlarm = maxAlarm
  const effectiveTopOfPond = topOfPond
  // Define zone colors - override metadata colors to match requirements
  const getZoneColor = (zoneType: string) => {
    switch(zoneType) {
      case 'operational': return '#ff0000' // red for operational zones (min/max operational)
      case 'warning': return '#ff8c00' // orange for warning zones (min/max alarm)
      case 'normal': return '#13c613ff' // green for normal zone
      default: return '#000000' // black for other zones
    }
  }
  
  // Zone colors from left to right: red, orange, green, orange, red
  // Red zones are outside alarm thresholds (warning zones)
  // Orange zones are between alarm and operational thresholds  
  // Green zone is between operational thresholds (normal)
  const warningColor = '#ff0000'    // Red for warning zones (outside alarm thresholds)
  const operationalColor = '#ff8c00'   // Orange for operational boundary zones
  const normalColor = '#13c613ff'   // Green for normal zone (between min/max operational)
  
  // Use consistent defined colors for pond limits too
  const topPondColor = '#666666'    // Gray for pond reference limits
  const bottomPondColor = '#666666' // Gray for pond reference limits
    
  
  // Determine the gauge range - use pond limits as primary bounds when available
  // This ensures warning zones are always visible since they extend to pond limits
  let gaugeMax, gaugeMin
  
  // Always use pond limits as gauge bounds when they exist
  if (effectiveTopOfPond !== undefined && bottomOfPond !== undefined) {
    gaugeMax = effectiveTopOfPond
    gaugeMin = bottomOfPond
  } else {
    // Fallback to alarm thresholds with extension if no pond limits
    const operationalRange = (effectiveMaxOp !== undefined && effectiveMinOp !== undefined) 
      ? effectiveMaxOp - effectiveMinOp : 1
    const extension = operationalRange * 0.15
    
    gaugeMax = effectiveMaxAlarm !== undefined ? effectiveMaxAlarm + extension : 
                   (effectiveTopOfPond !== undefined ? effectiveTopOfPond :
                   (effectiveMaxOp !== undefined ? effectiveMaxOp : 100))
    gaugeMin = effectiveMinAlarm !== undefined ? effectiveMinAlarm - extension : 
                   (bottomOfPond !== undefined ? bottomOfPond :
                   (effectiveMinOp !== undefined ? effectiveMinOp : 0))
  }
  
  // Create gauge sectors for all 5 zones when all boundaries exist
  const createGaugeSectors = () => {
    const sectors = []
    
    // Check if we have the necessary boundaries to create zones
    const hasOperationalBounds = effectiveMinOp !== undefined && effectiveMaxOp !== undefined
      
    if (hasOperationalBounds) {
      // Standard case with operational boundaries: Build zones from bottom to top
      // Zone structure from left to right on gauge: red, orange, green, orange, red
      // 1. Warning Low (from gauge min/bottom to min alarm) - RED
      // 2. Operational Low (from min alarm to min operational) - ORANGE
      // 3. Normal (from min operational to max operational) - GREEN  
      // 4. Operational High (from max operational to max alarm) - ORANGE
      // 5. Warning High (from max alarm to gauge max/top) - RED
      
      // Calculate actual ranges first
      const rawSectors = []
      
      // Zone 1: Warning Low (from gauge min to min alarm) - RED
      if (effectiveMinAlarm !== undefined && gaugeMin <= effectiveMinAlarm) {
        const range = effectiveMinAlarm - gaugeMin
        rawSectors.push({
          name: 'Warning Low Zone',
          actualRange: range,
          color: warningColor,
          upperBound: effectiveMinAlarm,
          lowerBound: gaugeMin,
          zone: 'warning-low'
        })
      }
        
      // Zone 2: Operational Low (between min alarm and min operational) - ORANGE
      if (effectiveMinAlarm !== undefined && effectiveMinOp !== undefined && effectiveMinAlarm <= effectiveMinOp) {
        const range = effectiveMinOp - effectiveMinAlarm
        rawSectors.push({
          name: 'Operational Low Zone',
          actualRange: range,
          color: operationalColor,
          upperBound: effectiveMinOp,
          lowerBound: effectiveMinAlarm,
          zone: 'operational-low'
        })
      }
        
      // Zone 3: Normal (between min and max operational) - GREEN
      const normalRange = effectiveMaxOp - effectiveMinOp
      rawSectors.push({
        name: 'Normal Zone',
        actualRange: normalRange,
        color: normalColor,
        upperBound: effectiveMaxOp,
        lowerBound: effectiveMinOp,
        zone: 'normal'
      })
        
      // Zone 4: Operational High (between max operational and max alarm) - ORANGE
      if (effectiveMaxAlarm !== undefined && effectiveMaxOp !== undefined && effectiveMaxOp <= effectiveMaxAlarm) {
        const range = effectiveMaxAlarm - effectiveMaxOp
        rawSectors.push({
          name: 'Operational High Zone',
          actualRange: range,
          color: operationalColor,
          upperBound: effectiveMaxAlarm,
          lowerBound: effectiveMaxOp,
          zone: 'operational-high'
        })
      }
        
      // Zone 5: Warning High (from max alarm to gauge max) - RED
      if (effectiveMaxAlarm !== undefined && effectiveMaxAlarm <= gaugeMax) {
        const range = gaugeMax - effectiveMaxAlarm
        rawSectors.push({
          name: 'Warning High Zone',
          actualRange: range,
          color: warningColor,
          upperBound: gaugeMax,
          lowerBound: effectiveMaxAlarm,
          zone: 'warning-high'
        })
      }
      
      // Ensure all zones fit within the 180-degree semicircle
      // Use actual ranges but apply constraints to ensure visibility
      const totalActualRange = rawSectors.reduce((sum, sector) => sum + sector.actualRange, 0)
      const minVisiblePortion = 0.01 // Minimum 1% of total range to ensure visibility
      const maxVisiblePortion = 0.7  // Maximum 70% to prevent one zone from dominating
      
      // First pass: identify zones that need adjustment
      let adjustedSectors = rawSectors.map(sector => {
        const actualProportion = sector.actualRange / totalActualRange
        let adjustedProportion = actualProportion
        
        // Ensure very small zones are still visible
        if (actualProportion > 0 && actualProportion < minVisiblePortion) {
          adjustedProportion = minVisiblePortion
        }
        // Cap very large zones to prevent them from hiding others
        else if (actualProportion > maxVisiblePortion) {
          adjustedProportion = maxVisiblePortion
        }
        
        return {
          ...sector,
          adjustedProportion: adjustedProportion
        }
      })
      
      // Second pass: normalize to ensure total adds up to 1.0
      const totalAdjusted = adjustedSectors.reduce((sum, sector) => sum + sector.adjustedProportion, 0)
      const normalizationFactor = 1.0 / totalAdjusted
      
      adjustedSectors.forEach(sector => {
        const finalProportion = sector.adjustedProportion * normalizationFactor
        sectors.push({
          name: sector.name,
          value: finalProportion * totalActualRange, // Scale back to data range for needle calc
          color: sector.color,
          upperBound: sector.upperBound,
          lowerBound: sector.lowerBound,
          zone: sector.zone,
          visualProportion: finalProportion // Store for reference
        })
      })
    } else {
      // Fallback: create sectors based on available boundaries
      const boundaries = []
      if (maxAlarm !== undefined) boundaries.push({ value: maxAlarm, name: 'Max Alarm' })
      if (maxOperational !== undefined) boundaries.push({ value: maxOperational, name: 'Max Op' })
      if (minOperational !== undefined) boundaries.push({ value: minOperational, name: 'Min Op' })
      if (minAlarm !== undefined) boundaries.push({ value: minAlarm, name: 'Min Alarm' })
      
      // Add range bounds
      boundaries.push({ value: gaugeMax, name: 'Range Max' })
      boundaries.push({ value: gaugeMin, name: 'Range Min' })
      
      boundaries.sort((a, b) => a.value - b.value)
      const uniqueBoundaries = boundaries.filter((boundary, index, arr) => 
        index === 0 || boundary.value !== arr[index - 1].value
      )
      
      for (let i = 0; i < uniqueBoundaries.length - 1; i++) {
        const lowerBound = uniqueBoundaries[i]
        const upperBound = uniqueBoundaries[i + 1]
        const zoneRange = upperBound.value - lowerBound.value
        
        if (zoneRange > 0) {
          sectors.push({
            name: `${lowerBound.name} to ${upperBound.name}`,
            value: zoneRange,
            color: getZoneColor('normal'),
            upperBound: upperBound.value,
            lowerBound: lowerBound.value,
            zone: `${lowerBound.name}-${upperBound.name}`
          })
        }
      }
    }
    
    return sectors
  }
  
  const gaugeSectors = createGaugeSectors()
  const RADIAN = Math.PI / 180
  const width = 300  // Gauge width
  const height = 200 // Gauge height
  const chartWidth = width  // PieChart width
  const chartHeight = height // PieChart height
  const cx = chartWidth / 2      // Center X in chart coordinates
  const cy = chartWidth / 2      // Center Y in chart coordinates  
  const iR = (width / 2) * 0.5   // Inner radius based on gauge size
  const oR = (width / 2) * 0.8   // Outer radius based on gauge size
  
  
  // Calculate needle value based on current level position within the gauge range
  const calculateNeedleValue = () => {
    const total = gaugeSectors.reduce((sum, sector) => sum + sector.value, 0)
    let cumulativeValue = 0
    
    // Find which sector contains the current level and calculate cumulative value
    for (let i = 0; i < gaugeSectors.length; i++) {
      const sector = gaugeSectors[i]
      
      if (currentLevel >= sector.lowerBound && currentLevel <= sector.upperBound) {
        // Calculate how far into this sector we are (0 to 1)
        const sectorRange = sector.upperBound - sector.lowerBound
        const positionInSector = sectorRange > 0 
          ? (currentLevel - sector.lowerBound) / sectorRange 
          : 0.5 // If no range, position in middle
        
        // Add the portion of this sector that comes before our position
        const needleValue = cumulativeValue + (positionInSector * sector.value)
        return needleValue
      }
      
      cumulativeValue += sector.value
    }
    
    // Handle edge cases
    if (currentLevel <= gaugeMin) {
      return 0 // Far left
    }
    if (currentLevel >= gaugeMax) {
      return total // Far right
    }
    
    return total / 2 // Fallback to middle
  }

  const needleValue = calculateNeedleValue()

  // Custom label function to show zone ranges outside the sectors (currently disabled)
  /*
  const renderZoneLabel = ({ cx, cy, midAngle, outerRadius, index }: any) => {
    if (index >= gaugeSectors.length) return null
    
    const sector = gaugeSectors[index]
    const labelRadius = outerRadius + 15 // Reduced distance from outer radius
    const rawX = cx + labelRadius * Math.cos(-midAngle * RADIAN)
    const rawY = cy + labelRadius * Math.sin(-midAngle * RADIAN)
    
    // Format the range text - use two decimal places
    const rangeText = `${sector.lowerBound}-${sector.upperBound}`
    
    // Calculate container boundaries (assuming 400px chart width)
    const containerLeft = 20
    const containerRight = chartWidth - 20
    const containerTop = 20
    const containerBottom = chartHeight - 20
    
    // Constrain label position to stay within container bounds
    let x = rawX
    let y = rawY
    let textAnchor = "middle"
    
    // Adjust horizontal positioning based on angle and container bounds
    if (midAngle >= 45 && midAngle <= 135) {
      // Labels on the right side - ensure they don't go past right boundary
      textAnchor = "start"
      x = Math.min(rawX, containerRight - 50) // Leave 50px margin for text
    } else if (midAngle >= 225 && midAngle <= 315) {
      // Labels on the left side - ensure they don't go past left boundary
      textAnchor = "end" 
      x = Math.max(rawX, containerLeft + 50) // Leave 50px margin for text
    } else {
      // Labels on top/bottom - center them
      textAnchor = "middle"
      x = Math.max(containerLeft + 30, Math.min(rawX, containerRight - 30))
    }
    
    // Constrain vertical positioning
    y = Math.max(containerTop + 10, Math.min(rawY, containerBottom - 10))
    
    return (
      <text
        x={x}
        y={y}
        fill="#333"
        textAnchor={textAnchor}
        dominantBaseline="central"
        fontSize="10"
        fontWeight="600"
        style={{ 
          textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        {rangeText}
      </text>
    )
  }
  */

  // Arrow component for needle - using Recharts approach
  const Arrow = () => {
    const total = gaugeSectors.reduce((sum, sector) => sum + sector.value, 0)
    const ang = 180.0 * (1 - needleValue / total)
    const length = (iR + 2 * oR) / 3
    const sin = Math.sin(-RADIAN * ang)
    const cos = Math.cos(-RADIAN * ang)
    const r = 5
    const x0 = cx + 5
    const y0 = cy + 5
    const xba = x0 + r * sin
    const yba = y0 - r * cos
    const xbb = x0 - r * sin
    const ybb = y0 + r * cos
    const xp = x0 + length * cos
    const yp = y0 + length * sin
    
    return (
      <g>
        <circle cx={x0} cy={y0} r={r} fill="#000000" stroke="none" />
        <path
          d={`M${xba} ${yba}L${xbb} ${ybb} L${xp} ${yp} L${xba} ${yba}`}
          stroke="none"
          fill="#000000"
        />
      </g>
    )
  }
  
  const pieProps = {
    startAngle: 180,
    endAngle: 0,
    cx: cx,
    cy: cy,
    isAnimationActive: false
  }
  
  const getCurrentZoneInfo = () => {
    // Check if we have operational boundaries
    const hasOperationalBounds = effectiveMinOp !== undefined && effectiveMaxOp !== undefined
    
    if (hasOperationalBounds) {
      // Check zones from highest to lowest
      // Warning High: At or above max alarm (RED zone)
      if (effectiveMaxAlarm !== undefined && currentLevel >= effectiveMaxAlarm) {
        return { name: 'Warning High', color: warningColor, type: 'warning' }
      }
      
      // Operational High: Between max operational and max alarm (ORANGE zone)
      if (effectiveMaxOp !== undefined && effectiveMaxAlarm !== undefined && 
          currentLevel >= effectiveMaxOp && currentLevel < effectiveMaxAlarm) {
        return { name: 'Operational High', color: operationalColor, type: 'operational' }
      }
      
      // Operational Low: Between min alarm and min operational (ORANGE zone)
      if (effectiveMinAlarm !== undefined && effectiveMinOp !== undefined && 
          currentLevel > effectiveMinAlarm && currentLevel <= effectiveMinOp) {
        return { name: 'Operational Low', color: operationalColor, type: 'operational' }
      }
      
      // Normal zone: Between min and max operational (GREEN zone)
      if (currentLevel > effectiveMinOp && currentLevel < effectiveMaxOp) {
        return { name: 'Normal', color: normalColor, type: 'normal' }
      }
      
      // Warning Low: At or below min alarm (RED zone)
      if (effectiveMinAlarm !== undefined && currentLevel <= effectiveMinAlarm) {
        return { name: 'Warning Low', color: warningColor, type: 'warning' }
      }
    }
    
    return { name: 'Normal', color: normalColor, type: 'normal' }
  }
  
  const currentZoneInfo = getCurrentZoneInfo()
  const currentColor = currentZoneInfo.color
  const currentZoneName = currentZoneInfo.name
  
  const [isExpanded, setIsExpanded] = useState(false)
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }
  
  return (
    <div className={`water-gauge ${isExpanded ? 'expanded' : ''}`} onClick={toggleExpanded}>
      <div className="gauge-header">
        <h3 className="gauge-title">{name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: currentColor,
            color: '#fff',
            fontWeight: 'bold'
          }}>
            {currentZoneName}
          </span>
          <button className="expand-button">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>
      
      <div className="gauge-container">
        <PieChart width={chartWidth} height={chartHeight}>
          {/* Main gauge sectors */}
          <Pie
            stroke="white"
            strokeWidth={1}
            data={gaugeSectors}
            innerRadius={iR}
            outerRadius={oR}
            {...pieProps}
            dataKey="value"
            // DISABLING LABELS FOR NOW
            //label={renderZoneLabel}
            labelLine={false}
          >
            {gaugeSectors.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={1} />
            ))}
          </Pie>
          
          {/* Always visible needle - render directly */}
          {/* Semicircle: 180° (left) to 0° (right) */}
          <Arrow />
        </PieChart>
        
        <div className="gauge-labels">
          <span className="gauge-label-left">{bottomOfPond !== undefined ? `BOP: ${bottomOfPond}` : ''}</span>
          <span className="gauge-label-center">NWL: {normalLevel !== undefined ? normalLevel : ''}</span>
          <span className="gauge-label-right">{topOfPond !== undefined ? `TOP: ${topOfPond}` : ''}</span>
        </div>
        
        <div className="gauge-value">
          <div className="current-value" style={{ 
            backgroundColor: currentColor,
            color: 'white',
            fontWeight: 'bold',
            borderRadius: '50px',
            padding: '8px 16px',
            display: 'inline-block'
          }}>
            {currentLevel}
          </div>
          <div className="value-label">Current WL (ft)</div>
        </div>
      </div>
     
      <div className="last-updated" style={{
        textAlign: 'center',
        marginTop: '8px',
        padding: '4px',
        fontSize: '14px',
        color: 'black',
        backgroundColor: '#f5f5f5',
        borderRadius: '3px'
      }}>
        Last Updated: {new Date(lastUpdated).toLocaleString()}
      </div>
      
      {isExpanded && (
        <div className="gauge-details">
          <div className="current-status">
            <h4>Current Status</h4>
            <p><strong>Water Level:</strong> {currentLevel} ft</p>
            <p><strong>Normal Level:</strong> {normalLevel} ft</p>
            <p><strong>Deviation:</strong> {normalDeviation} in</p>
          </div>
          
          {/* Water Level Zones - Only visible when expanded */}
          <div className="zone-quick-reference" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '6px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            fontSize: '9px',
            alignItems: 'center',
            marginTop: '10px'
          }}>
            <strong style={{ fontSize: '11px', marginBottom: '4px' }}>Water Level Zones</strong>
            
            {/* Top of Pond - Reference only, not in gauge */}
            {effectiveTopOfPond !== undefined && effectiveTopOfPond !== null && !isNaN(effectiveTopOfPond) && (
              <div className="zone-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                border: `1px solid ${topPondColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: topPondColor,
                  borderRadius: '50%'
                }}></div>
                <span style={{ fontWeight: '500' }}>Top of Pond:</span>
                <span style={{ color: '#666' }}>{effectiveTopOfPond} ft</span>
              </div>
            )}
            
            {/* Warning High (Max Alarm) - Red boundary */}
            {effectiveMaxAlarm !== undefined && effectiveMaxAlarm !== null && !isNaN(effectiveMaxAlarm) && (
              <div className="zone-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                border: `1px solid ${warningColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: warningColor,
                  borderRadius: '50%'
                }}></div>
                <span style={{ fontWeight: '500' }}>Warning High:</span>
                <span style={{ color: '#666' }}>{effectiveMaxAlarm} ft</span>
              </div>
            )}
            
            {/* Operational High (Max Operational) - Orange boundary */}
            {effectiveMaxOp !== undefined && effectiveMaxOp !== null && !isNaN(effectiveMaxOp) && (
              <div className="zone-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                border: `1px solid ${operationalColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: operationalColor,
                  borderRadius: '50%'
                }}></div>
                <span style={{ fontWeight: '500' }}>Operational High:</span>
                <span style={{ color: '#666' }}>{effectiveMaxOp} ft</span>
              </div>
            )}
            
            {/* Normal Level - Green */}
            {normalLevel !== undefined && normalLevel !== null && !isNaN(normalLevel) && (
              <div className="zone-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                border: `1px solid ${normalColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: normalColor,
                  borderRadius: '50%'
                }}></div>
                <span style={{ fontWeight: '500' }}>Operational Level:</span>
                <span style={{ color: '#666' }}>{normalLevel} ft</span>
              </div>
            )}
            
            {/* Operational Low (Min Operational) - Orange boundary */}
            {effectiveMinOp !== undefined && effectiveMinOp !== null && !isNaN(effectiveMinOp) && (
              <div className="zone-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                border: `1px solid ${operationalColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: operationalColor,
                  borderRadius: '50%'
                }}></div>
                <span style={{ fontWeight: '500' }}>Operational Low:</span>
                <span style={{ color: '#666' }}>{effectiveMinOp} ft</span>
              </div>
            )}
            
            {/* Warning Low (Min Alarm) - Red boundary */}
            {effectiveMinAlarm !== undefined && effectiveMinAlarm !== null && !isNaN(effectiveMinAlarm) && (
              <div className="zone-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                border: `1px solid ${warningColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: warningColor,
                  borderRadius: '50%'
                }}></div>
                <span style={{ fontWeight: '500' }}>Warning Low:</span>
                <span style={{ color: '#666' }}>{effectiveMinAlarm} ft</span>
              </div>
            )}
            
            {/* Bottom of Pond - Reference only, not in gauge */}
            {bottomOfPond !== undefined && bottomOfPond !== null && !isNaN(bottomOfPond) && (
              <div className="zone-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                border: `1px solid ${bottomPondColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: bottomPondColor,
                  borderRadius: '50%'
                }}></div>
                <span style={{ fontWeight: '500' }}>Bottom of Pond:</span>
                <span style={{ color: '#666' }}>{(bottomOfPond === 0 && name.includes('Kirkman')) ? '0.00 ft' : bottomOfPond + ' ft'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WaterGauge