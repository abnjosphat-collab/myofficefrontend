/**
 * MuseOffice chart palette. The workspace uses one tonal theme, so charts
 * always resolve to this light categorical palette — structural UI color
 * stays separate (canvas/surfaces/controls) and semantic color is reserved
 * for real record states.
 */
export function toolsChartTheme() {
  const light = true;
  return {
    accent: '#7652c5',
    series: ['#7652c5', '#3e806e', '#b17839', '#557ba8', '#a45f83', '#737488', '#a579b6', '#728d61'],
    axis: '#777281',
    grid: '#ebe8f0',
    tooltip: {
      backgroundColor: '#ffffff',
      border: '1px solid #e6e3ee',
      borderRadius: 13,
      color: '#292637',
      fontSize: 12,
      boxShadow: '0 12px 30px rgba(41,38,55,0.12)',
    },
  };
}
