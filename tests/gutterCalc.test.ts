import { describe, it, expect } from 'vitest';
import {
  calculateGutter,
  encodeGutterInputs,
  decodeGutterInputs,
  GUTTER_DEFAULT_INPUTS,
  type GutterCalculatorInputs,
} from '../src/lib/gutterCalculator';
import { GUTTER_MATERIALS, type GutterMaterialKey } from '../src/data/gutterRates';

const BASE: GutterCalculatorInputs = {
  areaMode: 'direct',
  directLf: 160,
  sqft: 1600,
  material: 'aluminum',
  stories: 1,
};

describe('flat-gate proof: 160 LF, 1-story, all 4 materials', () => {
  it('vinyl', () => {
    expect(calculateGutter({ ...BASE, material: 'vinyl' }).lineItems.materialCost).toBe(1760);
  });
  it('aluminum', () => {
    expect(calculateGutter({ ...BASE, material: 'aluminum' }).lineItems.materialCost).toBe(2560);
  });
  it('steel', () => {
    expect(calculateGutter({ ...BASE, material: 'steel' }).lineItems.materialCost).toBe(3200);
  });
  it('copper', () => {
    expect(calculateGutter({ ...BASE, material: 'copper' }).lineItems.materialCost).toBe(5600);
  });

  it('all 4 material totals are distinct', () => {
    const totals = GUTTER_MATERIALS.map((m) => calculateGutter({ ...BASE, material: m.key }).subtotal);
    expect(new Set(totals).size).toBe(totals.length);
  });
});

describe('flat-gate proof: aluminum, 160 LF, story delta', () => {
  it('1-story vs 2-story delta is exactly $320', () => {
    const oneStory = calculateGutter({ ...BASE, stories: 1 });
    const twoStory = calculateGutter({ ...BASE, stories: 2 });
    expect(oneStory.subtotal).toBe(2560);
    expect(twoStory.subtotal).toBe(2880);
    expect(twoStory.subtotal - oneStory.subtotal).toBe(320);
  });
});

describe('pinned default scenario (direct 160 LF, aluminum, 1 story)', () => {
  it('matches the page default and citable worked example', () => {
    const r = calculateGutter(GUTTER_DEFAULT_INPUTS);
    expect(r.lf).toBe(160);
    expect(r.lineItems.materialCost).toBe(2560);
    expect(r.lineItems.storySurchargeCost).toBe(0);
    expect(r.mid).toBe(2560);
    expect(r.low).toBe(2176);
    expect(r.high).toBe(2944);
  });
});

describe('pinned-value regression cases (hand-verified)', () => {
  it('sqft mode: 1000 sqft -> 100 LF, steel, 2 stories', () => {
    const r = calculateGutter({
      areaMode: 'sqft',
      directLf: 0,
      sqft: 1000,
      material: 'steel',
      stories: 2,
    });
    expect(r.lf).toBe(100);
    expect(r.lineItems.materialCost).toBe(2000);
    expect(r.lineItems.storySurchargeCost).toBe(200);
    expect(r.subtotal).toBe(2200);
    expect(r.low).toBe(1870);
    expect(r.high).toBe(2530);
  });

  it('direct 250 LF, copper, 2 stories', () => {
    const r = calculateGutter({
      areaMode: 'direct',
      directLf: 250,
      sqft: 0,
      material: 'copper',
      stories: 2,
    });
    expect(r.lineItems.materialCost).toBe(8750);
    expect(r.lineItems.storySurchargeCost).toBe(500);
    expect(r.subtotal).toBe(9250);
    expect(r.low).toBe(7863);
    expect(r.high).toBe(10638);
  });
});

describe('invariant: line items always sum to subtotal', () => {
  it('holds across the full input space', () => {
    const MATERIAL_KEYS = GUTTER_MATERIALS.map((m) => m.key);
    const STORIES: (1 | 2)[] = [1, 2];
    const LF_VALUES = [1, 50, 160, 500, 2000];
    let mismatches = 0;
    let checked = 0;
    for (const material of MATERIAL_KEYS) {
      for (const stories of STORIES) {
        for (const lf of LF_VALUES) {
          const r = calculateGutter({ areaMode: 'direct', directLf: lf, sqft: 0, material, stories });
          checked++;
          if (r.lineItems.materialCost + r.lineItems.storySurchargeCost !== r.subtotal) mismatches++;
        }
      }
    }
    console.log(`invariant: checked ${checked} combinations, ${mismatches} mismatches`);
    expect(mismatches).toBe(0);
  });
});

describe('invariant: story surcharge is zero for 1-story, positive for 2-story', () => {
  it('holds for every material', () => {
    for (const material of GUTTER_MATERIALS.map((m) => m.key)) {
      const one = calculateGutter({ ...BASE, material, stories: 1 });
      const two = calculateGutter({ ...BASE, material, stories: 2 });
      expect(one.lineItems.storySurchargeCost).toBe(0);
      expect(two.lineItems.storySurchargeCost).toBeGreaterThan(0);
    }
  });
});

describe('invariant: story surcharge does not scale with material price', () => {
  it('is identical for vinyl and copper at fixed LF/stories', () => {
    const vinyl = calculateGutter({ ...BASE, material: 'vinyl', stories: 2 });
    const copper = calculateGutter({ ...BASE, material: 'copper', stories: 2 });
    expect(vinyl.lineItems.storySurchargeCost).toBe(copper.lineItems.storySurchargeCost);
  });
});

describe('invariant: sqft mode divides by 10 to get LF', () => {
  it('sqft 1600 in sqft mode equals directLf 160 in direct mode', () => {
    const direct = calculateGutter({ areaMode: 'direct', directLf: 160, sqft: 0, material: 'aluminum', stories: 1 });
    const sqft = calculateGutter({ areaMode: 'sqft', directLf: 0, sqft: 1600, material: 'aluminum', stories: 1 });
    expect(sqft.lf).toBe(direct.lf);
    expect(sqft.subtotal).toBe(direct.subtotal);
  });
});

describe('invariant: encodeGutterInputs -> decodeGutterInputs round-trips', () => {
  it('round-trips a full input set exactly', () => {
    const inputs: GutterCalculatorInputs = {
      areaMode: 'sqft',
      directLf: 1234,
      sqft: 5678,
      material: 'steel',
      stories: 2,
    };
    const decoded = decodeGutterInputs(encodeGutterInputs(inputs));
    expect(decoded).toEqual(inputs);
  });

  it('round-trips stories: 1 (not the default fallback of 1 masking a decode bug)', () => {
    const inputs: GutterCalculatorInputs = { ...BASE, stories: 1 };
    const decoded = decodeGutterInputs(encodeGutterInputs(inputs));
    expect(decoded.stories).toBe(1);
  });
});

describe('invariant: out-of-range LF returns an error and zeroed numbers', () => {
  it('rejects LF below the minimum', () => {
    const r = calculateGutter({ ...BASE, directLf: 0 });
    expect(r.error).toBeTruthy();
    expect(r.lf).toBe(0);
    expect(r.subtotal).toBe(0);
    expect(r.low).toBe(0);
    expect(r.high).toBe(0);
  });

  it('rejects LF above the maximum (2000, derived from the roof calculator\'s 20,000 sqft cap / 10)', () => {
    const r = calculateGutter({ ...BASE, directLf: 2001 });
    expect(r.error).toBeTruthy();
  });

  it('accepts LF exactly at the maximum boundary', () => {
    const r = calculateGutter({ ...BASE, directLf: 2000 });
    expect(r.error).toBeUndefined();
  });
});
