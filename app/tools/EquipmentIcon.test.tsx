import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { EquipmentIcon } from './EquipmentIcon';
import { EQUIPMENT_TYPES, type EquipmentKind } from './prototype';

describe('equipment pictograms', () => {
  it('provides a polished line pictogram for every registered equipment type', () => {
    const { container } = render(<>{EQUIPMENT_TYPES.map(type => <EquipmentIcon key={type.value} kind={type.value} family="technical"/>)}</>);
    const drawings = [...container.querySelectorAll('svg')];
    expect(drawings).toHaveLength(EQUIPMENT_TYPES.length);
    for (const drawing of drawings) {
      expect(drawing).toHaveAttribute('fill', 'none');
      expect(drawing).toHaveAttribute('stroke-width', '1.35');
    }
  });

  it('does not reuse one generic silhouette for materially different machines', () => {
    const kinds: EquipmentKind[] = ['cordless-drill', 'rotary-hammer', 'angle-grinder', 'inverter-welder', 'clamp-meter'];
    const { container } = render(<>{kinds.map(kind => <EquipmentIcon key={kind} kind={kind} family="tabler"/>)}</>);
    const drawings = [...container.querySelectorAll('svg')].map(svg => svg.innerHTML);
    expect(new Set(drawings).size).toBe(kinds.length);
  });
});
