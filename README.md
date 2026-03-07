# DealerPulse Dashboard

DealerPulse is a single-page executive analytics dashboard for dealership operations.
It surfaces KPIs, pipeline health, rep performance, branch comparisons, and forecast insights in one professional view.

## Overview

- Framework: Next.js 16 (App Router)
- Language: TypeScript
- UI: Cloudscape Design System
- Charts: Recharts
- Data source: local JSON dataset (`app/data/dealership_data.json`)

## Key Features

- Executive KPI section (including Total Sales Reps)
- Sales funnel analysis with largest drop annotation
- Revenue trend line chart
- Branch performance with above/average/below color coding
- Top sales reps leaderboard with metric switcher
- Lead aging distribution (horizontal bar chart)
- Revenue forecast comparison chart (current vs projected)
- Date range + multi-branch filtering
- AI-style insight cards and executive summary text

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run in Development

```bash
npm run dev
```

Open `http://localhost:3000`.

### Build for Production

```bash
npm run build
npm run start
```

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Create production build
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run test`: Run Jest tests

## Project Structure

```text
app/
  api/
    data/route.ts                 # API endpoint used by client data service
  components/
    DashboardClient.tsx           # Main dashboard UI
    FiltersComponent.tsx          # Date and branch filters
    SalesFunnelChart.tsx
    RevenueTrendChart.tsx
    BranchPerformanceChart.tsx
    RepLeaderboardChart.tsx
    LeadAgingChart.tsx
    PipelineForecastChart.tsx
    chartTheme.ts                 # Shared chart color system
  data/
    dealership_data.json          # Synthetic dataset
    types.ts                      # Shared types
    dataService.ts                # Server-side data utilities
    clientDataService.ts          # Client-side API access and transforms
  lib/
    metrics.ts                    # KPI/funnel calculation logic
  layout.tsx
  page.tsx                        # Dashboard route (/)
```

## Data Notes

- Dataset is synthetic and intended for development/demo purposes.
- Main date range in sample data is currently within 2025.
- To test different scenarios, update values in `app/data/dealership_data.json`.

## API

`GET /api/data`

Supported query params:

- `startDate` (ISO string)
- `endDate` (ISO string)
- `branchId` (single branch)
- `branchIds` (comma-separated branch IDs)

## Visualization Standards Used

- Consistent semantic colors:
  - Blue: revenue metrics
  - Green: strong performance
  - Orange: caution/average
  - Red: risk/drop-off
  - Purple: forecast metrics
- Standardized chart height: `300px`
- Legends and tooltips across all primary charts
- Dashboard content width constrained for readability (`max-width: 1200px`)

## Troubleshooting

If `npm run dev` fails due to stale Next.js state:

```bash
pkill -f "next" 2>/dev/null || true
rm -rf .next
npm run dev
```

If you see lockfile root warnings during build, ensure the project lockfile in this repo is the only one used for this workspace.

## License

MIT
