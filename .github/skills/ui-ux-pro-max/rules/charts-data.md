---
title: Charts & Data Visualization
impact: LOW
impactDescription: Wrong chart type or inaccessible data viz misleads users; lower priority since not all UIs need charts.
tags: [charts, data-viz, accessibility, responsive, table, color-palette]
---

# Charts & Data Visualization

Rules for choosing and implementing data visualizations.

## chart-type

Match chart type to the data relationship being shown.

| Data Relationship | Chart Type | Library |
|------------------|------------|---------|
| Trend over time | Line, Area | Recharts, Chart.js |
| Comparison | Bar, Grouped Bar | Recharts, Nivo |
| Part-of-whole | Pie, Donut, Treemap | Recharts, D3 |
| Distribution | Histogram, Box Plot | D3, Plotly |
| Correlation | Scatter, Bubble | D3, Plotly |
| Flow/Process | Sankey, Funnel | D3, Nivo |
| Geographic | Choropleth, Dot map | Mapbox, Leaflet |
| Hierarchical | Sunburst, Tree | D3, Nivo |
| Real-time | Sparkline, Gauge | Recharts |

```tsx
/* Incorrect — pie chart for time series */
<PieChart data={monthlyRevenue} />

/* Correct — line chart for trend */
<LineChart data={monthlyRevenue}>
  <XAxis dataKey="month" />
  <YAxis />
  <Line dataKey="revenue" stroke="#3B82F6" />
</LineChart>
```

## color-guidance

Use accessible, distinguishable color palettes for data series. Maximum **6–8 distinct colors** per chart.

```typescript
// Accessible chart palette
const chartColors = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
];
```

Rules:
- Sequential data → single-hue gradient (light → dark)
- Categorical → distinct-hue palette
- Diverging → two-hue gradient with neutral midpoint
- Never rely on color alone — add labels, patterns, or tooltips

## data-table

Always provide a table alternative for chart data (accessibility requirement).

```tsx
{/* Visual chart */}
<BarChart data={data} aria-hidden="true" />

{/* Accessible table alternative */}
<table className="sr-only">
  <caption>Monthly Revenue</caption>
  <thead>
    <tr><th>Month</th><th>Revenue</th></tr>
  </thead>
  <tbody>
    {data.map(d => (
      <tr key={d.month}>
        <td>{d.month}</td>
        <td>${d.revenue.toLocaleString()}</td>
      </tr>
    ))}
  </tbody>
</table>
```

## responsive-charts

Charts must resize gracefully. Use `ResponsiveContainer` or similar wrappers.

```tsx
/* Incorrect — fixed size */
<BarChart width={800} height={400} data={data} />

/* Correct — responsive */
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>...</BarChart>
</ResponsiveContainer>
```
