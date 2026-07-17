// Siding cost rate table. Installed $/sq ft of wall area (material + install
// labor). Blend = average of each source's own midpoint, rounded to the
// nearest $0.50.
//
// Source A: https://hover.to/blog/house-siding-cost, checked 2026-07-17
// (published 2026-01-05).
// Source B: https://modernize.com/siding/cost-calculator, checked 2026-07-17
// (2026 per-material table).
//
// vinyl: A $4-12/sq ft (mid $8.00), B $4.50-8.20/sq ft (mid $6.35) ->
//   avg (8.00+6.35)/2=7.175 -> rounded to nearest $0.50 -> $7.00
// aluminum: A $6-10/sq ft (mid $8.00), B $5.60-10.30/sq ft (mid $7.95) ->
//   avg (8.00+7.95)/2=7.975 -> rounded to nearest $0.50 -> $8.00
// fiber_cement: A $6-15/sq ft (mid $10.50), B $4.70-8.50/sq ft (mid $6.60) ->
//   avg (10.50+6.60)/2=8.55 -> rounded to nearest $0.50 -> $8.50
// wood: Source A's wood range was too wide to treat as comparable, so wood
//   is single-sourced to B: $6.90-13.90/sq ft (mid $10.40) -> $10.40, no
//   rounding applied since it's already a single source's own midpoint, not
//   a blend.
// stucco: A $7-17/sq ft (mid $12.00), B $9.30-16.90/sq ft (mid $13.10) ->
//   avg (12.00+13.10)/2=12.55 -> rounded to nearest $0.50 -> $12.50
//
// Engineered wood and steel siding are deliberately OMITTED: neither is
// covered by both sources in a comparable way, so neither clears this
// page's 2-source blend bar. Do not add them without a second corroborating
// source.
export type SidingMaterialKey = 'vinyl' | 'aluminum' | 'fiber_cement' | 'wood' | 'stucco';

export interface SidingMaterialRate {
  key: SidingMaterialKey;
  label: string;
  costPerSqft: number;
  sourceNote: string;
}

const SIDING_SOURCES =
  'https://hover.to/blog/house-siding-cost (checked 2026-07-17, published 2026-01-05) + https://modernize.com/siding/cost-calculator (checked 2026-07-17, 2026 per-material table).';

export const SIDING_MATERIALS: SidingMaterialRate[] = [
  {
    key: 'vinyl',
    label: 'Vinyl',
    costPerSqft: 7.0,
    sourceNote: `${SIDING_SOURCES} Hover.to $4-12/sq ft (mid $8.00), Modernize $4.50-8.20/sq ft (mid $6.35) -> average $7.175 -> rounded to nearest $0.50 -> $7.00/sq ft.`,
  },
  {
    key: 'aluminum',
    label: 'Aluminum',
    costPerSqft: 8.0,
    sourceNote: `${SIDING_SOURCES} Hover.to $6-10/sq ft (mid $8.00), Modernize $5.60-10.30/sq ft (mid $7.95) -> average $7.975 -> rounded to nearest $0.50 -> $8.00/sq ft.`,
  },
  {
    key: 'fiber_cement',
    label: 'Fiber Cement',
    costPerSqft: 8.5,
    sourceNote: `${SIDING_SOURCES} Hover.to $6-15/sq ft (mid $10.50), Modernize $4.70-8.50/sq ft (mid $6.60) -> average $8.55 -> rounded to nearest $0.50 -> $8.50/sq ft.`,
  },
  {
    key: 'wood',
    label: 'Wood',
    costPerSqft: 10.4,
    sourceNote:
      "Hover.to's wood range was too wide to treat as comparable, so this figure is single-sourced to Modernize (https://modernize.com/siding/cost-calculator, checked 2026-07-17): $6.90-13.90/sq ft, mid $10.40/sq ft, used as-is with no averaging.",
  },
  {
    key: 'stucco',
    label: 'Stucco',
    costPerSqft: 12.5,
    sourceNote: `${SIDING_SOURCES} Hover.to $7-17/sq ft (mid $12.00), Modernize $9.30-16.90/sq ft (mid $13.10) -> average $12.55 -> rounded to nearest $0.50 -> $12.50/sq ft.`,
  },
];

export function getSidingMaterial(key: SidingMaterialKey): SidingMaterialRate {
  const material = SIDING_MATERIALS.find((m) => m.key === key);
  if (!material) throw new Error(`Unknown siding material key: ${key}`);
  return material;
}

// Perimeter x height wall-area estimation rule: wallArea = perimeter x (10 x
// stories), i.e. an assumed 10 ft wall height per story. Source:
// https://modernize.com/siding/cost-calculator, checked 2026-07-17, states
// this as its standard method for estimating wall square footage from a
// home's perimeter.
export const ASSUMED_WALL_HEIGHT_PER_STORY_FT = 10;
