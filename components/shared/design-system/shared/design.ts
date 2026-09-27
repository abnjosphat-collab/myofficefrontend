/** Shared design-variant contract. Visual tokens live in classic/ or dallaglio/. */

export type DesignLanguage = 'classic' | 'dallaglio';

export const DESIGN_KEY = 'myoffice_design';

export function readDesignLanguage(): DesignLanguage {
  if (typeof window === 'undefined') return 'classic';
  try {
    const stored = localStorage.getItem(DESIGN_KEY);
    if (stored === 'classic' || stored === 'studio') return 'classic';
    return 'dallaglio';
  } catch {
    return 'dallaglio';
  }
}

export function persistDesignLanguage(design: DesignLanguage) {
  try {
    localStorage.setItem(DESIGN_KEY, design);
  } catch { /* non-fatal */ }
}

export function isToolsPath(pathname: string | null | undefined): boolean {
  return !!pathname && (pathname === '/tools' || pathname.startsWith('/tools/'));
}

export function applyDesignToDocument(design: DesignLanguage) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.design = design;
}
