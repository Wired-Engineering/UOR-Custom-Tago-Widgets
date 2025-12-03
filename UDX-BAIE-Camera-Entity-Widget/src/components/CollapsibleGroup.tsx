import { ComponentChildren } from 'preact'

interface CollapsibleGroupProps {
  title: string
  count: number
  isExpanded: boolean
  onToggle: () => void
  badge?: string
  badgeClass?: string
  className?: string
  children: ComponentChildren
}

export const CollapsibleGroup = ({
  title,
  count,
  isExpanded,
  onToggle,
  badge,
  badgeClass = '',
  className = '',
  children
}: CollapsibleGroupProps) => {
  return (
    <div className={className}>
      <div className="type-header" onClick={onToggle}>
        <span className="expand-icon">{isExpanded ? '-' : '+'}</span>
        {badge && <span className={`type-badge ${badgeClass}`}>{badge}</span>}
        <h2>{title}</h2>
        <span className="type-count">{count}</span>
      </div>
      {isExpanded && <div className="type-content">{children}</div>}
    </div>
  )
}

interface CollapsibleParkProps {
  park: string
  count: number
  isExpanded: boolean
  onToggle: () => void
  children: ComponentChildren
}

export const CollapsiblePark = ({
  park,
  count,
  isExpanded,
  onToggle,
  children
}: CollapsibleParkProps) => {
  return (
    <div className="park-group">
      <div className="park-header" onClick={onToggle}>
        <span className="expand-icon">{isExpanded ? '-' : '+'}</span>
        <h3>{park}</h3>
        <span className="park-count">{count}</span>
      </div>
      {isExpanded && <div className="park-content">{children}</div>}
    </div>
  )
}

interface CollapsibleItemProps {
  isExpanded: boolean
  onToggle: () => void
  header: ComponentChildren
  children: ComponentChildren
}

export const CollapsibleItem = ({
  isExpanded,
  onToggle,
  header,
  children
}: CollapsibleItemProps) => {
  return (
    <div className={`record-item ${isExpanded ? 'expanded' : ''}`}>
      <div className="record-header" onClick={onToggle}>
        <span className="expand-icon">{isExpanded ? '-' : '+'}</span>
        {header}
      </div>
      {isExpanded && <div className="record-content">{children}</div>}
    </div>
  )
}
