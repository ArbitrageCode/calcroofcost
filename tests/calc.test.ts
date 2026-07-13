import { describe, it, expect } from 'vitest';
import { calculate, encodeInputs, decodeInputs, type CalculatorInputs, type AreaMode, type TearOffLayers } from '../src/lib/calculator';
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
    expect(r.low).toBe(12050);
    expect(r.mid).toBe(14200);
    expect(r.high).toBe(16350);
    expect(r.lineItems.materialCost).toBe(8900);
    expect(r.lineItems.pitchSurchargeCost).toBe(1000);
    expect(r.lineItems.tearOffCost).toBe(2900);
    expect(r.lineItems.underlaymentCost).toBe(1400);
  });

  it('very_steep', () => {
    const r = calculate({ ...BASE, pitch: 'very_steep' });
    expect(r.low).toBe(14550);
    expect(r.mid).toBe(17100);
    expect(r.high).toBe(19650);
    expect(r.lineItems.materialCost).toBe(10050);
    expect(r.lineItems.pitchSurchargeCost).toBe(2250);
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

describe('pinned-value regression cases (hand-verified)', () => {
  it('direct 2000, asphalt, moderate, 2 layers, underlayment, national', () => {
    const r = calculate({
      areaMode: 'direct',
      directSqft: 2000,
      homeSqft: 2000,
      stories: 1,
      material: 'asphalt',
      pitch: 'moderate',
      tearOffLayers: 2,
      underlayment: true,
      region: 'national',
    });
    expect(r.low).toBe(9500);
    expect(r.mid).toBe(11200);
    expect(r.high).toBe(12900);
    expect(r.lineItems.materialCost).toBe(7100);
    expect(r.lineItems.pitchSurchargeCost).toBe(0);
    expect(r.lineItems.tearOffCost).toBe(3000);
    expect(r.lineItems.underlaymentCost).toBe(1100);
  });

  it('footprint 2000/1story, steep, metal, 1 layer, underlayment, pacific', () => {
    const r = calculate({
      areaMode: 'footprint',
      directSqft: 2000,
      homeSqft: 2000,
      stories: 1,
      material: 'metal',
      pitch: 'steep',
      tearOffLayers: 1,
      underlayment: true,
      region: 'pacific',
    });
    expect(r.low).toBe(25900);
    expect(r.mid).toBe(30450);
    expect(r.high).toBe(35000);
    expect(r.lineItems.materialCost).toBe(24250);
    expect(r.lineItems.pitchSurchargeCost).toBe(1200);
    expect(r.lineItems.tearOffCost).toBe(3400);
    expect(r.lineItems.underlaymentCost).toBe(1600);
  });

  it('direct 2000, slate, very_steep, 2 layers, underlayment, west_south_central', () => {
    const r = calculate({
      areaMode: 'direct',
      directSqft: 2000,
      homeSqft: 2000,
      stories: 1,
      material: 'slate',
      pitch: 'very_steep',
      tearOffLayers: 2,
      underlayment: true,
      region: 'west_south_central',
    });
    expect(r.low).toBe(20600);
    expect(r.mid).toBe(24250);
    expect(r.high).toBe(27900);
    expect(r.lineItems.materialCost).toBe(19500);
    expect(r.lineItems.pitchSurchargeCost).toBe(1350);
    expect(r.lineItems.tearOffCost).toBe(2500);
    expect(r.lineItems.underlaymentCost).toBe(900);
  });
});

describe('regression: pitch geometry factor applies only in footprint mode (not direct)', () => {
  it('direct mode ignores the geometry factor entirely: roof area equals entered sqft for every pitch', () => {
    for (const pitch of PITCH_KEYS) {
      const r = calculate({ ...BASE, areaMode: 'direct', directSqft: 2000, pitch });
      expect(r.roofAreaSqft).toBe(2000);
    }
  });

  it('footprint mode applies the geometry factor: roof area grows with pitch', () => {
    const flat = calculate({ ...BASE, areaMode: 'footprint', homeSqft: 2000, stories: 1, pitch: 'low' });
    const steep = calculate({ ...BASE, areaMode: 'footprint', homeSqft: 2000, stories: 1, pitch: 'very_steep' });
    expect(flat.roofAreaSqft).toBe(2062); // 2000 * sqrt(1 + (3/12)^2)
    expect(steep.roofAreaSqft).toBe(2828); // 2000 * sqrt(1 + (12/12)^2)
    expect(steep.roofAreaSqft).toBeGreaterThan(flat.roofAreaSqft);
  });

  it('same pitch, same numeric input: footprint area is ~11.8% higher than direct at 6/12 (moderate)', () => {
    const direct = calculate({ ...BASE, areaMode: 'direct', directSqft: 2000, pitch: 'moderate' });
    const footprint = calculate({ ...BASE, areaMode: 'footprint', homeSqft: 2000, stories: 1, pitch: 'moderate' });
    expect(direct.roofAreaSqft).toBe(2000);
    expect(footprint.roofAreaSqft).toBe(2236);
    const pctHigher = (footprint.roofAreaSqft / direct.roofAreaSqft - 1) * 100;
    expect(pctHigher).toBeCloseTo(11.8, 1);
  });
});

describe('invariant: encodeInputs -> decodeInputs round-trips, including falsy zero values', () => {
  it('round-trips tearOffLayers: 0 (not the default fallback)', () => {
    const inputs: CalculatorInputs = { ...BASE, tearOffLayers: 0 };
    const decoded = decodeInputs(encodeInputs(inputs));
    expect(decoded.tearOffLayers).toBe(0);
  });

  it('round-trips underlayment: false (not the default fallback)', () => {
    const inputs: CalculatorInputs = { ...BASE, underlayment: false };
    const decoded = decodeInputs(encodeInputs(inputs));
    expect(decoded.underlayment).toBe(false);
  });

  it('round-trips a full input set exactly', () => {
    const inputs: CalculatorInputs = {
      areaMode: 'footprint',
      directSqft: 1234,
      homeSqft: 5678,
      stories: 2,
      material: 'tile',
      pitch: 'steep',
      tearOffLayers: 0,
      underlayment: false,
      region: 'pacific',
    };
    const decoded = decodeInputs(encodeInputs(inputs));
    expect(decoded).toEqual(inputs);
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
