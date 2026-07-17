import { describe, it, expect } from 'vitest';
import {
  calculateMetalRoof,
  encodeMetalRoofInputs,
  decodeMetalRoofInputs,
  METAL_ROOF_DEFAULT_INPUTS,
  type MetalRoofCalculatorInputs,
} from '../src/lib/metalRoofCalculator';
import { METAL_SYSTEMS, type MetalSystemKey } from '../src/data/metalRoofRates';

const BASE: MetalRoofCalculatorInputs = {
  areaMode: 'direct',
  directSqft: 2000,
  homeSqft: 2000,
  stories: 1,
  pitch: 'moderate',
  system: 'standing_seam',
};

describe('flat-gate proof: 2000 sq ft, direct entry, all 5 systems (real calc module)', () => {
  const EXPECTED: Record<MetalSystemKey, number> = {
    corrugated: 17500,
    shingles: 23500,
    standing_seam: 25500,
    zinc: 32000,
    copper: 65000,
  };

  it.each(METAL_SYSTEMS)('$key totals $costPerSqft x 2000', (system) => {
    const r = calculateMetalRoof({ ...BASE, system: system.key });
    expect(r.subtotal).toBe(EXPECTED[system.key]);
  });

  it('all 5 totals are distinct', () => {
    const totals = METAL_SYSTEMS.map((s) => calculateMetalRoof({ ...BASE, system: s.key }).subtotal);
    expect(new Set(totals).size).toBe(totals.length);
    expect(totals.sort((a, b) => a - b)).toEqual([17500, 23500, 25500, 32000, 65000]);
  });
});

describe('pinned default scenario (direct 2000 sq ft, standing seam)', () => {
  it('matches the page default and citable worked example', () => {
    const r = calculateMetalRoof(METAL_ROOF_DEFAULT_INPUTS);
    expect(r.roofAreaSqft).toBe(2000);
    expect(r.lineItems.materialCost).toBe(25500);
    expect(r.mid).toBe(25500);
    expect(r.low).toBe(21675);
    expect(r.high).toBe(29325);
  });
});

describe('pinned-value regression cases (hand-verified)', () => {
  it('direct 1500 sq ft, copper', () => {
    const r = calculateMetalRoof({ ...BASE, directSqft: 1500, system: 'copper' });
    expect(r.lineItems.materialCost).toBe(48750);
    expect(r.low).toBe(41438);
    expect(r.high).toBe(56063);
  });

  it('direct 3200 sq ft, zinc', () => {
    const r = calculateMetalRoof({ ...BASE, directSqft: 3200, system: 'zinc' });
    expect(r.lineItems.materialCost).toBe(51200);
    expect(r.low).toBe(43520);
    expect(r.high).toBe(58880);
  });

  it('footprint 2000/1story, very_steep, corrugated: geometry factor applies, no pitch labor surcharge added', () => {
    const r = calculateMetalRoof({
      areaMode: 'footprint',
      directSqft: 0,
      homeSqft: 2000,
      stories: 1,
      pitch: 'very_steep',
      system: 'corrugated',
    });
    // 2000 * sqrt(1 + (12/12)^2) = 2828.4271... -> rounded to 2828
    expect(r.roofAreaSqft).toBe(2828);
    // Pure area x rate, no separate pitch labor line item exists on this result at all.
    expect(r.lineItems.materialCost).toBe(24749); // round(2828.4271... * 8.75)
    expect(r.subtotal).toBe(r.lineItems.materialCost);
  });
});

describe('invariant: subtotal always equals materialCost (no other line items)', () => {
  it('holds across the full input space', () => {
    const SYSTEM_KEYS = METAL_SYSTEMS.map((s) => s.key);
    const AREA_MODES: MetalRoofCalculatorInputs['areaMode'][] = ['direct', 'footprint'];
    const AREA_SIZES = [500, 2000, 8000];
    let mismatches = 0;
    let checked = 0;
    for (const system of SYSTEM_KEYS) {
      for (const areaMode of AREA_MODES) {
        for (const size of AREA_SIZES) {
          const r = calculateMetalRoof({ ...BASE, areaMode, directSqft: size, homeSqft: size, system });
          checked++;
          if (r.lineItems.materialCost !== r.subtotal) mismatches++;
        }
      }
    }
    console.log(`invariant: checked ${checked} combinations, ${mismatches} mismatches`);
    expect(mismatches).toBe(0);
  });
});

describe('invariant: geometry factor applies only in footprint mode (not direct)', () => {
  it('direct mode ignores pitch entirely: roof area equals entered sqft for every pitch', () => {
    const PITCHES: MetalRoofCalculatorInputs['pitch'][] = ['low', 'moderate', 'steep', 'very_steep'];
    for (const pitch of PITCHES) {
      const r = calculateMetalRoof({ ...BASE, areaMode: 'direct', directSqft: 2000, pitch });
      expect(r.roofAreaSqft).toBe(2000);
    }
  });

  it('footprint mode grows roof area with steeper pitch', () => {
    const flat = calculateMetalRoof({ ...BASE, areaMode: 'footprint', homeSqft: 2000, stories: 1, pitch: 'low' });
    const steep = calculateMetalRoof({ ...BASE, areaMode: 'footprint', homeSqft: 2000, stories: 1, pitch: 'very_steep' });
    expect(steep.roofAreaSqft).toBeGreaterThan(flat.roofAreaSqft);
  });
});

describe('invariant: no pitch labor surcharge is ever added (double-count guard)', () => {
  it('same footprint/pitch, cheapest vs priciest system: cost ratio matches rate ratio exactly', () => {
    const corrugated = calculateMetalRoof({ ...BASE, areaMode: 'footprint', homeSqft: 2000, stories: 1, pitch: 'steep', system: 'corrugated' });
    const copper = calculateMetalRoof({ ...BASE, areaMode: 'footprint', homeSqft: 2000, stories: 1, pitch: 'steep', system: 'copper' });
    // If a flat pitch surcharge were bolted on, this ratio would drift from
    // the pure rate ratio (32.5 / 8.75). It must not.
    const rateRatio = 32.5 / 8.75;
    const costRatio = copper.subtotal / corrugated.subtotal;
    expect(costRatio).toBeCloseTo(rateRatio, 5);
  });
});

describe('invariant: encodeMetalRoofInputs -> decodeMetalRoofInputs round-trips', () => {
  it('round-trips a full input set exactly', () => {
    const inputs: MetalRoofCalculatorInputs = {
      areaMode: 'footprint',
      directSqft: 1234,
      homeSqft: 5678,
      stories: 2,
      pitch: 'steep',
      system: 'zinc',
    };
    const decoded = decodeMetalRoofInputs(encodeMetalRoofInputs(inputs));
    expect(decoded).toEqual(inputs);
  });
});

describe('invariant: out-of-range area returns an error and zeroed numbers', () => {
  it('rejects area below the minimum', () => {
    const r = calculateMetalRoof({ ...BASE, directSqft: 0 });
    expect(r.error).toBeTruthy();
    expect(r.roofAreaSqft).toBe(0);
    expect(r.subtotal).toBe(0);
    expect(r.low).toBe(0);
    expect(r.high).toBe(0);
  });

  it('rejects area above the maximum', () => {
    const r = calculateMetalRoof({ ...BASE, directSqft: 20001 });
    expect(r.error).toBeTruthy();
  });
});
