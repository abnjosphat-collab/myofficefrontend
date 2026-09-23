export const TOOLS_POPOVER_EVENT = 'tools:popover-open';

export function announceToolsPopover(id: string) {
  window.dispatchEvent(new CustomEvent<string>(TOOLS_POPOVER_EVENT, { detail: id }));
}
