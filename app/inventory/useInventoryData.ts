// app/inventory/useInventoryData.ts — the inventory list's persistence layer:
// localStorage load/save (treated as the "data-fetching layer" the same way an API
// would be, same precedent as av.tsx) plus a hook owning the item list. Mutations
// (deleteItem) operate on the hook's own persisted state, so they live here rather
// than as plain functions, same reasoning as av.tsx's localStorage mutations.
'use client';

import { useEffect, useState } from 'react';
import type { InventoryItem } from './types';

const INVENTORY_STORAGE_KEY = 'inventory-items';

export function generateSampleInventory(): InventoryItem[] {
  return [
    { id: 'inv-001', name: 'Industrial Circuit Boards', sku: 'CB-IND-005', category: 'Electronics', description: 'High-temperature circuit boards for manufacturing equipment', currentStock: 45, minStock: 20, maxStock: 100, unit: 'pcs', cost: 125.50, supplier: 'TechSupply Inc', location: 'Shelf A-12', status: 'in-stock', lastRestocked: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: 'inv-002', name: 'Safety Gloves - Large', sku: 'SG-L-100', category: 'Safety', description: 'Cut-resistant safety gloves, large size', currentStock: 8, minStock: 25, maxStock: 200, unit: 'pairs', cost: 12.75, supplier: 'SafetyFirst Ltd', location: 'Bin C-08', status: 'low-stock', lastRestocked: new Date(Date.now() - 14 * 86400000).toISOString() },
    { id: 'inv-003', name: 'Hydraulic Fluid', sku: 'HYD-40W', category: 'Consumables', description: 'Industrial grade hydraulic fluid, 40W', currentStock: 120, minStock: 50, maxStock: 300, unit: 'liters', cost: 8.20, supplier: 'Industrial Parts Co', location: 'Drum Storage', status: 'in-stock', lastRestocked: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: 'inv-004', name: 'CNC Cutting Tools', sku: 'CNC-CT-3MM', category: 'Tools', description: '3mm carbide cutting tools for CNC machines', currentStock: 0, minStock: 15, maxStock: 80, unit: 'pcs', cost: 45.00, supplier: 'Global Tools', location: 'Tool Crib B', status: 'out-of-stock', lastRestocked: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: 'inv-005', name: 'Laser Printer Toner', sku: 'TONER-XL500', category: 'Office Supplies', description: 'High-yield toner for XL500 series printers', currentStock: 3, minStock: 5, maxStock: 20, unit: 'cartridges', cost: 89.99, supplier: 'Office Depot', location: 'Supply Closet', status: 'low-stock', lastRestocked: new Date(Date.now() - 21 * 86400000).toISOString() },
  ];
}

export function useInventoryData() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInventory = () => {
    setIsRefreshing(true);
    try {
      const stored = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (stored) {
        setInventory(JSON.parse(stored));
      } else {
        const sample = generateSampleInventory();
        setInventory(sample);
        localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(sample));
      }
    } catch { /* ignore */ } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { loadInventory(); }, []);

  const deleteItem = (id: string) => {
    const items = inventory.filter(i => i.id !== id);
    setInventory(items);
    try { localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  };

  return { inventory, isRefreshing, loadInventory, deleteItem };
}
