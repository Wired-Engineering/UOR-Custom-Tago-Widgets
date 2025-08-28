# Tech Services Custom Weather Widget

A TagoIO custom widget for displaying weather forecast data with interactive charts and weather icons, with data from OpenMeteo.

## Features

- Hourly weather forecast visualization
- Temperature, precipitation, and wind data
- Soil moisture monitoring
- Animated weather icons
- Interactive charts with Recharts

## Development

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000` to view the widget in development mode with mock data.

## Build

```bash
pnpm build:widget
```

Builds the widget for TagoIO deployment in the `built-widget` directory.