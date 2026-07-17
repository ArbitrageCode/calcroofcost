// Window replacement cost rate table. This is a per-window multiplicative
// pricing engine, not a rate x area calculator like the roof/gutter/metal
// roof/siding spokes: base installed cost per window type, adjusted by a
// frame-material multiplier and a glass-package multiplier, plus labor that
// scales with story count and install method.
//
// Sources:
// A: https://constructlytools.com/cost-estimators/window-replacement-cost-calculator/,
//    checked 2026-07-17 (updated 2026-05-16). Publishes an explicit
//    multiplier formula (frame material and glass package multipliers,
//    labor base, full-frame surcharge, story multiplier, multi-window
//    discount) that this calculator implements directly.
// B: https://www.thisoldhouse.com/windows/window-replacement-cost, checked
//    2026-07-17 (updated 2026-06-23). Publishes per-window-type cost
//    averages, used to cross-validate Source A's base figures.
//
// Base installed cost per window (insert install, single story, vinyl frame,
// double-pane Low-E glass baseline) is the average of Source A's insert-mode
// midpoint and Source B's average, wherever both sources publish a
// comparable figure for that window type.
export type WindowTypeKey = 'double_hung' | 'casement' | 'sliding' | 'picture' | 'awning' | 'bay_bow';

export interface WindowTypeRate {
  key: WindowTypeKey;
  label: string;
  baseCost: number;
  sourceNote: string;
}

const WINDOW_BASE_SOURCES =
  'https://constructlytools.com/cost-estimators/window-replacement-cost-calculator/ (checked 2026-07-17, updated 2026-05-16) + https://www.thisoldhouse.com/windows/window-replacement-cost (checked 2026-07-17, updated 2026-06-23).';

export const WINDOW_TYPES: WindowTypeRate[] = [
  {
    key: 'double_hung',
    label: 'Double-Hung',
    baseCost: 500,
    sourceNote: `${WINDOW_BASE_SOURCES} Base cost is the blend of Source A's insert-mode midpoint and Source B's average for double-hung windows.`,
  },
  {
    key: 'casement',
    label: 'Casement',
    baseCost: 605,
    sourceNote: `${WINDOW_BASE_SOURCES} Base cost is the blend of Source A's insert-mode midpoint and Source B's average for casement windows.`,
  },
  {
    key: 'sliding',
    label: 'Sliding',
    baseCost: 530,
    sourceNote: `${WINDOW_BASE_SOURCES} Base cost is the blend of Source A's insert-mode midpoint and Source B's average for sliding windows.`,
  },
  {
    key: 'picture',
    label: 'Picture',
    baseCost: 410,
    sourceNote: `${WINDOW_BASE_SOURCES} Base cost is the blend of Source A's insert-mode midpoint and Source B's average for picture windows.`,
  },
  {
    key: 'awning',
    label: 'Awning',
    baseCost: 555,
    sourceNote: `${WINDOW_BASE_SOURCES} Base cost is the blend of Source A's insert-mode midpoint and Source B's average for awning windows.`,
  },
  {
    key: 'bay_bow',
    label: 'Bay/Bow',
    baseCost: 2850,
    sourceNote:
      "https://constructlytools.com/cost-estimators/window-replacement-cost-calculator/ (checked 2026-07-17, updated 2026-05-16). Bay/bow is priced from Source A's complete-unit range of $1,200-4,500 (midpoint $2,850) rather than blended with Source B, because Source B publishes a per-panel figure for bay/bow windows, a different unit than a complete bay/bow assembly, and averaging the two would compare mismatched quantities. This base cost prices one full bay/bow unit, not one panel.",
  },
];

export function getWindowType(key: WindowTypeKey): WindowTypeRate {
  const type = WINDOW_TYPES.find((t) => t.key === key);
  if (!type) throw new Error(`Unknown window type key: ${key}`);
  return type;
}

// Egress windows (code-mandated emergency-exit windows, typically in
// basements or bedrooms) are deliberately OMITTED as a type option: only
// Source A publishes a figure for them, and every type above clears this
// page's 2-source blend bar (bay/bow is single-sourced too, but that's
// disclosed above as a unit-basis issue, not a missing second source).
// Egress windows also frequently require structural well/excavation work
// neither source prices as part of a like-for-like window swap, which would
// make a ported figure misleading even if a second source existed.

// Frame material multiplier, applied to base cost. Source A publishes this
// formula explicitly.
export type FrameMaterialKey = 'vinyl' | 'aluminum' | 'fiberglass' | 'wood' | 'wood_clad';

export const FRAME_MULT: Record<FrameMaterialKey, number> = {
  vinyl: 1.0,
  aluminum: 1.15,
  fiberglass: 1.3,
  wood: 1.6,
  wood_clad: 1.8,
};

export const FRAME_LABELS: Record<FrameMaterialKey, string> = {
  vinyl: 'Vinyl',
  aluminum: 'Aluminum',
  fiberglass: 'Fiberglass',
  wood: 'Wood',
  wood_clad: 'Wood-Clad',
};

export const FRAME_MULT_SOURCE_NOTE =
  'https://constructlytools.com/cost-estimators/window-replacement-cost-calculator/, checked 2026-07-17 (updated 2026-05-16), publishes this frame-material multiplier table directly: vinyl 1.0x (baseline), aluminum 1.15x, fiberglass 1.30x, wood 1.60x, wood-clad 1.80x.';

// Glass package multiplier, applied to base cost. Source A publishes this
// formula explicitly.
export type GlassPackageKey = 'double' | 'double_lowe_argon' | 'triple' | 'triple_lowe_argon';

export const GLASS_MULT: Record<GlassPackageKey, number> = {
  double: 1.0,
  double_lowe_argon: 1.15,
  triple: 1.3,
  triple_lowe_argon: 1.45,
};

export const GLASS_LABELS: Record<GlassPackageKey, string> = {
  double: 'Double-Pane',
  double_lowe_argon: 'Double-Pane Low-E + Argon',
  triple: 'Triple-Pane',
  triple_lowe_argon: 'Triple-Pane Low-E + Argon',
};

export const GLASS_MULT_SOURCE_NOTE =
  'https://constructlytools.com/cost-estimators/window-replacement-cost-calculator/, checked 2026-07-17 (updated 2026-05-16), publishes this glass-package multiplier table directly: double-pane 1.0x (baseline, matching the base cost figures above which assume double-Low-E), double-pane Low-E + argon 1.15x, triple-pane 1.30x, triple-pane Low-E + argon 1.45x.';

// Labor, install method, and story multiplier. Source A publishes this
// formula explicitly.
export const LABOR_BASE_PER_WINDOW = 150;
export const FULL_FRAME_SURCHARGE = 225;

export type StoryKey = 1 | 2 | 3;

export const STORY_MULT: Record<StoryKey, number> = {
  1: 1.0,
  2: 1.15,
  3: 1.3,
};

export const LABOR_SOURCE_NOTE =
  'https://constructlytools.com/cost-estimators/window-replacement-cost-calculator/, checked 2026-07-17 (updated 2026-05-16), publishes: insert-install labor base $150/window; a $225/window surcharge for full-frame replacement (removing the old frame down to the studs, vs. an insert that reuses the existing frame); and a story multiplier on that labor figure of 1.0x for single-story, 1.15x for two-story, 1.30x for three-story, reflecting ladder work and staging.';

// Multi-window discount. Source A publishes this formula explicitly.
export const MULTI_WINDOW_DISCOUNT_THRESHOLD = 8;
export const MULTI_WINDOW_DISCOUNT = 0.15;

export const MULTI_WINDOW_DISCOUNT_SOURCE_NOTE =
  'https://constructlytools.com/cost-estimators/window-replacement-cost-calculator/, checked 2026-07-17 (updated 2026-05-16), publishes a 15% whole-house discount applied once a project reaches 8 or more windows, reflecting the lower per-window cost of a single mobilization instead of many separate small jobs.';
