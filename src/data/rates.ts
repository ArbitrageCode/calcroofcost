// Roofing cost rate table.
//
// Every rate below, material, tear-off, underlayment, region, and pitch, is
// single-sourced (see each sourceNote). Where a region bucket is wider than
// the source's own regions, that entry averages across sub-regions of that
// same single source rather than across multiple sources; see the sourceNote
// on each entry in REGIONS for the exact sub-regions averaged. Where a
// second source was checked but did not publish comparable data (e.g. an
// interactive calculator with no static output, or figures built on
// inconsistent baselines that can't be normalized without fabricating
// precision), that source is named and excluded rather than forced into an
// average. All costs are USD per "square" (100 sq ft of roof area), which is
// the roofing industry's standard unit.

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

// Roof pitch labor surcharge, a flat per-square dollar amount added as its
// own line item (not multiplied into material cost). This is separate from,
// and in addition to, the geometric pitchAreaFactor in calculator.ts that
// converts a flat footprint into sloped roof area (steeper roofs need more
// material regardless of labor cost).
//
// This must be additive, not multiplicative, because MATERIALS above are
// *installed* prices from roofcalc.org that already contain labor.
// Multiplying an installed rate by a labor-only ratio double-counts labor
// and scales the "steep" premium with material price, which is wrong: the
// steep-pitch premium pays for the difficulty of walking the roof, not for
// the material being installed on it.
//
// Source: https://www.squaredash.com/cost/labor/, checked 2026-07-12, states
// "A walkable roof (4/12 to 6/12) allows crews to work efficiently. Steep
// roofs (8/12 and above) require harnesses, toe boards, and scaffolding,
// slowing work by 30-50%" and gives per-square labor pricing of "$150-$175/
// square for simple gable roofs" (walkable) vs. "$200-$275/square for steep
// gables" (8/12+). No other candidate source held up: a Xactimate-based
// pitch/multiplier table (geoquote.ai) states explicitly it is "a geometry
// factor, not a labor, waste, safety, or price multiplier" and was discarded
// as off-topic rather than cited as a labor cost.
//
// Derivation: single-sourced (squaredash.com only; no second source
// publishing a comparable steep-slope labor premium was found). The
// surcharge is the difference between squaredash's steep midpoint and its
// walkable midpoint: ($200+$275)/2 = $237.50 steep, ($150+$175)/2 = $162.50
// walkable, $237.50 - $162.50 = $75.00/sq. Squaredash's own source states
// its "walkable" tier (4/12-6/12) carries no surcharge, so low and moderate
// (which sit at or below its steep threshold of 8/12) are set to $0 as a
// sourced baseline, not an unsourced default. Squaredash does not publish a
// further split above 8/12, so steep and very steep share the same sourced
// surcharge rather than an invented escalation. This surcharge applies only
// to material & install labor; tear-off and underlayment are not adjusted
// for pitch because no source supports a steep-slope premium on those tasks.
export type PitchKey = 'low' | 'moderate' | 'steep' | 'very_steep';

export interface PitchRate {
  key: PitchKey;
  label: string;
  pitchRange: string;
  laborSurchargePerSquare: number;
  sourceNote: string;
}

const PITCH_LABOR_SOURCE =
  'https://www.squaredash.com/cost/labor/ - steep labor $200-275/sq (mid $237.50) minus walkable labor $150-175/sq (mid $162.50) = $75/sq premium.';

export const PITCH_ADDERS: PitchRate[] = [
  {
    key: 'low',
    label: 'Low slope',
    pitchRange: '2/12 - 4/12',
    laborSurchargePerSquare: 0,
    sourceNote: `${PITCH_LABOR_SOURCE} Source states 4/12-6/12 is a "walkable" roof crews work "efficiently," with no surcharge stated; this tier sits at or below that walkable range, so it is priced at the sourced baseline ($0/sq), not an unsourced default.`,
  },
  {
    key: 'moderate',
    label: 'Moderate slope',
    pitchRange: '5/12 - 7/12',
    laborSurchargePerSquare: 0,
    sourceNote: `${PITCH_LABOR_SOURCE} This tier sits below the source's explicit "8/12 and above" steep-surcharge threshold, so it is priced at the sourced baseline ($0/sq), not an unsourced default.`,
  },
  {
    key: 'steep',
    label: 'Steep slope',
    pitchRange: '8/12 - 10/12',
    laborSurchargePerSquare: 75,
    sourceNote: `${PITCH_LABOR_SOURCE} Source states steep roofs (8/12+) run "$200-$275/square" in labor vs. "$150-$175/square" for a walkable roof. Surcharge = steep midpoint ($237.50) - walkable midpoint ($162.50) = $75/sq.`,
  },
  {
    key: 'very_steep',
    label: 'Very steep slope',
    pitchRange: '11/12 - 13/12',
    laborSurchargePerSquare: 75,
    sourceNote: `${PITCH_LABOR_SOURCE} Source does not publish a tier finer than "8/12 and above," so this tier shares the steep-tier surcharge ($75/sq) rather than an extrapolated escalation beyond what the source states.`,
  },
];

export function getPitchAdder(key: PitchKey): PitchRate {
  const pitch = PITCH_ADDERS.find((p) => p.key === key);
  if (!pitch) throw new Error(`Unknown pitch key: ${key}`);
  return pitch;
}

// Regional price multipliers, applied to the full project cost.
//
// Sources checked (per the Batch C research pass, 2026-07-12):
// - https://www.roofcalc.org/regional-roofing-price-adjustments-in-us/
//   publishes a percent adjustment vs. National Average for all nine U.S.
//   Census Bureau regions. This is the only source of the three that yielded
//   usable, comparable regional figures, so every non-national region below
//   is single-sourced to it.
// - homewyse.com's roofing cost pages require an interactive ZIP-code
//   calculator with no static per-region output to fetch; no usable figure
//   could be pulled from it for any region.
// - fixr.com publishes per-state cost pages, but each state page uses a
//   different baseline roof size and roof-type assumption (e.g. Ohio: 2,000
//   sq ft cross-gable; Florida: 1,700 sq ft; Maryland: 3,000 sq ft), and its
//   one published national per-sq-ft figure blends all materials together
//   rather than isolating asphalt. Normalizing those into one comparable
//   percentage would fabricate precision the source doesn't support, so
//   fixr.com is excluded from the region blend.
//
// Blend method: our region buckets are coarser than roofcalc.org's nine
// Census regions, so two buckets (northeast, midwest) are the mean of two
// roofcalc.org sub-regions each; the rest map 1:1 to a single roofcalc.org
// region. All percentages below are quoted verbatim in each entry's
// sourceNote.
export type RegionKey =
  | 'national'
  | 'northeast'
  | 'pacific'
  | 'mountain'
  | 'midwest'
  | 'south_atlantic'
  | 'west_south_central'
  | 'east_south_central';

export interface RegionRate {
  key: RegionKey;
  // Label per spec: "Region (adjusts total cost)" — source publishes total
  // installed roofing price adjustments, not a labor-only figure.
  label: string;
  multiplier: number;
  sourceNote: string;
}

const REGION_SOURCE_URL = 'https://www.roofcalc.org/regional-roofing-price-adjustments-in-us/';

export const REGIONS: RegionRate[] = [
  {
    key: 'national',
    label: 'National Average',
    multiplier: 1.0,
    sourceNote: `${REGION_SOURCE_URL}, checked 2026-07-12. This is the baseline every other region's percentage is stated against, not an independent claim requiring its own figure.`,
  },
  {
    key: 'northeast',
    label: 'Northeast (NY, MA, CT, NJ...)',
    multiplier: 1.0702,
    sourceNote: `${REGION_SOURCE_URL}, checked 2026-07-12. Single-sourced. This bucket spans roofcalc.org's New England ("+7.37%") and Mid Atlantic ("+6.67%") sub-regions; multiplier is the mean of the two: (7.37 + 6.67) / 2 = 7.02% -> 1.0702.`,
  },
  {
    key: 'pacific',
    label: 'Pacific (CA, OR, WA, AK)',
    multiplier: 1.1809,
    sourceNote: `${REGION_SOURCE_URL}, checked 2026-07-12. Single-sourced, direct 1:1 region match: states Pacific runs "+18.09%" vs. National Average -> 1.1809.`,
  },
  {
    key: 'mountain',
    label: 'Mountain (CO, UT, AZ, NV...)',
    multiplier: 0.952,
    sourceNote: `${REGION_SOURCE_URL}, checked 2026-07-12. Single-sourced, direct 1:1 region match: states Mountain runs "-4.8%" vs. National Average -> 0.952.`,
  },
  {
    key: 'midwest',
    label: 'Midwest (OH, IL, MI, MN...)',
    multiplier: 1.0095,
    sourceNote: `${REGION_SOURCE_URL}, checked 2026-07-12. Single-sourced. This bucket spans roofcalc.org's East North Central ("+2.79%") and West North Central ("-0.89%") sub-regions; multiplier is the mean of the two: (2.79 + -0.89) / 2 = 0.95% -> 1.0095.`,
  },
  {
    key: 'south_atlantic',
    label: 'South Atlantic (FL, GA, NC, VA...)',
    multiplier: 0.9358,
    sourceNote: `${REGION_SOURCE_URL}, checked 2026-07-12. Single-sourced, direct 1:1 region match: states South Atlantic runs "-6.42%" vs. National Average -> 0.9358.`,
  },
  {
    key: 'west_south_central',
    label: 'West South Central (TX, LA, OK, AR)',
    multiplier: 0.8382,
    sourceNote: `${REGION_SOURCE_URL}, checked 2026-07-12. Single-sourced, direct 1:1 region match: states West South Central runs "-16.18%" vs. National Average -> 0.8382.`,
  },
  {
    key: 'east_south_central',
    label: 'East South Central (KY, TN, MS, AL)',
    multiplier: 0.9049,
    sourceNote: `${REGION_SOURCE_URL}, checked 2026-07-12. Single-sourced, direct 1:1 region match: states East South Central runs "-9.51%" vs. National Average -> 0.9049.`,
  },
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
