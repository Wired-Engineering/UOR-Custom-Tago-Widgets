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
  const maxAlarmColor = getZoneColor('operational')         // Red - navd_max_alarm_we (first level high after operational)
  const maxOpColor = getZoneColor('warning')      // Orange - navd_max_op_we (maximum high for operation)
  const normalColor = getZoneColor('normal')          // Green - navd_normal_we (normal)
  const minOpColor = getZoneColor('warning')      // Orange - navd_min_op_we (minimum low for operation) 
  const minAlarmColor = getZoneColor('operational')         // Red - navd_min_alarm_we (first low alarm after min operational)
  
  // Use consistent defined colors for pond limits too
  const topPondColor = '#666666'    // Gray for pond reference limits
  const bottomPondColor = '#666666' // Gray for pond reference limits
    
  
  // Determine the gauge range - use full alarm range for proper needle positioning
  const gaugeMax = maxAlarm !== undefined ? maxAlarm : 
                   (maxOperational !== undefined ? maxOperational : 100)
  const gaugeMin = minAlarm !== undefined ? minAlarm : 
                   (minOperational !== undefined ? minOperational : 0)  
  const gaugeRange = gaugeMax - gaugeMin
  
  // Create gauge sectors for all 5 zones when all boundaries exist
  const createGaugeSectors = () => {
    const sectors = []
    
    // Special case for Kirkman: when all lower thresholds are 0, only show normal zone
    const allLowerThresholdsZero = minAlarm === 0 && minOperational === 0 && maxOperational === 0
    
    // If we have all 4 boundaries, create the 5 standard zones
    // Order them from LEFT to RIGHT on semicircle (lowest to highest values)
    if (maxAlarm !== undefined && maxOperational !== undefined && 
        minOperational !== undefined && minAlarm !== undefined) {
      
      if (allLowerThresholdsZero) {
        // For Kirkman-like case: show only normal zone from 0 to maxAlarm
        sectors.push({
          name: 'Normal Zone',
          value: maxAlarm,
          color: getZoneColor('normal'), // Green
          upperBound: maxAlarm,
          lowerBound: 0,
          zone: 'normal'
        })
      } else {
        // Standard case: all 5 zones
        // Zone 1: Critical Low (below min alarm) - LEFT side
        const criticalLowRange = Math.max(0.1, (gaugeMax - minAlarm) * 0.1)
        sectors.push({
          name: 'Critical Low Zone',
          value: criticalLowRange,
          color: getZoneColor('operational'), // Red
          upperBound: minAlarm,
          lowerBound: Math.max(gaugeMin, minAlarm - criticalLowRange),
          zone: 'critical-low'
        })
        
        // Zone 2: Warning Low (between min alarm and min op)
        const warningLowRange = Math.max(0.05, minOperational - minAlarm)
        sectors.push({
          name: 'Warning Low Zone',
          value: warningLowRange,
          color: getZoneColor('warning'), // Orange
          upperBound: minOperational,
          lowerBound: minAlarm,
          zone: 'warning-low'
        })
        
        // Zone 3: Normal (between min op and max op) - CENTER
        const normalRange = Math.max(0.1, maxOperational - minOperational)
        sectors.push({
          name: 'Normal Zone',
          value: normalRange,
          color: getZoneColor('normal'), // Green
          upperBound: maxOperational,
          lowerBound: minOperational,
          zone: 'normal'
        })
        
        // Zone 4: Warning High (between max op and max alarm)
        const warningHighRange = Math.max(0.05, maxAlarm - maxOperational)
        sectors.push({
          name: 'Warning High Zone',
          value: warningHighRange,
          color: getZoneColor('warning'), // Orange
          upperBound: maxAlarm,
          lowerBound: maxOperational,
          zone: 'warning-high'
        })
        
        // Zone 5: Critical High (above max alarm) - RIGHT side
        const criticalHighRange = Math.max(0.1, (maxAlarm - gaugeMin) * 0.1)
        sectors.push({
          name: 'Critical High Zone',
          value: criticalHighRange,
          color: getZoneColor('operational'), // Red
          upperBound: maxAlarm + criticalHighRange,
          lowerBound: maxAlarm,
          zone: 'critical-high'
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
  const width = 400  // Gauge width
  const height = 250 // Gauge height
  const chartWidth = width  // PieChart width (extra space for labels)
  const chartHeight = height // PieChart height (extra space for labels)
  const cx = chartWidth / 2      // Center X in chart coordinates
  const cy = chartWidth / 2      // Center Y in chart coordinates  
  const iR = (width / 2) * 0.5   // Inner radius based on gauge size
  const oR = (width / 2) * 0.8   // Outer radius based on gauge size
  
  
  // Calculate where the needle should point based on current level
  const needlePosition = Math.max(0, Math.min(1, (currentLevel - gaugeMin) / gaugeRange))

  // Custom label function to show zone ranges outside the sectors
  const renderZoneLabel = ({ cx, cy, midAngle, outerRadius, index }: any) => {
    if (index >= gaugeSectors.length) return null
    
    const sector = gaugeSectors[index]
    const labelRadius = outerRadius + 15 // Reduced distance from outer radius
    const rawX = cx + labelRadius * Math.cos(-midAngle * RADIAN)
    const rawY = cy + labelRadius * Math.sin(-midAngle * RADIAN)
    
    // Format the range text - use two decimal places
    const rangeText = `${sector.lowerBound.toFixed(2)}-${sector.upperBound.toFixed(2)}`
    
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

  // Arrow component for needle
  const Arrow = ({ cx, cy, midAngle, outerRadius }: any) => {
    const sin = Math.sin(-RADIAN * midAngle)
    const cos = Math.cos(-RADIAN * midAngle)
    const mx = cx + (outerRadius + width * 0.03) * cos
    const my = cy + (outerRadius + width * 0.03) * sin
    
    return (
      <g>
        <path
          d={`M${cx},${cy}L${mx},${my}`}
          strokeWidth="4"
          stroke="#000000"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={width * 0.02} fill="white" stroke="#000000" strokeWidth="2" />
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
    // Special case for Kirkman: when all lower thresholds are 0, only check against maxAlarm
    const allLowerThresholdsZero = minAlarm === 0 && minOperational === 0 && maxOperational === 0
    
    if (allLowerThresholdsZero && maxAlarm !== undefined) {
      if (currentLevel > maxAlarm) {
        return { name: 'Critical High', color: getZoneColor('operational'), type: 'operational' }
      } else {
        return { name: 'Normal', color: getZoneColor('normal'), type: 'normal' }
      }
    }
    
    // Standard hierarchy for all other gauges
    // Critical High: Above max alarm
    if (maxAlarm !== undefined && currentLevel > maxAlarm) {
      return { name: 'Critical High', color: getZoneColor('operational'), type: 'operational' }
    }
    
    // Warning High: Between max operational and max alarm
    if (maxOperational !== undefined && maxAlarm !== undefined && 
        currentLevel > maxOperational && currentLevel <= maxAlarm) {
      return { name: 'Warning High', color: getZoneColor('warning'), type: 'warning' }
    }
    
    // Normal zone: Between min and max operational
    if (minOperational !== undefined && maxOperational !== undefined && 
        currentLevel >= minOperational && currentLevel <= maxOperational) {
      return { name: 'Normal', color: getZoneColor('normal'), type: 'normal' }
    }
    
    // Warning Low: Between min alarm and min operational
    if (minAlarm !== undefined && minOperational !== undefined && 
        currentLevel >= minAlarm && currentLevel < minOperational) {
      return { name: 'Warning Low', color: getZoneColor('warning'), type: 'warning' }
    }
    
    // Critical Low: Below min alarm
    if (minAlarm !== undefined && currentLevel < minAlarm) {
      return { name: 'Critical Low', color: getZoneColor('operational'), type: 'operational' }
    }
    
    return { name: 'Normal', color: getZoneColor('normal'), type: 'normal' }
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
            label={renderZoneLabel}
            labelLine={false}
          >
            {gaugeSectors.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={1} />
            ))}
          </Pie>
          
          {/* Always visible needle - render directly */}
          {/* Semicircle: 180° (left) to 0° (right), needlePosition 0=left, 1=right */}
          {Arrow({ cx, cy, midAngle: 180 - (needlePosition * 180), outerRadius: oR })}
        </PieChart>
        
        <div className="gauge-labels">
          <span className="gauge-label-left">{bottomOfPond}</span>
          <span className="gauge-label-center">NWL: {normalLevel}</span>
          <span className="gauge-label-right">{topOfPond}</span>
        </div>
        
        <div className="gauge-value">
          <div className="current-value" style={{ color: currentColor }}>
            {currentLevel}
          </div>
          <div className="value-label">Current WL (ft)</div>
        </div>
      </div>
      
      <div className="gauge-info">
        <div className="normal-deviation">
          Normal Elevation Deviation: {normalDeviation} in
        </div>
      </div>
      
        
      
      <div className="last-updated" style={{
        textAlign: 'center',
        marginTop: '8px',
        padding: '4px',
        fontSize: '10px',
        color: '#666',
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
            {topOfPond !== undefined && topOfPond !== null && !isNaN(topOfPond) && (
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
                <span style={{ color: '#666' }}>{topOfPond} ft</span>
              </div>
            )}
            
            {/* Warning High (Max Alarm) - Orange */}
            {maxAlarm !== undefined && maxAlarm !== null && !isNaN(maxAlarm) && (
              <div className="zone-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                border: `1px solid ${maxAlarmColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: maxAlarmColor,
                  borderRadius: '50%'
                }}></div>
                <span style={{ fontWeight: '500' }}>Warning High:</span>
                <span style={{ color: '#666' }}>{maxAlarm} ft</span>
              </div>
            )}
            
            {/* Operational High (Max Operational) - Red */}
            {maxOperational !== undefined && maxOperational !== null && !isNaN(maxOperational) && (
              <div className="zone-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                border: `1px solid ${maxOpColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: maxOpColor,
                  borderRadius: '50%'
                }}></div>
                <span style={{ fontWeight: '500' }}>Operational High:</span>
                <span style={{ color: '#666' }}>{maxOperational === 0 ? 'undefined' : `${maxOperational} ft`}</span>
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
                <span style={{ fontWeight: '500' }}>Normal Level:</span>
                <span style={{ color: '#666' }}>{normalLevel} ft</span>
              </div>
            )}
            
            {/* Operational Low (Min Operational) - Red */}
            {minOperational !== undefined && minOperational !== null && !isNaN(minOperational) && (
              <div className="zone-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                border: `1px solid ${minOpColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: minOpColor,
                  borderRadius: '50%'
                }}></div>
                <span style={{ fontWeight: '500' }}>Operational Low:</span>
                <span style={{ color: '#666' }}>{minOperational === 0 ? 'undefined' : `${minOperational} ft`}</span>
              </div>
            )}
            
            {/* Warning Low (Min Alarm) - Orange */}
            {minAlarm !== undefined && minAlarm !== null && !isNaN(minAlarm) && (
              <div className="zone-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                border: `1px solid ${minAlarmColor}`,
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: minAlarmColor,
                  borderRadius: '50%'
                }}></div>
                <span style={{ fontWeight: '500' }}>Warning Low:</span>
                <span style={{ color: '#666' }}>{minAlarm === 0 ? 'undefined' : `${minAlarm} ft`}</span>
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
                <span style={{ color: '#666' }}>{bottomOfPond} ft</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WaterGauge