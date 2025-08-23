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
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   This will start the development server at `http://localhost:3000`

4. **Build for production:**
   ```bash
   npm run build:widget
   ```
   This creates optimized files in the `built-widget` directory for TagoIO deployment.

## Project Structure

```
src/
├── components/          # Reusable UI components
├── utils/
│   ├── mockData.ts      # Mock data functions and development mode detection
│   └── mock-data.json   # Sample mock data structure
├── WidgetView.tsx       # Main widget component with TagoIO integration
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

## Customizing Your Widget

1. **Update the data interface** in `src/WidgetView.tsx` to match your data structure
2. **Modify the data processing logic** in `processRealtimeData` function
3. **Create your UI components** in `src/components/`
4. **Update mock data** in `src/utils/mock-data.json` to match your data structure
5. **Customize styles** in CSS files

## Common Dependencies Included

- `@tago-io/custom-widget`: TagoIO widget SDK
- `preact`: React-compatible UI library
- `recharts`: Charting library
- `lodash-es`: Utility functions
- `typescript`: Type checking

## Scripts

- `npm run dev`: Start development server
- `npm run build:parcel`: Build for general deployment
- `npm run build:widget`: Build optimized widget for TagoIO deployment

## Tips

- Always test your widget in development mode first
- Use the browser console to debug data processing
- The `realtimeEventCount` shows how many data updates have been received
- Customize the TagoIO ready configuration in `WidgetView.tsx` (header color, etc.)