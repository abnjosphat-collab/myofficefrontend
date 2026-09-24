import { DEFAULT_OPTIONS, type WorkspaceOptions } from './ToolsCustomize';

export const TOOLS_PREFERENCES_KEY = 'myoffice.tools.preferences.v1';
export type ToolsStoredPreferences = {
  appearance: 'light' | 'dark';
  view: 'grid' | 'list';
  sidebarCollapsed: boolean;
  overviewOpen: boolean;
  options: WorkspaceOptions;
};

const fonts = new Set(['inter', 'manrope', 'jakarta']);
const iconFamilies = new Set(['technical', 'myoffice', 'tabler', 'iconoir']);

export function parseToolsPreferences(raw: string | null): ToolsStoredPreferences | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ToolsStoredPreferences>;
    const source = value.options ?? DEFAULT_OPTIONS;
    const order = Array.isArray(source.order) && source.order.includes('register')
      ? source.order.filter(item => item === 'overview' || item === 'register')
      : [...DEFAULT_OPTIONS.order];
    const uniqueOrder = [...new Set(order)];
    for (const required of DEFAULT_OPTIONS.order) if (!uniqueOrder.includes(required)) uniqueOrder.push(required);
    return {
      appearance: value.appearance === 'dark' ? 'dark' : 'light',
      view: value.view === 'list' ? 'list' : 'grid',
      sidebarCollapsed: value.sidebarCollapsed === true,
      overviewOpen: value.overviewOpen !== false,
      options: {
        order: uniqueOrder,
        hidden: Array.isArray(source.hidden) ? source.hidden.filter(item => item === 'overview') : [],
        font: fonts.has(source.font) ? source.font : DEFAULT_OPTIONS.font,
        fontSize: Number.isFinite(source.fontSize) ? Math.min(130, Math.max(85, Math.round(source.fontSize / 5) * 5)) : DEFAULT_OPTIONS.fontSize,
        equipmentIcons: iconFamilies.has(source.equipmentIcons) ? source.equipmentIcons : DEFAULT_OPTIONS.equipmentIcons,
        guidance: source.guidance !== false,
        guide: source.guide !== false,
      },
    } as ToolsStoredPreferences;
  } catch {
    return null;
  }
}

export function saveToolsPreferences(preferences: ToolsStoredPreferences) {
  window.localStorage.setItem(TOOLS_PREFERENCES_KEY, JSON.stringify(preferences));
}
