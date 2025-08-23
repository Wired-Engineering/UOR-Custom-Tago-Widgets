# UOR Custom TagoIO Widgets

A collection of custom widgets built for TagoIO using Preact, TypeScript, and Recharts.

## Overview

This repository contains multiple TagoIO custom widgets and a reusable template for creating new widgets. Each widget is designed to visualize and interact with real-time IoT data through the TagoIO platform.

## Projects

- **UOR-TagoIO-PS-People-Counter-Comparison** - People counter data comparison widget
- **UOR-TagoIO-TS-TSOC-Gauges** - Water level monitoring with gauge visualizations  
- **UOR-TagoIO-TS-custom-weather-widget** - Weather forecast data visualization
- **UOR-TagoIO-Widget-Template** - Template for creating new custom widgets

## Technology Stack

- **Preact** - Lightweight React alternative
- **TypeScript** - Type safety and development experience
- **Recharts** - Data visualization library
- **Parcel** - Build tool and development server
- **TagoIO SDK** - Custom widget integration

## Getting Started

Each project contains its own README with specific setup instructions. Generally:

```bash
cd [project-folder]
npm install
npm run dev
```

## Template Usage

Use the `UOR-TagoIO-Widget-Template` folder as a starting point for new widgets. It contains all common patterns and dependencies used across the projects.