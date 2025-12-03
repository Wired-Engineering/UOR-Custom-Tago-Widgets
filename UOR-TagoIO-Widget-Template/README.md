# TagoIO Widget Template

This is a template for creating custom TagoIO widgets using Preact, TypeScript, and Parcel.

## Features

- **Preact**: Lightweight React alternative for better performance
- **TypeScript**: Type safety and better development experience
- **Recharts**: Charting library for data visualization
- **TagoIO Integration**: Built-in support for TagoIO custom widgets
- **Mock Data Support**: Development mode with mock data for testing
- **Parcel**: Fast, zero-configuration build tool

## Getting Started

1. **Clone or copy this template folder**
2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start development server:**
   ```bash
   pnpm run dev
   ```
   This will start the development server at `http://localhost:3000`

4. **Build for production:**
   ```bash
   pnpm run build:widget
   ```
   This creates optimized files in the `built-widget` directory for TagoIO deployment.

## Project Structure

```
src/
├── components/          # UI components (dashboards, cards, etc.)
├── hooks/               # Custom hooks for state & data logic
│   └── useExampleData.ts
├── types/               # Shared TypeScript interfaces
│   └── index.ts
├── utils/
│   ├── mockData.ts      # Mock data functions and dev mode detection
│   ├── formatters.ts    # Date/number formatting utilities
│   └── mock-data.json   # Sample mock data structure
├── WidgetView.tsx       # Main widget with TagoIO integration & context
├── app.tsx              # Main app component
├── main.tsx             # App entry point
├── app.css              # App-specific styles
├── index.css            # Global styles
├── parcel.d.ts          # Parcel type definitions
└── react.d.ts           # React/Preact type definitions
```

## Development vs Production

The widget automatically detects whether it's running in development or production mode:

- **Development**: Uses mock data from `src/utils/mock-data.json`
- **Production**: Connects to TagoIO and uses real-time data

## Best Practices

### Use Custom Hooks for Logic

Extract complex logic into custom hooks to keep components clean:

```typescript
// src/hooks/useDataProcessing.ts
import { useMemo } from 'preact/hooks'

export const useDataProcessing = (rawData: RawData[]) => {
  const processedData = useMemo(() => {
    // Processing logic here
    return rawData.map(...)
  }, [rawData])

  return { processedData }
}
```

### Preact-Specific: Use `onInput` for Real-Time Filtering

In Preact, use `onInput` instead of `onChange` for immediate updates as the user types:

```tsx
// Correct - updates on every keystroke
<input onInput={(e) => setQuery(e.currentTarget.value)} />

// Incorrect - may wait for blur in Preact
<input onChange={(e) => setQuery(e.currentTarget.value)} />
```

### Display Version from package.json

Import and display the version number in your widget:

```tsx
import packageJson from '../../package.json'

// In your component
<footer>v{packageJson.version}</footer>
```

### Create a Nice Loading Screen

```tsx
if (isLoading) {
  return (
    <div className="widget-loading">
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading Data...</p>
      </div>
    </div>
  )
}
```

### UOR Color Palette

```css
/* Primary colors */
--uor-blue: #005194;
--uor-green: #57a773;
--uor-dark-blue: #003d70;

/* Background gradient */
background: linear-gradient(135deg, #e8f4f8 0%, #d1e8f0 100%);
```

## Customizing Your Widget

1. **Update the data interface** in `src/WidgetView.tsx` to match your data structure
2. **Create custom hooks** in `src/hooks/` for data processing and state management
3. **Create your UI components** in `src/components/`
4. **Add shared types** in `src/types/` for reusability
5. **Update mock data** in `src/utils/mock-data.json` to match your data structure
6. **Customize styles** in CSS files

## Common Dependencies Included

- `@tago-io/custom-widget`: TagoIO widget SDK
- `preact`: React-compatible UI library
- `recharts`: Charting library
- `lodash-es`: Utility functions
- `typescript`: Type checking

## Scripts

- `pnpm run dev`: Start development server
- `pnpm run build:parcel`: Build for general deployment
- `pnpm run build:widget`: Build optimized widget for TagoIO deployment

## Tips

- Always test your widget in development mode first
- Use the browser console to debug data processing
- The `realtimeEventCount` shows how many data updates have been received
- Customize the TagoIO ready configuration in `WidgetView.tsx` (header color, etc.)
- Keep components small and focused on rendering; move logic to hooks
- Use `useMemo` for expensive computations to avoid unnecessary recalculations
