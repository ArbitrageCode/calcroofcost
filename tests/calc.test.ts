import { describe, it, expect } from 'vitest';
import { calculate, type CalculatorInputs, type AreaMode, type TearOffLayers } from '../src/lib/calculator';
import { MATERIALS, PITCH_ADDERS, REGIONS, type MaterialKey, type PitchKey, type RegionKey } from '../src/data/rates';

const BASE: CalculatorInputs = {
  areaMode: 'footprint',
  directSqft: 2000,
  homeSqft: 2000,
  stories: 1,
  material: 'asphalt',
  pitch: 'moderate',
  tearOffLayers: 1,
  underlayment: true,
  region: 'national',
};

describe('pinned pitch scenarios (footprint 2000, 1 story, asphalt, 1-layer, underlayment, national)', () => {
  it('low', () => {
    const r = calculate({ ...BASE, pitch: 'low' });
    expect(r.low).toBe(9200);
    expect(r.mid).toBe(10850);
    expect(r.high).toBe(12500);
    expect(r.lineItems.materialCost).toBe(7350);
    expect(r.lineItems.pitchSurchargeCost).toBe(0);
    expect(r.lineItems.tearOffCost).toBe(2350);
    expect(r.lineItems.underlaymentCost).toBe(1150);
  });

  it('moderate', () => {
    const r = calculate({ ...BASE, pitch: 'moderate' });
    expect(r.low).toBe(10000);
    expect(r.mid).toBe(11750);
    expect(r.high).toBe(13500);
    expect(r.lineItems.materialCost).toBe(7950);
    expect(r.lineItems.pitchSurchargeCost).toBe(0);
    expect(r.lineItems.tearOffCost).toBe(2550);
    expect(r.lineItems.underlaymentCost).toBe(1250);
  });

  it('steep', () => {
    const r = calculate({ ...BASE, pitch: 'steep' });
    expect(r.low).toBe(12850);
    expect(r.mid).toBe(15100);
    expect(r.high).toBe(17350);
    expect(r.lineItems.materialCost).toBe(8900);
    expect(r.lineItems.pitchSurchargeCost).toBe(1900);
    expect(r.lineItems.tearOffCost).toBe(2900);
    expect(r.lineItems.underlaymentCost).toBe(1400);
  });

  it('very_steep', () => {
    const r = calculate({ ...BASE, pitch: 'very_steep' });
    expect(r.low).toBe(14400);
    expect(r.mid).toBe(16950);
    expect(r.high).toBe(19500);
    expect(r.lineItems.materialCost).toBe(10050);
    expect(r.lineItems.pitchSurchargeCost).toBe(2100);
    expect(r.lineItems.tearOffCost).toBe(3250);
    expect(r.lineItems.underlaymentCost).toBe(1550);
  });
});

const MATERIAL_KEYS = MATERIALS.map((m) => m.key);
const PITCH_KEYS = PITCH_ADDERS.map((p) => p.key);
const REGION_KEYS = REGIONS.map((r) => r.key);
const LAYERS: TearOffLayers[] = [0, 1, 2];
const UNDERLAYMENTS = [true, false];
const AREA_MODES: AreaMode[] = ['direct', 'footprint'];
const AREA_SIZES = [500, 2000, 8000];

function fullInputSpace(): CalculatorInputs[] {
  const inputs: CalculatorInputs[] = [];
  for (const material of MATERIAL_KEYS) {
    for (const pitch of PITCH_KEYS) {
      for (const region of REGION_KEYS) {
        for (const tearOffLayers of LAYERS) {
          for (const underlayment of UNDERLAYMENTS) {
            for (const areaMode of AREA_MODES) {
              for (const size of AREA_SIZES) {
                inputs.push({
                  areaMode,
                  directSqft: size,
                  homeSqft: size,
                  stories: 1,
                  material,
                  pitch,
                  tearOffLayers,
                  underlayment,
                  region,
                });
              }
            }
          }
        }
      }
    }
  }
  return inputs;
}

describe('invariant: line items always sum to subtotal', () => {
  it('holds across the full input space', () => {
    const space = fullInputSpace();
    let mismatches = 0;
    for (const inputs of space) {
      const r = calculate(inputs);
      const sum =
        r.lineItems.materialCost +
        r.lineItems.pitchSurchargeCost +
        r.lineItems.tearOffCost +
        r.lineItems.underlaymentCost;
      if (sum !== r.subtotal) mismatches++;
    }
    console.log(`invariant (a): checked ${space.length} combinations, ${mismatches} mismatches`);
    expect(mismatches).toBe(0);
  });
});

describe('invariant: pitch surcharge is zero for low/moderate, positive for steep/very_steep', () => {
  for (const areaMode of AREA_MODES) {
    it(`holds in ${areaMode} mode`, () => {
      for (const pitch of PITCH_KEYS) {
        const r = calculate({ ...BASE, areaMode, directSqft: 2000, pitch });
        if (pitch === 'low' || pitch === 'moderate') {
          expect(r.lineItems.pitchSurchargeCost).toBe(0);
        } else {
          expect(r.lineItems.pitchSurchargeCost).toBeGreaterThan(0);
        }
      }
    });
  }
});

describe('invariant: pitch surcharge does not scale with material price', () => {
  it('is identical for asphalt and slate at fixed area/pitch/region', () => {
    for (const pitch of PITCH_KEYS) {
      for (const region of REGION_KEYS) {
        const asphalt = calculate({ ...BASE, region, pitch, material: 'asphalt' });
        const slate = calculate({ ...BASE, region, pitch, material: 'slate' });
        expect(asphalt.lineItems.pitchSurchargeCost).toBe(slate.lineItems.pitchSurchargeCost);
      }
    }
  });
});

describe('invariant: region multipliers match sourced values exactly', () => {
  const EXPECTED: Record<RegionKey, number> = {
    national: 1.0,
    northeast: 1.0702,
    pacific: 1.1809,
    mountain: 0.952,
    midwest: 1.0095,
    south_atlantic: 0.9358,
    west_south_central: 0.8382,
    east_south_central: 0.9049,
  };

  it.each(REGIONS)('$key multiplier is sourced exactly', (region) => {
    expect(region.multiplier).toBe(EXPECTED[region.key as RegionKey]);
  });
});

describe('pinned default scenario (direct 2000, asphalt, moderate, 1 layer, underlayment, national)', () => {
  it('matches the homepage default', () => {
    const r = calculate({
      areaMode: 'direct',
      directSqft: 2000,
      homeSqft: 2000,
      stories: 1,
      material: 'asphalt',
      pitch: 'moderate',
      tearOffLayers: 1,
      underlayment: true,
      region: 'national',
    });
    expect(r.low).toBe(8950);
    expect(r.mid).toBe(10500);
    expect(r.high).toBe(12100);
  });
});

describe('invariant: out-of-range area returns an error and zeroed numbers', () => {
  it('rejects area below MIN_ROOF_AREA_SQFT', () => {
    const r = calculate({ ...BASE, areaMode: 'direct', directSqft: 0 });
    expect(r.error).toBeTruthy();
    expect(r.roofAreaSqft).toBe(0);
    expect(r.squares).toBe(0);
    expect(r.subtotal).toBe(0);
    expect(r.mid).toBe(0);
    expect(r.low).toBe(0);
    expect(r.high).toBe(0);
  });

  it('rejects area above MAX_ROOF_AREA_SQFT', () => {
    const r = calculate({ ...BASE, areaMode: 'direct', directSqft: 20001 });
    expect(r.error).toBeTruthy();
    expect(r.roofAreaSqft).toBe(0);
    expect(r.squares).toBe(0);
    expect(r.subtotal).toBe(0);
    expect(r.mid).toBe(0);
    expect(r.low).toBe(0);
    expect(r.high).toBe(0);
  });
});
