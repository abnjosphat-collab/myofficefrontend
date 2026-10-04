/**
 * Chart styling for Recharts, from tokens only (no hex in pages). Categorical series use the fixed
 * `--mo-chart-N` order; status colours are never reused as series. Every chart sits in a ChartPanel
 * that also provides a text alternative.
 */
export const chartColor = (slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) => `var(--mo-chart-${slot})`;

export const chartTheme = {
  axisTick: { fill: 'var(--mo-chart-axis)', fontSize: 12 },
  grid: 'var(--mo-chart-grid)',
  tooltip: {
    contentStyle: {
      backgroundColor: 'var(--mo-surface-raised)',
      border: '1px solid var(--mo-line)',
      borderRadius: 10,
      boxShadow: 'var(--mo-shadow-popover)',
      color: 'var(--mo-ink)',
      fontSize: 13,
    },
    cursor: { fill: 'var(--mo-surface-muted)', opacity: 0.6 },
  },
  legend: { fontSize: 12, color: 'var(--mo-ink-muted)' },
} as const;
