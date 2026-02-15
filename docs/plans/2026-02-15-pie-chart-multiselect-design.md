# Pie Chart Multi-Select Category Sum

## Problem
Users want to quickly see the combined spending of a few selected categories without leaving the dashboard.

## Design

### Interaction
- **Click** a pie slice or legend item → toggles that category selected/unselected
- When 1+ categories selected: unselected slices dim (~30% opacity), donut center shows sum of selected
- When nothing selected: all slices full opacity, donut center shows total spending
- **"View transactions →"** link appears below the chart when categories are selected, navigates to `/transactions` filtered by all selected categories

### Donut Center Text
- Large formatted number (e.g. `12 304 Kč`) — bold, gold in dark mode
- Small label: "3 categories" or "All spending" when nothing selected
- Rendered via custom Chart.js plugin (canvas text, not DOM overlay)

### Visual
- Unselected slices: background color alpha reduced to ~0.3
- Smooth Chart.js update animation on toggle
- "View transactions →" link uses existing `Button variant="link"` style

### Technical
- `selectedCategories: Set<string>` state in `DashboardPage`
- Modify `categoryPieData` memo to adjust backgroundColor alpha based on selection
- Custom Chart.js `doughnutCenterText` plugin for center rendering
- Replace current `onClick` navigate handler with toggle logic
- Link constructs URL with multiple `category` params
