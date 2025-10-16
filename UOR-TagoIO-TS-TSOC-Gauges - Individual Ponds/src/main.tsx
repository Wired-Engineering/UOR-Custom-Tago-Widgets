import { render } from 'preact'
import * as React from 'preact/compat'
import { WidgetView } from './WidgetView'
import './index.css'

// Make React available globally for Recharts
;(globalThis as any).React = React
;(window as any).React = React

const containerId = "root"
const container = document.getElementById(containerId)

if (container) {
  render(<WidgetView />, container)
} else {
  console.error(`Could not find the container element with ID '${containerId}'.`)
}