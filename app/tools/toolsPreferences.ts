import { DEFAULT_OPTIONS, type WorkspaceOptions } from './ToolsCustomize';

export const TOOLS_PREFERENCES_KEY = 'myoffice.tools.preferences.v1';
export type ToolsStoredPreferences = {
  view: 'grid' | 'list';
  sidebarCollapsed: boolean;

  options: WorkspaceOptions;
};

const fonts = new Set(['inter', 'manrope', 'jakarta']);

export function parseToolsPreferences(raw: string | null): ToolsStoredPreferences | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ToolsStoredPreferences>;
    const source = value.options ?? DEFAULT_OPTIONS;
    const order = Array.isArray(source.order) && source.order.includes('register')
      ? source.order.filter(item => item === 'register')
      : [...DEFAULT_OPTIONS.order];
    const uniqueOrder = [...new Set(order)];
    for (const required of DEFAULT_OPTIONS.order) if (!uniqueOrder.includes(required)) uniqueOrder.push(required);
    return {
      view: value.view === 'list' ? 'list' : 'grid',
      sidebarCollapsed: value.sidebarCollapsed === true,

      options: {
        order: uniqueOrder,
        hidden: [],
        font: fonts.has(source.font) ? source.font : DEFAULT_OPTIONS.font,
        fontSize: Number.isFinite(source.fontSize) ? Math.min(130, Math.max(85, Math.round(source.fontSize / 5) * 5)) : DEFAULT_OPTIONS.fontSize,
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
