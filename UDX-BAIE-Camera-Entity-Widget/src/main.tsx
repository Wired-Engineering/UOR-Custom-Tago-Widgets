import { render } from 'preact'
import { WidgetView } from './WidgetView'
import './index.css'

const containerId = "root"
const container = document.getElementById(containerId)

if (container) {
  render(<WidgetView />, container)
} else {
  console.error(`Could not find the container element with ID '${containerId}'.`)
}
