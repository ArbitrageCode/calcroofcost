import { describe, it, expect } from 'vitest';
import {
  calculateWindow,
  encodeWindowInputs,
  decodeWindowInputs,
  WINDOW_DEFAULT_INPUTS,
  type WindowCalculatorInputs,
} from '../src/lib/windowCalculator';
import { type FrameMaterialKey } from '../src/data/windowRates';

const BASE: WindowCalculatorInputs = {
  numWindows: 10,
  windowType: 'double_hung',
  frameMaterial: 'vinyl',
  glassPackage: 'double_lowe_argon',
  installMethod: 'insert',
  stories: 1,
};

describe('flat-gate proof: 10 double-hung, insert, 1-story, double-Low-E, vary frame across all 5 (real calc module)', () => {
  const EXPECTED_TOTAL: Record<FrameMaterialKey, number> = {
    vinyl: 6163,
    aluminum: 6894,
    fiberglass: 7633,
    wood: 9095,
    wood_clad: 10073,
  };
  const FRAMES: FrameMaterialKey[] = ['vinyl', 'aluminum', 'fiberglass', 'wood', 'wood_clad'];

  it.each(FRAMES)('%s totals as expected', (frameMaterial) => {
    const r = calculateWindow({ ...BASE, frameMaterial });
    expect(r.total).toBe(EXPECTED_TOTAL[frameMaterial]);
  });

  it('all 5 totals are distinct', () => {
    const totals = FRAMES.map((frameMaterial) => calculateWindow({ ...BASE, frameMaterial }).total);
    expect(new Set(totals).size).toBe(totals.length);
    expect(totals).toEqual([6163, 6894, 7633, 9095, 10073]);
  });
});

describe('pinned default/worked-example scenario (10 vinyl double-hung, insert, 1-story, double-Low-E)', () => {
  it('matches the page default and citable worked example', () => {
    const r = calculateWindow(WINDOW_DEFAULT_INPUTS);
    expect(r.costPerWindow).toBe(725);
    expect(r.subtotal).toBe(7250);
    expect(r.discountApplied).toBe(true);
    expect(r.total).toBe(6163);
    expect(r.mid).toBe(6163);
    expect(r.low).toBe(5239);
    expect(r.high).toBe(7087);
  });
});

describe('multi-window discount boundary: 7 vs 8 windows', () => {
  it('7 windows: no discount', () => {
    const r = calculateWindow({ ...BASE, numWindows: 7 });
    expect(r.costPerWindow).toBe(725);
    expect(r.subtotal).toBe(5075);
    expect(r.discountApplied).toBe(false);
    expect(r.total).toBe(5075);
    expect(r.low).toBe(4314);
    expect(r.high).toBe(5836);
  });

  it('8 windows: discount applies', () => {
    const r = calculateWindow({ ...BASE, numWindows: 8 });
    expect(r.costPerWindow).toBe(725);
    expect(r.subtotal).toBe(5800);
    expect(r.discountApplied).toBe(true);
    expect(r.total).toBe(4930);
    expect(r.low).toBe(4191);
    expect(r.high).toBe(5670);
  });
});

describe('pinned-value regression cases (hand-verified independently before writing this file)', () => {
  it('full-frame surcharge + 2-story labor: 5 casement, fiberglass, triple-pane, full-frame, 2-story', () => {
    const r = calculateWindow({
      numWindows: 5,
      windowType: 'casement',
      frameMaterial: 'fiberglass',
      glassPackage: 'triple',
      installMethod: 'full-frame',
      stories: 2,
    });
    expect(r.costPerWindow).toBe(1420);
    expect(r.subtotal).toBe(7100);
    expect(r.discountApplied).toBe(false);
    expect(r.total).toBe(7100);
    expect(r.low).toBe(6035);
    expect(r.high).toBe(8165);
  });

  it('bay/bow single-unit: 1 bay/bow, wood frame, triple-Low-E-argon, full-frame, 1-story', () => {
    const r = calculateWindow({
      numWindows: 1,
      windowType: 'bay_bow',
      frameMaterial: 'wood',
      glassPackage: 'triple_lowe_argon',
      installMethod: 'full-frame',
      stories: 1,
    });
    expect(r.costPerWindow).toBe(6987);
    expect(r.subtotal).toBe(6987);
    expect(r.discountApplied).toBe(false);
    expect(r.total).toBe(6987);
    expect(r.low).toBe(5939);
    expect(r.high).toBe(8035);
  });
});

describe('invariant: subtotal always equals costPerWindow x numWindows exactly', () => {
  it('holds across the full input space (rounded per-window cost reconciles by construction)', () => {
    const TYPES: WindowCalculatorInputs['windowType'][] = ['double_hung', 'casement', 'sliding', 'picture', 'awning', 'bay_bow'];
    const FRAMES: FrameMaterialKey[] = ['vinyl', 'aluminum', 'fiberglass', 'wood', 'wood_clad'];
    const COUNTS = [1, 5, 8, 20];
    let mismatches = 0;
    let checked = 0;
    for (const windowType of TYPES) {
      for (const frameMaterial of FRAMES) {
        for (const numWindows of COUNTS) {
          const r = calculateWindow({ ...BASE, windowType, frameMaterial, numWindows });
          checked++;
          if (r.costPerWindow * numWindows !== r.subtotal) mismatches++;
        }
      }
    }
    console.log(`invariant: checked ${checked} combinations, ${mismatches} mismatches`);
    expect(mismatches).toBe(0);
  });
});

describe('invariant: discount only applies at numWindows >= 8, and only affects total, not costPerWindow/subtotal', () => {
  it('holds across a range of window counts', () => {
    for (let n = 1; n <= 12; n++) {
      const r = calculateWindow({ ...BASE, numWindows: n });
      expect(r.discountApplied).toBe(n >= 8);
      if (n >= 8) {
        expect(r.total).toBeLessThan(r.subtotal);
      } else {
        expect(r.total).toBe(r.subtotal);
      }
    }
  });
});

describe('invariant: full-frame always costs more than insert, all else equal', () => {
  it('holds for every frame material', () => {
    const FRAMES: FrameMaterialKey[] = ['vinyl', 'aluminum', 'fiberglass', 'wood', 'wood_clad'];
    for (const frameMaterial of FRAMES) {
      const insert = calculateWindow({ ...BASE, frameMaterial, installMethod: 'insert' });
      const fullFrame = calculateWindow({ ...BASE, frameMaterial, installMethod: 'full-frame' });
      expect(fullFrame.costPerWindow).toBeGreaterThan(insert.costPerWindow);
    }
  });
});

describe('invariant: story multiplier increases labor cost monotonically', () => {
  it('3-story costs more per window than 2-story costs more than 1-story', () => {
    const one = calculateWindow({ ...BASE, stories: 1 });
    const two = calculateWindow({ ...BASE, stories: 2 });
    const three = calculateWindow({ ...BASE, stories: 3 });
    expect(two.costPerWindow).toBeGreaterThan(one.costPerWindow);
    expect(three.costPerWindow).toBeGreaterThan(two.costPerWindow);
  });
});

describe('invariant: encodeWindowInputs -> decodeWindowInputs round-trips', () => {
  it('round-trips a full input set exactly', () => {
    const inputs: WindowCalculatorInputs = {
      numWindows: 12,
      windowType: 'bay_bow',
      frameMaterial: 'wood_clad',
      glassPackage: 'triple_lowe_argon',
      installMethod: 'full-frame',
      stories: 3,
    };
    const decoded = decodeWindowInputs(encodeWindowInputs(inputs));
    expect(decoded).toEqual(inputs);
  });

  it('round-trips installMethod: insert (not the default fallback masking a decode bug)', () => {
    const inputs: WindowCalculatorInputs = { ...BASE, installMethod: 'insert' };
    const decoded = decodeWindowInputs(encodeWindowInputs(inputs));
    expect(decoded.installMethod).toBe('insert');
  });
});

describe('invariant: out-of-range or non-integer window count returns an error and zeroed numbers', () => {
  it('rejects 0 windows', () => {
    const r = calculateWindow({ ...BASE, numWindows: 0 });
    expect(r.error).toBeTruthy();
    expect(r.total).toBe(0);
    expect(r.low).toBe(0);
    expect(r.high).toBe(0);
  });

  it('rejects windows above the maximum', () => {
    const r = calculateWindow({ ...BASE, numWindows: 101 });
    expect(r.error).toBeTruthy();
  });

  it('rejects a non-integer window count', () => {
    const r = calculateWindow({ ...BASE, numWindows: 3.5 });
    expect(r.error).toBeTruthy();
  });
});
