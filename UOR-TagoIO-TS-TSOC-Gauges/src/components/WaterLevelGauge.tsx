import { useState } from 'preact/compat'
import { FunctionComponent } from 'preact'
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
  metadata?: Record<string, any>
}

const RADIAN = Math.PI / 180

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
  lastUpdated,
  metadata
}) => {
  // Extract colors from metadata if available, default to black if undefined
  const getColor = (variable: string) => {
    if (metadata && metadata[variable]) {
      try {
        // Check if metadata[variable] is already parsed or needs parsing
        const metadataValue = typeof metadata[variable] === 'string' 
          ? JSON.parse(metadata[variable]) 
          : metadata[variable]
        
        return metadataValue.color || '#000000'
      } catch {
        return '#000000'
      }
    }
    return '#000000'
  }
  
  const topPondColor = getColor('device_navd_alarm_top')
  const maxOpColor = getColor('device_navd_max_op_we')
  const minOpColor = getColor('device_navd_min_op_we')
  const maxAlarmColor = getColor('device_navd_max_alarm_we')
  const minAlarmColor = getColor('device_navd_min_alarm_we')
  const normalColor = getColor('device_navd_normal_we')
  const bottomPondColor = getColor('device_navd_alarm_bop')
  
  // Create array of all zones with their values, sorted from highest to lowest
  const allZones = [
    { name: 'Top of Pond', value: topOfPond, color: topPondColor },
    { name: 'Max Operational', value: maxOperational, color: maxOpColor },
    { name: 'Warning High', value: maxAlarm, color: maxAlarmColor },
    { name: 'Normal Level', value: normalLevel, color: normalColor },
    { name: 'Warning Low', value: minAlarm, color: minAlarmColor },
    { name: 'Min Operational', value: minOperational, color: minOpColor },
    { name: 'Bottom of Pond', value: bottomOfPond, color: bottomPondColor }
  ].filter((zone): zone is { name: string, value: number, color: string } => 
    zone.value !== undefined && zone.value !== null && !isNaN(zone.value))
    .sort((a, b) => b.value - a.value)
  
  // Determine the gauge range - use full pond range if both top and bottom are defined
  const gaugeMax = (topOfPond !== undefined && bottomOfPond !== undefined) 
    ? topOfPond 
    : (allZones.length > 0 ? allZones[0].value : 100)
  const gaugeMin = (topOfPond !== undefined && bottomOfPond !== undefined) 
    ? bottomOfPond 
    : (allZones.length > 0 ? allZones[allZones.length - 1].value : 0)
  const gaugeRange = gaugeMax - gaugeMin
  
  // Create gauge sectors based on available zones (proportional to zone ranges)
  const createGaugeSectors = () => {
    if (allZones.length < 2) return []
    
    const sectors = []
    
    for (let i = 0; i < allZones.length - 1; i++) {
      const upperZone = allZones[i]
      const lowerZone = allZones[i + 1]
      const zoneRange = upperZone.value - lowerZone.value
      
      sectors.push({
        name: `${lowerZone.name} to ${upperZone.name}`,
        value: zoneRange, // Use actual range as value
        color: lowerZone.color,
        upperBound: upperZone.value,
        lowerBound: lowerZone.value,
        zone: lowerZone.name
      })
    }
    
    return sectors
  }
  
  const data = createGaugeSectors()
  
  // Calculate needle position based on actual value relative to gauge range
  // Map current level to a position within the total gauge range
  const needleValue = currentLevel - gaugeMin
  
  // Needle path calculation
  const cx = 150
  const cy = 150
  const iR = 40
  const oR = 100
  
  const needle = (value: number, data: any[], cx: number, cy: number, iR: number, oR: number, color: string) => {
    // Calculate total range - use full gauge range when available
    const total = gaugeRange
    // Calculate angle - 180 degrees total range, value proportional to total
    const ang = 180.0 * (1 - value / total)
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
      <>
        <circle key="needle-circle" cx={x0} cy={y0} r={r} fill={color} stroke="none" />
        <path
          key="needle-path"
          d={`M${xba} ${yba}L${xbb} ${ybb} L${xp} ${yp} L${xba} ${yba}`}
          stroke="none"
          fill={color}
        />
      </>
    )
  }
  
  const getCurrentZoneInfo = () => {
    // Find which zone the current level falls into
    for (let i = 0; i < allZones.length; i++) {
      const zone = allZones[i]
      
      // Check if current level matches this specific zone's value (within tolerance)
      const tolerance = 0.5 // Allow small tolerance for exact matches
      if (Math.abs(currentLevel - zone.value) <= tolerance) {
        return { name: zone.name, color: zone.color }
      }
      
      // Check if current level is between this zone and the next
      if (i < allZones.length - 1) {
        const upperZone = zone // Higher value (zones are sorted desc)
        const lowerZone = allZones[i + 1] // Lower value
        
        if (currentLevel <= upperZone.value && currentLevel >= lowerZone.value) {
          // Determine which zone we're closer to
          const distanceToUpper = Math.abs(currentLevel - upperZone.value)
          const distanceToLower = Math.abs(currentLevel - lowerZone.value)
          
          if (distanceToUpper < distanceToLower) {
            return { name: upperZone.name, color: upperZone.color }
          } else {
            return { name: lowerZone.name, color: lowerZone.color }
          }
        }
      }
    }
    
    // If above all zones
    if (allZones.length > 0 && currentLevel > allZones[0].value) {
      return { name: 'Above ' + allZones[0].name, color: allZones[0].color }
    }
    
    // If below all zones  
    if (allZones.length > 0 && currentLevel < allZones[allZones.length - 1].value) {
      return { name: 'Below ' + allZones[allZones.length - 1].name, color: allZones[allZones.length - 1].color }
    }
    
    // Handle full pond range cases when no zones match
    if (topOfPond !== undefined && bottomOfPond !== undefined) {
      if (currentLevel > gaugeMax) {
        return { name: 'Above Top of Pond', color: '#ff0000' }
      }
      if (currentLevel < gaugeMin) {
        return { name: 'Below Bottom of Pond', color: '#ff0000' }
      }
      return { name: 'Within Pond Range', color: '#666666' }
    }
    
    return { name: 'Unknown', color: '#000000' }
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
        <PieChart width={300} height={200}>
          <Pie
            dataKey="value"
            startAngle={180}
            endAngle={0}
            data={data}
            cx={cx}
            cy={cy}
            innerRadius={iR}
            outerRadius={oR}
            fill="#8884d8"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {needle(needleValue, data, cx, cy, iR, oR, '#000000')}
        </PieChart>
        
        <div className="gauge-labels">
          <span className="gauge-label-left">{gaugeMin}</span>
          <span className="gauge-label-center">NWL: {normalLevel}</span>
          <span className="gauge-label-right">{gaugeMax}</span>
        </div>
        
        <div className="gauge-value">
          <div className="current-value" style={{ color: currentColor }}>
            {currentLevel}
          </div>
          <div className="value-label">Current WE (ft)</div>
        </div>
      </div>
      
      <div className="gauge-info">
        <div className="normal-deviation">
          Normal Elevation Deviation: {normalDeviation} in
        </div>
      </div>
      
      
      {/* Zone Quick Reference - Always visible */}
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
        
        {/* Top of Pond */}
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
        
        {/* Max Operational */}
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
            <span style={{ fontWeight: '500' }}>Max Operational:</span>
            <span style={{ color: '#666' }}>{maxOperational} ft</span>
          </div>
        )}
        
        {/* Warning High / Max Alarm */}
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
        
        {/* Normal Level */}
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
        
        {/* Warning Low / Min Alarm */}
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
            <span style={{ color: '#666' }}>{minAlarm} ft</span>
          </div>
        )}
        
        {/* Min Operational */}
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
            <span style={{ fontWeight: '500' }}>Min Operational:</span>
            <span style={{ color: '#666' }}>{minOperational} ft</span>
          </div>
        )}
        
        {/* Bottom of Pond */}
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
        </div>
      )}
    </div>
  )
}

export default WaterGauge