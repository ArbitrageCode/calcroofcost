import { describe, it, expect } from 'vitest';
import {
  calculateSiding,
  encodeSidingInputs,
  decodeSidingInputs,
  resolveWallAreaSqft,
  SIDING_DEFAULT_INPUTS,
  type SidingCalculatorInputs,
} from '../src/lib/sidingCalculator';
import { SIDING_MATERIALS, type SidingMaterialKey } from '../src/data/sidingRates';

const BASE: SidingCalculatorInputs = {
  areaMode: 'direct',
  wallSqft: 2000,
  perimeter: 200,
  stories: 1,
  material: 'vinyl',
};

describe('flat-gate proof: 2000 sq ft wall area, direct entry, all 5 materials (real calc module)', () => {
  const EXPECTED: Record<SidingMaterialKey, number> = {
    vinyl: 14000,
    aluminum: 16000,
    fiber_cement: 17000,
    wood: 20800,
    stucco: 25000,
  };

  it.each(SIDING_MATERIALS)('$key totals $costPerSqft x 2000', (material) => {
    const r = calculateSiding({ ...BASE, material: material.key });
    expect(r.subtotal).toBe(EXPECTED[material.key]);
  });

  it('all 5 totals are distinct', () => {
    const totals = SIDING_MATERIALS.map((m) => calculateSiding({ ...BASE, material: m.key }).subtotal);
    expect(new Set(totals).size).toBe(totals.length);
    expect(totals.sort((a, b) => a - b)).toEqual([14000, 16000, 17000, 20800, 25000]);
  });
});

describe('pinned default scenario (direct 2000 sq ft, vinyl)', () => {
  it('matches the page default and citable worked example', () => {
    const r = calculateSiding(SIDING_DEFAULT_INPUTS);
    expect(r.wallAreaSqft).toBe(2000);
    expect(r.lineItems.materialCost).toBe(14000);
    expect(r.mid).toBe(14000);
    expect(r.low).toBe(11900);
    expect(r.high).toBe(16100);
  });
});

describe('pinned-value regression cases (hand-verified)', () => {
  it('perimeter mode: 180 LF perimeter, 2 stories, fiber cement -> 3600 sq ft wall area', () => {
    const r = calculateSiding({
      areaMode: 'perimeter',
      wallSqft: 0,
      perimeter: 180,
      stories: 2,
      material: 'fiber_cement',
    });
    expect(r.wallAreaSqft).toBe(3600);
    expect(r.lineItems.materialCost).toBe(30600);
    expect(r.low).toBe(26010);
    expect(r.high).toBe(35190);
  });

  it('direct 1500 sq ft, stucco', () => {
    const r = calculateSiding({ ...BASE, wallSqft: 1500, material: 'stucco' });
    expect(r.lineItems.materialCost).toBe(18750);
    expect(r.low).toBe(15938);
    expect(r.high).toBe(21563);
  });
});

describe('invariant: perimeter mode uses perimeter x (10 x stories)', () => {
  it('holds for 1 and 2 stories independent of the calculator', () => {
    expect(resolveWallAreaSqft('perimeter', 0, 150, 1)).toBe(1500);
    expect(resolveWallAreaSqft('perimeter', 0, 150, 2)).toBe(3000);
  });

  it('direct mode ignores perimeter and stories entirely', () => {
    const r = calculateSiding({ areaMode: 'direct', wallSqft: 900, perimeter: 999, stories: 2, material: 'vinyl' });
    expect(r.wallAreaSqft).toBe(900);
  });

  it('2-story perimeter wall area is exactly double 1-story at the same perimeter', () => {
    const one = calculateSiding({ areaMode: 'perimeter', wallSqft: 0, perimeter: 200, stories: 1, material: 'vinyl' });
    const two = calculateSiding({ areaMode: 'perimeter', wallSqft: 0, perimeter: 200, stories: 2, material: 'vinyl' });
    expect(two.wallAreaSqft).toBe(one.wallAreaSqft * 2);
    expect(two.subtotal).toBe(one.subtotal * 2);
  });
});

describe('invariant: subtotal always equals materialCost (no other line items)', () => {
  it('holds across the full input space', () => {
    const MATERIAL_KEYS = SIDING_MATERIALS.map((m) => m.key);
    const AREA_MODES: SidingCalculatorInputs['areaMode'][] = ['direct', 'perimeter'];
    const AREA_SIZES = [500, 2000, 8000];
    let mismatches = 0;
    let checked = 0;
    for (const material of MATERIAL_KEYS) {
      for (const areaMode of AREA_MODES) {
        for (const size of AREA_SIZES) {
          const r = calculateSiding({ ...BASE, areaMode, wallSqft: size, perimeter: size, material });
          checked++;
          if (r.lineItems.materialCost !== r.subtotal) mismatches++;
        }
      }
    }
    console.log(`invariant: checked ${checked} combinations, ${mismatches} mismatches`);
    expect(mismatches).toBe(0);
  });
});

describe('invariant: encodeSidingInputs -> decodeSidingInputs round-trips', () => {
  it('round-trips a full input set exactly', () => {
    const inputs: SidingCalculatorInputs = {
      areaMode: 'perimeter',
      wallSqft: 1234,
      perimeter: 210,
      stories: 2,
      material: 'stucco',
    };
    const decoded = decodeSidingInputs(encodeSidingInputs(inputs));
    expect(decoded).toEqual(inputs);
  });

  it('round-trips stories: 1 (not the default fallback masking a decode bug)', () => {
    const inputs: SidingCalculatorInputs = { ...BASE, areaMode: 'perimeter', stories: 1 };
    const decoded = decodeSidingInputs(encodeSidingInputs(inputs));
    expect(decoded.stories).toBe(1);
  });
});

describe('invariant: out-of-range wall area returns an error and zeroed numbers', () => {
  it('rejects area below the minimum', () => {
    const r = calculateSiding({ ...BASE, wallSqft: 0 });
    expect(r.error).toBeTruthy();
    expect(r.wallAreaSqft).toBe(0);
    expect(r.subtotal).toBe(0);
    expect(r.low).toBe(0);
    expect(r.high).toBe(0);
  });

  it('rejects area above the maximum', () => {
    const r = calculateSiding({ ...BASE, wallSqft: 20001 });
    expect(r.error).toBeTruthy();
  });
});
