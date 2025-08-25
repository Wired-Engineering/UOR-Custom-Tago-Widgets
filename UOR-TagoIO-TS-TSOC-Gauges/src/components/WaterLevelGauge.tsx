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
  // Treat 0 values as undefined (except for bottom of pond which can legitimately be 0)
  const effectiveMinOp = minOperational === 0 ? undefined : minOperational
  const effectiveMaxOp = maxOperational === 0 ? undefined : maxOperational
  const effectiveMinAlarm = minAlarm === 0 ? undefined : minAlarm
  const effectiveMaxAlarm = maxAlarm === 0 ? undefined : maxAlarm
  const effectiveTopOfPond = topOfPond === 0 ? undefined : topOfPond
  // Define zone colors - override metadata colors to match requirements
  const getZoneColor = (zoneType: string) => {
    switch(zoneType) {
      case 'operational': return '#ff0000' // red for operational zones (min/max operational)
      case 'warning': return '#ff8c00' // orange for warning zones (min/max alarm)
      case 'normal': return '#13c613ff' // green for normal zone
      default: return '#000000' // black for other zones
    }
  }
  
  // Zone colors based on correct hierarchy from user specification
  // Bottom to top: bottom of pond to warning low (red), warning low to operational low (orange),
  // operational low to operational high (green), operational high to warning high (orange),
  // warning high to top of pond (red)
  const criticalColor = '#ff0000'   // Red for critical zones (outside warning thresholds)
  const warningColor = '#ff8c00'    // Orange for warning zones (between alarm and operational)
  const normalColor = '#13c613ff'   // Green for normal/operational zone
  
  // Use consistent defined colors for pond limits too
  const topPondColor = '#666666'    // Gray for pond reference limits
  const bottomPondColor = '#666666' // Gray for pond reference limits
    
  
  // Determine the gauge range - use alarm thresholds with a small extension for critical zones
  // Calculate operational range for sizing the extension
  const operationalRange = (effectiveMaxOp !== undefined && effectiveMinOp !== undefined) 
    ? effectiveMaxOp - effectiveMinOp : 1
    
  // Use alarm thresholds as base, with 15% operational range extension for critical zones
  const extension = operationalRange * 0.15
  
  let gaugeMax = effectiveMaxAlarm !== undefined ? effectiveMaxAlarm + extension : 
                 (effectiveTopOfPond !== undefined ? effectiveTopOfPond :
                 (effectiveMaxOp !== undefined ? effectiveMaxOp : 100))
  let gaugeMin = effectiveMinAlarm !== undefined ? effectiveMinAlarm - extension : 
                 (bottomOfPond !== undefined ? bottomOfPond :
                 (effectiveMinOp !== undefined ? effectiveMinOp : 0))
  
  // But don't extend beyond pond limits if they exist
  if (effectiveTopOfPond !== undefined && gaugeMax > effectiveTopOfPond) {
    gaugeMax = effectiveTopOfPond
  }
  if (bottomOfPond !== undefined && gaugeMin < bottomOfPond) {
    gaugeMin = bottomOfPond
  }
  
  const gaugeRange = gaugeMax - gaugeMin
  
  // Create gauge sectors for all 5 zones when all boundaries exist
  const createGaugeSectors = () => {
    const sectors = []
    
    // Check if we have the necessary boundaries to create zones
    const hasOperationalBounds = effectiveMinOp !== undefined && effectiveMaxOp !== undefined
    const hasAlarmBounds = effectiveMinAlarm !== undefined || effectiveMaxAlarm !== undefined
      
    if (hasOperationalBounds) {
      // Standard case with operational boundaries: Build zones from bottom to top
      // Zone structure from bottom to top:
      // 1. Bottom of pond/gauge min to warning low (min alarm) - RED
      // 2. Warning low (min alarm) to operational low (min op) - ORANGE  
      // 3. Operational low (min op) to operational high (max op) - GREEN
      // 4. Operational high (max op) to warning high (max alarm) - ORANGE
      // 5. Warning high (max alarm) to top of pond/gauge max - RED
        
      // Create sectors with proportional visual sizes based on their actual ranges
      // This accurately represents the data but requires matching needle calculation
      
      // Zone 1: Critical Low (from gauge min to min alarm) - RED
      if (effectiveMinAlarm !== undefined && gaugeMin < effectiveMinAlarm) {
        const range = effectiveMinAlarm - gaugeMin
        sectors.push({
          name: 'Critical Low Zone',
          value: range,
          color: criticalColor, // Red
          upperBound: effectiveMinAlarm,
          lowerBound: gaugeMin,
          zone: 'critical-low'
        })
      }
        
      // Zone 2: Warning Low (between min alarm and min op) - ORANGE
      if (effectiveMinAlarm !== undefined && effectiveMinOp !== undefined && effectiveMinAlarm < effectiveMinOp) {
        const range = effectiveMinOp - effectiveMinAlarm
        sectors.push({
          name: 'Warning Low Zone',
          value: range,
          color: warningColor, // Orange
          upperBound: effectiveMinOp,
          lowerBound: effectiveMinAlarm,
          zone: 'warning-low'
        })
      }
        
      // Zone 3: Normal/Operational (between min op and max op) - GREEN
      const normalRange = effectiveMaxOp - effectiveMinOp
      sectors.push({
        name: 'Normal Zone',
        value: normalRange,
        color: normalColor, // Green
        upperBound: effectiveMaxOp,
        lowerBound: effectiveMinOp,
        zone: 'normal'
      })
        
      // Zone 4: Warning High (between max op and max alarm) - ORANGE
      if (effectiveMaxAlarm !== undefined && effectiveMaxOp < effectiveMaxAlarm) {
        const range = effectiveMaxAlarm - effectiveMaxOp
        sectors.push({
          name: 'Warning High Zone',
          value: range,
          color: warningColor, // Orange
          upperBound: effectiveMaxAlarm,
          lowerBound: effectiveMaxOp,
          zone: 'warning-high'
        })
      }
        
      // Zone 5: Critical High (from max alarm to gauge max) - RED
      if (effectiveMaxAlarm !== undefined && effectiveMaxAlarm < gaugeMax) {
        const range = gaugeMax - effectiveMaxAlarm
        sectors.push({
          name: 'Critical High Zone',
          value: range,
          color: criticalColor, // Red
          upperBound: gaugeMax,
          lowerBound: effectiveMaxAlarm,
          zone: 'critical-high'
        })
      }
    } else if (hasAlarmBounds) {
      // Case with only alarm boundaries (no operational boundaries)
      // This includes cases like Kirkman where operational values are 0/undefined
      
      // For Kirkman-style case: create zones with warning high between normal and critical
      if (effectiveMinAlarm !== undefined && gaugeMin < effectiveMinAlarm) {
        // Red zone below min alarm
        sectors.push({
          name: 'Critical Low Zone',
          value: effectiveMinAlarm - gaugeMin,
          color: criticalColor,
          upperBound: effectiveMinAlarm,
          lowerBound: gaugeMin,
          zone: 'critical-low'
        })
      }
      
      // Create zones based on normal level and max alarm
      if (effectiveMaxAlarm !== undefined) {
        // Green zone: from min alarm (or gauge min) to 80% of the way to max alarm
        const greenLowerBound = effectiveMinAlarm !== undefined ? effectiveMinAlarm : gaugeMin
        const alarmRange = effectiveMaxAlarm - normalLevel
        const greenUpperBound = normalLevel + (alarmRange * 0.6) // Green zone covers 60% of range to alarm
        
        if (greenUpperBound > greenLowerBound) {
          sectors.push({
            name: 'Normal Zone',
            value: greenUpperBound - greenLowerBound,
            color: normalColor,
            upperBound: greenUpperBound,
            lowerBound: greenLowerBound,
            zone: 'normal'
          })
        }
        
        // Warning High zone: from normal buffer to max alarm
        if (effectiveMaxAlarm > greenUpperBound) {
          sectors.push({
            name: 'Warning High Zone',
            value: effectiveMaxAlarm - greenUpperBound,
            color: warningColor,
            upperBound: effectiveMaxAlarm,
            lowerBound: greenUpperBound,
            zone: 'warning-high'
          })
        }
        
        // Critical High zone: from max alarm to gauge max
        if (gaugeMax > effectiveMaxAlarm) {
          sectors.push({
            name: 'Critical High Zone',
            value: gaugeMax - effectiveMaxAlarm,
            color: criticalColor,
            upperBound: gaugeMax,
            lowerBound: effectiveMaxAlarm,
            zone: 'critical-high'
          })
        }
      } else {
        // Fallback if no max alarm: simple green zone
        sectors.push({
          name: 'Normal Zone',
          value: gaugeRange,
          color: normalColor,
          upperBound: gaugeMax,
          lowerBound: gaugeMin,
          zone: 'normal'
        })
      }
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
  
  
  // Calculate needle value based on current level position within the sectors
  const calculateNeedleValue = () => {
    const total = gaugeSectors.reduce((sum, sector) => sum + sector.value, 0)
    let cumulativeValue = 0
    
    // Find which sector contains the current level and calculate cumulative value
    for (let i = 0; i < gaugeSectors.length; i++) {
      const sector = gaugeSectors[i]
      
      if (currentLevel >= sector.lowerBound && currentLevel <= sector.upperBound) {
        // Calculate how far into this sector we are (0 to 1)
        const positionInSector = (currentLevel - sector.lowerBound) / (sector.upperBound - sector.lowerBound)
        // Add the portion of this sector that comes before our position
        const needleValue = cumulativeValue + (positionInSector * sector.value)
        
        return needleValue
      }
      
      cumulativeValue += sector.value
    }
    
    // Handle edge cases
    if (currentLevel < gaugeMin) {
      return 0 // Far left
    }
    if (currentLevel > gaugeMax) {
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
      // Standard hierarchy with operational thresholds - check from highest to lowest
      // Critical High: At or above max alarm
      if (effectiveMaxAlarm !== undefined && currentLevel >= effectiveMaxAlarm) {
        return { name: 'Critical High', color: criticalColor, type: 'critical' }
      }
      
      // Warning High: At or above max operational but below max alarm
      if (effectiveMaxOp !== undefined && effectiveMaxAlarm !== undefined && 
          currentLevel >= effectiveMaxOp && currentLevel < effectiveMaxAlarm) {
        return { name: 'Warning High', color: warningColor, type: 'warning' }
      }
      
      // Warning Low: At or below min operational but above min alarm  
      if (effectiveMinAlarm !== undefined && effectiveMinOp !== undefined && 
          currentLevel > effectiveMinAlarm && currentLevel <= effectiveMinOp) {
        return { name: 'Warning Low', color: warningColor, type: 'warning' }
      }
      
      // Normal zone: Between min and max operational (exclusive of boundaries)
      if (currentLevel > effectiveMinOp && currentLevel < effectiveMaxOp) {
        return { name: 'Operational', color: normalColor, type: 'normal' }
      }
      
      // Critical Low: At or below min alarm
      if (effectiveMinAlarm !== undefined && currentLevel <= effectiveMinAlarm) {
        return { name: 'Critical Low', color: criticalColor, type: 'critical' }
      }
    } else {
      // Only alarm thresholds available (like Kirkman case)
      if (effectiveMaxAlarm !== undefined && currentLevel >= effectiveMaxAlarm) {
        return { name: 'Critical High', color: criticalColor, type: 'critical' }
      }
      
      // Check if we're in warning high zone (similar to sector logic)
      if (effectiveMaxAlarm !== undefined) {
        const alarmRange = effectiveMaxAlarm - normalLevel
        const greenUpperBound = normalLevel + (alarmRange * 0.6)
        
        if (currentLevel > greenUpperBound && currentLevel < effectiveMaxAlarm) {
          return { name: 'Warning High', color: warningColor, type: 'warning' }
        }
      }
      
      if (effectiveMinAlarm !== undefined && currentLevel <= effectiveMinAlarm) {
        return { name: 'Critical Low', color: criticalColor, type: 'critical' }
      }
    }
    
    return { name: 'Operational', color: normalColor, type: 'normal' }
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
            <p><strong>Operational Level:</strong> {normalLevel} ft</p>
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
                border: `1px solid ${criticalColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: criticalColor,
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
                border: `1px solid ${warningColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: warningColor,
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
                border: `1px solid ${warningColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: warningColor,
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
                border: `1px solid ${criticalColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: criticalColor,
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