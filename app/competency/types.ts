// app/competency/types.ts — the competency matrix's data model. Split out of
// page.tsx as part of the standing "decompose on touch" convention. Component prop
// interfaces (Popover) stay in page.tsx — coupled to the page's UI state, not the
// data contract.

export type SkillLevel = 0 | 1 | 2 | 3 | 4;

export interface Employee { id: number; name: string; trade: string; department: string; skills: Record<string, SkillLevel>; }
