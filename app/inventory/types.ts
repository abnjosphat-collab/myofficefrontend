// app/inventory/types.ts — the inventory item's data model. Split out of page.tsx as
// part of the standing "decompose on touch" convention. Like av.tsx (Equipment
// Availability), this page has no backend — every item is localStorage-persisted,
// seeded from generateSampleInventory() on first load.

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  cost: number;
  supplier: string;
  location: string;
  status: string;
  lastRestocked: string;
}
