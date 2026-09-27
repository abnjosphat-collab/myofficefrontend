/** Chart colors follow the active design language. Use these in charts rather
 * than picking a new palette or tooltip surface in each page. */
export function chartTheme(design: string, light: boolean) {
  if (design === 'dallaglio') {
    return {
      accent: light ? '#7652c5' : '#c4b5f5',
      series: light
        ? ['#7652c5', '#3e806e', '#b17839', '#557ba8', '#a45f83', '#737488', '#a579b6', '#728d61']
        : ['#c4b5f5', '#8fd0ba', '#e7b783', '#9cbee5', '#d9a4bd', '#b6b5c3', '#cfabdf', '#b5caa0'],
      axis: light ? '#777281' : '#aaaab2',
      grid: light ? '#ebe8f0' : '#29292f',
      tooltip: {
        backgroundColor: light ? '#ffffff' : '#111113',
        border: `1px solid ${light ? '#e6e3ee' : '#3a3a40'}`,
        borderRadius: 13,
        color: light ? '#292637' : '#f7f7f8',
        fontSize: 12,
        boxShadow: light ? '0 12px 30px rgba(41,38,55,0.12)' : '0 12px 30px rgba(0,0,0,0.42)',
      },
    };
  }
  return {
    accent: '#2563eb',
    series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
    axis: light ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)',
    grid: light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)',
    tooltip: {
      backgroundColor: light ? '#fff' : '#0f1e2e',
      border: `1px solid ${light ? 'rgba(15,23,42,0.1)' : 'rgba(134,187,216,0.2)'}`,
      borderRadius: 12,
      color: light ? '#0f172a' : '#fff',
      fontSize: 12,
    },
  };
}
