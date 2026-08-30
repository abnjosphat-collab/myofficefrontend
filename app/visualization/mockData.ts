// app/visualization/mockData.ts — the visualization page's data-generation
// layer. This page has no real backend of its own (it's a demo/preview of
// what analytics for another module *would* look like), so this file plays
// the same role other pages' api.ts does — the raw data-producing
// functions — except the "source" is a deterministic random generator
// instead of a network call. Swapping in a real endpoint later only means
// changing the bodies here; page.tsx's consumption code doesn't change.
//
// Split out of page.tsx as part of the standing "decompose on touch"
// convention. generateMockPageData/generateMockAiAnalysis take the resolved
// PageConfig as a parameter (rather than calling getPageConfig internally)
// because getPageConfig depends on pageOptions, which carries a ReactNode
// icon per entry and so stays in page.tsx (a .tsx file) — this keeps that
// dependency out of this plain .ts data-layer file entirely.
import type { AIAnalysis, PageConfig, PageData, PlotLayout, Visualization } from './types';

// Plotly layout fields that make a chart theme-aware. Chart generation
// (generateMockChart, below) happens once per loadPageData() call and
// isn't re-run on theme toggle, so this is NOT baked into the generated
// layout here — page.tsx merges it into `layout` at each <Plot> render
// site instead, which is what makes charts re-theme immediately when the
// user flips light/dark without needing a data reload. Only scene/polar
// need their own color fields explicitly; Plotly inherits `font.color`
// into ordinary 2D axis ticks/titles/legend automatically.
export function plotlyTheme(light: boolean): PlotLayout {
  const gridColor = light ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)';
  const textColor = light ? '#475569' : '#94a3b8';
  const axis = { gridcolor: gridColor, zerolinecolor: gridColor, tickfont: { color: textColor }, titlefont: { color: textColor } };
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: textColor },
    xaxis: axis,
    yaxis: axis,
    scene: { xaxis: axis, yaxis: axis, zaxis: axis, bgcolor: 'rgba(0,0,0,0)' },
    polar: { radialaxis: axis, angularaxis: axis, bgcolor: 'rgba(0,0,0,0)' },
  };
}

export function generateMockChart(type: string, title: string, colorScheme: string = 'Viridis'): Visualization {
  const colors: Record<string, string> = {
    'red': '#ef4444',
    'orange': '#f97316',
    'blue': '#3b82f6',
    'green': '#10b981',
    'indigo': '#6366f1',
    'purple': '#8b5cf6',
    'teal': '#14b8a6',
    'pink': '#ec4899',
    'yellow': '#f59e0b',
    'cyan': '#06b6d4',
    'Viridis': '#3b82f6',
    'Plotly3': '#3b82f6',
    'Rainbow': '#3b82f6'
  };

  const color = colors[colorScheme as keyof typeof colors] || '#3b82f6';

  switch (type) {
    case 'line':
      return {
        data: [{
          type: 'scatter',
          mode: 'lines+markers',
          x: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
          y: Array.from({ length: 30 }, () => Math.random() * 100),
          line: { color }
        }],
        layout: {
          title,
          height: 400,
          xaxis: { title: 'Date' },
          yaxis: { title: 'Value' },
          plot_bgcolor: 'rgba(0,0,0,0)',
          paper_bgcolor: 'rgba(0,0,0,0)'
        }
      };
    case 'bar':
      return {
        data: [{
          type: 'bar',
          x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          y: Array.from({ length: 6 }, () => Math.random() * 100),
          marker: { color }
        }],
        layout: {
          title,
          height: 400,
          xaxis: { title: 'Category' },
          yaxis: { title: 'Value' }
        }
      };
    case 'pie':
      return {
        data: [{
          type: 'pie',
          values: [35, 25, 20, 15, 5],
          labels: ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'],
          marker: {
            colors: [color, `${color}80`, `${color}60`, `${color}40`, `${color}20`]
          }
        }],
        layout: {
          title,
          height: 400,
          showlegend: true
        }
      };
    case 'scatter3d':
      return {
        data: [{
          type: 'scatter3d',
          mode: 'markers',
          x: Array.from({ length: 50 }, () => Math.random() * 100),
          y: Array.from({ length: 50 }, () => Math.random() * 100),
          z: Array.from({ length: 50 }, () => Math.random() * 100),
          marker: {
            size: 6,
            color: Array.from({ length: 50 }, () => Math.random() * 100),
            colorscale: [[0, color], [1, `${color}80`]],
            showscale: true
          }
        }],
        layout: {
          title,
          height: 500,
          scene: {
            xaxis: { title: 'X Axis' },
            yaxis: { title: 'Y Axis' },
            zaxis: { title: 'Z Axis' }
          }
        }
      };
    case 'heatmap':
      return {
        data: [{
          type: 'heatmap',
          z: Array.from({ length: 8 }, () =>
            Array.from({ length: 8 }, () => Math.random() * 100)
          ),
          colorscale: [[0, color], [1, `${color}80`]]
        }],
        layout: {
          title,
          height: 400
        }
      };
    case 'indicator':
      return {
        data: [{
          type: "indicator",
          mode: "gauge+number",
          value: Math.random() * 100,
          title: { text: title },
          gauge: {
            axis: { range: [0, 100] },
            bar: { color },
            steps: [
              { range: [0, 50], color: "#ef4444" },
              { range: [50, 80], color: "#f59e0b" },
              { range: [80, 100], color: "#10b981" }
            ]
          }
        }],
        layout: {
          height: 400
        }
      };
    case 'scatterpolar':
      return {
        data: [{
          type: 'scatterpolar',
          r: [Math.random() * 100, Math.random() * 100, Math.random() * 100, Math.random() * 100],
          theta: ['Metric A', 'Metric B', 'Metric C', 'Metric D'],
          fill: 'toself',
          marker: { color }
        }],
        layout: {
          title,
          height: 400,
          polar: {
            radialaxis: {
              visible: true,
              range: [0, 100]
            }
          }
        }
      };
    case 'sunburst':
      return {
        data: [{
          type: 'sunburst',
          labels: ['All', 'Group A', 'Group B', 'Group C', 'Item A1', 'Item A2', 'Item B1', 'Item B2'],
          parents: ['', 'All', 'All', 'All', 'Group A', 'Group A', 'Group B', 'Group B'],
          values: [100, 40, 35, 25, 20, 20, 18, 17],
          marker: {
            colors: [color, `${color}80`, `${color}60`, `${color}40`, `${color}20`, `${color}10`, `${color}90`, `${color}70`]
          }
        }],
        layout: {
          title,
          height: 500
        }
      };
    case 'violin':
      return {
        data: [{
          type: 'violin',
          y: Array.from({ length: 50 }, () => Math.random() * 100),
          box: { visible: true },
          line: { color },
          fillcolor: `${color}20`
        }],
        layout: {
          title,
          height: 400
        }
      };
    case 'area':
      return {
        data: [{
          type: 'scatter',
          mode: 'lines',
          x: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
          y: Array.from({ length: 30 }, () => Math.random() * 100),
          fill: 'tozeroy',
          line: { color },
          fillcolor: `${color}20`
        }],
        layout: {
          title,
          height: 400,
          xaxis: { title: 'Date' },
          yaxis: { title: 'Value' }
        }
      };
    case 'histogram':
      return {
        data: [{
          type: 'histogram',
          x: Array.from({ length: 100 }, () => Math.random() * 100),
          marker: { color },
          nbinsx: 20
        }],
        layout: {
          title,
          height: 400,
          xaxis: { title: 'Value' },
          yaxis: { title: 'Frequency' }
        }
      };
    case 'scatter':
      return {
        data: [{
          type: 'scatter',
          mode: 'markers',
          x: Array.from({ length: 50 }, () => Math.random() * 100),
          y: Array.from({ length: 50 }, () => Math.random() * 100),
          marker: {
            color,
            size: 10
          }
        }],
        layout: {
          title,
          height: 400,
          xaxis: { title: 'X Value' },
          yaxis: { title: 'Y Value' }
        }
      };
    default:
      return {
        data: [{
          type: 'scatter',
          x: [1, 2, 3],
          y: [1, 2, 3],
          marker: { color }
        }],
        layout: {
          title,
          height: 400
        }
      };
  }
}

/** Returns the generated page data plus the key of the first visualization
 *  (the caller sets its own "active chart" state from this — this function
 *  stays a pure function of its inputs, no state side effects). */
export function generateMockPageData(pageId: string, config: PageConfig): { pageData: PageData; firstChartKey: string } {
  // Generate mock visualizations based on page type
  const visualizations: Record<string, Visualization> = {};

  // Page-specific charts
  if (pageId === 'breakdowns') {
    visualizations.failure_timeline = generateMockChart('line', '📈 Daily Failure Timeline', 'red');
    visualizations.severity_distribution = generateMockChart('pie', '⚡ Breakdown Severity', 'red');
    visualizations.mttr_mtbf_analysis = generateMockChart('scatter', '🔄 MTTR vs MTBF Analysis', 'red');
    visualizations.downtime_by_department = generateMockChart('bar', '⏱️ Downtime by Department', 'red');
    visualizations.repair_cost_trend = generateMockChart('area', '💰 Repair Cost Trend', 'red');
    visualizations.equipment_reliability = generateMockChart('indicator', '🔧 Equipment Reliability Score', 'red');
  } else if (pageId === 'employees') {
    visualizations.department_distribution = generateMockChart('bar', '👥 Employee Distribution', 'indigo');
    visualizations.performance_radar = generateMockChart('scatterpolar', '🎯 Performance Radar', 'indigo');
    visualizations.salary_distribution = generateMockChart('violin', '💼 Salary Distribution', 'indigo');
    visualizations.attendance_trend = generateMockChart('line', '📊 Attendance Trend', 'indigo');
    visualizations.skills_heatmap = generateMockChart('heatmap', '🔥 Skills Matrix', 'indigo');
    visualizations.productivity_gauge = generateMockChart('indicator', '⚡ Productivity Score', 'indigo');
  } else if (pageId === 'maintenance') {
    visualizations.maintenance_sunburst = generateMockChart('sunburst', '🔧 Maintenance Hierarchy', 'orange');
    visualizations.cost_analysis = generateMockChart('scatter', '💰 Cost vs Duration', 'orange');
    visualizations.schedule_calendar = generateMockChart('heatmap', '📅 Maintenance Calendar', 'orange');
    visualizations.completion_rate = generateMockChart('indicator', '✅ Completion Rate', 'orange');
    visualizations.backlog_trend = generateMockChart('line', '📊 Backlog Trend', 'orange');
    visualizations.priority_distribution = generateMockChart('pie', '🎯 Priority Distribution', 'orange');
  } else {
    // General charts for other pages
    visualizations.primary_metric = generateMockChart('line', `📈 ${config.name} Trend`, config.color_scheme);
    visualizations.distribution = generateMockChart('histogram', '📊 Data Distribution', config.color_scheme);
    visualizations.correlation = generateMockChart('heatmap', '🔥 Correlation Analysis', config.color_scheme);
    visualizations.comparison = generateMockChart('bar', '📦 Comparison View', config.color_scheme);
  }

  const firstChartKey = Object.keys(visualizations)[0] ?? '';

  return {
    pageData: {
      page_info: config,
      data_summary: {
        total_records: Math.floor(Math.random() * 1000) + 500,
        columns: ['id', 'name', 'value', 'category', 'date', 'status', 'metric1', 'metric2'],
        sample_data: Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          name: `Item ${i + 1}`,
          value: Math.random() * 100,
          category: ['A', 'B', 'C'][i % 3],
          date: new Date().toISOString().split('T')[0],
          status: ['active', 'inactive'][i % 2],
          metric1: Math.random() * 50,
          metric2: Math.random() * 200
        }))
      },
      visualizations,
      generated_at: new Date().toISOString()
    },
    firstChartKey,
  };
}

export function generateMockAiAnalysis(config: PageConfig): AIAnalysis {
  return {
    page_info: config,
    analysis_type: config.ai_analysis_type,
    timestamp: new Date().toISOString(),
    insights: Array.from({ length: 4 }, (_, i) => ({
      metric: ['Availability', 'Productivity', 'Cost', 'Efficiency'][i],
      average: Math.random() * 100,
      median: Math.random() * 100,
      std: Math.random() * 20,
      min: Math.random() * 50,
      max: Math.random() * 150,
      trend: ['increasing', 'decreasing', 'stable'][i % 3]
    })),
    recommendations: [
      {
        priority: 'high' as const,
        title: 'Optimize Maintenance Schedule',
        description: 'Current schedule shows inefficiencies during peak hours'
      },
      {
        priority: 'medium' as const,
        title: 'Improve Resource Allocation',
        description: 'Some departments are underutilized while others are overloaded'
      },
      {
        priority: 'low' as const,
        title: 'Update Documentation',
        description: 'Process documentation is outdated in certain areas'
      }
    ],
    anomalies: [
      {
        metric: 'Response Time',
        count: 3,
        description: 'Unusually high response times detected on Tuesday afternoons'
      },
      {
        metric: 'Energy Consumption',
        count: 5,
        description: 'Spikes in energy usage without corresponding production increase'
      }
    ],
    predictions: [
      {
        metric: 'Monthly Breakdowns',
        forecast: [12, 14, 16, 18],
        trend: 'increasing',
        confidence: 0.85
      }
    ]
  };
}
