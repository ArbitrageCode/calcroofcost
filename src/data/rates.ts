// Roofing cost rate table.
//
// Every costPerSquare figure below is quoted directly from a single live
// source (see each sourceNote) rather than averaged across multiple
// disagreeing sites. Where no reliable live source could be verified for a
// given adjustment, the value is flattened to neutral (1.0, i.e. no
// adjustment) instead of presenting a fabricated or extrapolated figure as
// if it were sourced. See PITCH_ADDERS and REGIONS below for which entries
// that applies to. All costs are USD per "square" (100 sq ft of roof area),
// which is the roofing industry's standard unit.

export const REGIONAL_DISCLAIMER =
  'Regional multipliers reflect typical differences in labor cost and permitting fees across broad U.S. regions. They are directional planning estimates, not site-specific quotes, and actual contractor pricing in your ZIP code may vary from these figures.';

export type MaterialKey =
  | 'asphalt'
  | 'metal'
  | 'wood'
  | 'tile'
  | 'slate';

export interface MaterialRate {
  key: MaterialKey;
  label: string;
  /** Installed cost per square (material + install labor), excludes tear-off/underlayment. */
  costPerSquare: number;
  lifespanYears: [number, number];
  sourceNote: string;
}

// Materials sorted cheapest to most expensive. All costPerSquare figures below
// are quoted from the same live pricing table on the roofcalc.org homepage
// ("Installation prices for most popular roofing materials in US:"),
// https://www.roofcalc.org/, checked 2026-07-12.
export const MATERIALS: MaterialRate[] = [
  {
    key: 'asphalt',
    label: 'Asphalt Shingles (Architectural)',
    costPerSquare: 356,
    lifespanYears: [20, 30],
    sourceNote: 'https://www.roofcalc.org/, "Architectural Shingles: $5,312 ($356 per square)"',
  },
  {
    key: 'wood',
    label: 'Wood Shake / Shingle',
    costPerSquare: 777,
    lifespanYears: [25, 30],
    sourceNote: 'https://www.roofcalc.org/, "Cedar Shingles or Shakes: $11,571 ($777 per square)"',
  },
  {
    key: 'metal',
    label: 'Metal (Standing Seam)',
    costPerSquare: 821,
    lifespanYears: [40, 70],
    sourceNote: 'https://www.roofcalc.org/, "Standing Seam Metal Roof: $12,234 ($821 per square)"',
  },
  {
    key: 'tile',
    label: 'Concrete / Clay Tile',
    costPerSquare: 909,
    // roofcalc.org prices clay and concrete tile as a single combined figure
    // and does not publish a split, so this is one merged option rather than
    // two options that would otherwise produce identical output.
    lifespanYears: [40, 100],
    sourceNote: 'https://www.roofcalc.org/, "Clay/Concrete Tile Roof: $13,544 ($909 per square)"',
  },
  {
    key: 'slate',
    label: 'Natural Slate',
    costPerSquare: 1164,
    lifespanYears: [75, 150],
    sourceNote: 'https://www.roofcalc.org/, "Natural Slate: $17,344 ($1,164 per square)"',
  },
];

export function getMaterial(key: MaterialKey): MaterialRate {
  const material = MATERIALS.find((m) => m.key === key);
  if (!material) throw new Error(`Unknown material key: ${key}`);
  return material;
}

// Tear-off cost per square, by number of existing layers removed.
// Source: https://squaredash.com/cost/tear-off/, checked 2026-07-12, publishes
// a per-layer table: 1 layer "$1.00 - $1.25" per sq ft, 2 layers "$1.25 -
// $1.75" per sq ft. Values below are the midpoint of that source's own stated
// range for each tier ($112.50/sq -> 115, $150/sq -> 150). The same page
// states most jurisdictions legally prohibit more than two layers and does
// not publish a 3-layer figure, so this calculator caps at two layers rather
// than presenting an extrapolated figure as sourced.
export const TEAR_OFF_COST_PER_SQUARE_BY_LAYERS: Record<1 | 2, number> = {
  1: 115,
  2: 150,
};

// Underlayment upgrade cost per square (basic felt -> synthetic/ice-and-water shield).
// Source: https://www.fixr.com/costs/roof-underlayment-replacement, checked
// 2026-07-12, states material costs of "$0.05 - $0.50" per sq ft for felt and
// "$0.75 to $0.90" per sq ft for ice-and-water shield. Value below is that
// source's ice-and-water midpoint ($82.50/sq) minus its felt midpoint
// ($27.50/sq), i.e. the incremental upgrade cost, since felt is already
// priced into the base material rate.
export const UNDERLAYMENT_UPGRADE_COST_PER_SQUARE = 55;

// Roof pitch cost multipliers, applied to material + labor cost (not tear-off).
// No reliable live source could be verified for exact multiplier values by
// pitch tier: several candidate pages gave vague, mutually inconsistent
// ranges, and one (built around real Xactimate steep-slope charge codes)
// conflated them with unrelated ASTM wind-resistance ratings, which failed a
// basic sanity check and was discarded rather than cited. Every tier is
// flattened to 1.0 (no labor surcharge) rather than presenting an unverified
// escalation as sourced. Steeper roofs still cost more in this calculator
// because they require more material, computed from real roof geometry in
// calculator.ts (pitchAreaFactor), which is unaffected by this multiplier.
// Pitch ranges themselves are standard roofing terminology, not costs, and
// need no citation. OSHA does define "steep-slope," for fall-protection
// purposes, as any pitch above 4/12.
export type PitchKey = 'low' | 'moderate' | 'steep' | 'very_steep';

export interface PitchRate {
  key: PitchKey;
  label: string;
  pitchRange: string;
  multiplier: number;
}

export const PITCH_ADDERS: PitchRate[] = [
  { key: 'low', label: 'Low slope', pitchRange: '2/12 - 4/12', multiplier: 1.0 },
  { key: 'moderate', label: 'Moderate slope', pitchRange: '5/12 - 7/12', multiplier: 1.0 },
  { key: 'steep', label: 'Steep slope', pitchRange: '8/12 - 10/12', multiplier: 1.0 },
  { key: 'very_steep', label: 'Very steep slope', pitchRange: '11/12+', multiplier: 1.0 },
];

export function getPitchAdder(key: PitchKey): PitchRate {
  const pitch = PITCH_ADDERS.find((p) => p.key === key);
  if (!pitch) throw new Error(`Unknown pitch key: ${key}`);
  return pitch;
}

// Regional labor cost multipliers, applied to the full project cost.
// Only two regions have a verified live source:
// https://www.roofcalc.org/regional-roofing-price-adjustments-in-us/, checked
// 2026-07-12, states the Pacific region (CA, OR, WA, AK) runs "+18.09%" vs.
// the National Average, and the West South Central region (TX, LA, OK, AR)
// runs "-16.18%." RSMeans
// City Cost Index would be the authoritative source for the remaining
// regions but is a paywalled product with no free live figures to fetch and
// verify. Those five regions are flattened to 1.0 (no adjustment, same as
// National Average) rather than presenting a previously extrapolated guess
// as sourced. They remain selectable so the region field stays usable once a
// citable source is found for them.
export type RegionKey =
  | 'national'
  | 'northeast'
  | 'pacific'
  | 'mountain'
  | 'midwest'
  | 'south_atlantic'
  | 'west_south_central';

export interface RegionRate {
  key: RegionKey;
  // Label per spec: "Region (adjusts labor cost)"
  label: string;
  multiplier: number;
}

export const REGIONS: RegionRate[] = [
  { key: 'national', label: 'National Average', multiplier: 1.0 },
  { key: 'northeast', label: 'Northeast (NY, MA, CT, NJ...)', multiplier: 1.0 },
  { key: 'pacific', label: 'Pacific (CA, OR, WA, AK)', multiplier: 1.18 },
  { key: 'mountain', label: 'Mountain (CO, UT, AZ, NV...)', multiplier: 1.0 },
  { key: 'midwest', label: 'Midwest (OH, IL, MI, MN...)', multiplier: 1.0 },
  { key: 'south_atlantic', label: 'South Atlantic (FL, GA, NC, VA...)', multiplier: 1.0 },
  { key: 'west_south_central', label: 'West South Central (TX, LA, OK, AR)', multiplier: 0.84 },
];

export function getRegion(key: RegionKey): RegionRate {
  const region = REGIONS.find((r) => r.key === key);
  if (!region) throw new Error(`Unknown region key: ${key}`);
  return region;
}

// Low/Mid/High spread applied around the calculated point estimate, reflecting
// the range of contractor bids a homeowner would realistically receive. This
// is a modeling choice, not a fact with a citable live source, so it is kept
// symmetric (equally likely to under- or overshoot the midpoint) rather than
// the previous asymmetric -15%/+25% band, which implied a false precision.
export const ESTIMATE_SPREAD = {
  low: 0.85,
  high: 1.15,
};
