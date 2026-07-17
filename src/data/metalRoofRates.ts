// Metal roof cost rate table. Installed $/sq ft by roof system (material +
// install labor). Blend = average of each source's own midpoint for that
// system.
//
// Profile rates (corrugated, shingles, standing seam):
// Source A: https://modernize.com/roof/metal/cost, checked 2026-07-17
// (updated 2026-03-16): standing seam $10-16, corrugated $4-14, metal
// shingles $6-21.
// Source B: https://cobexcg.com/metal-roof-cost/, checked 2026-07-17
// (updated 2026-03-20): standing seam $9-16, corrugated $5-12, metal
// shingles $6-14.
//
// corrugated: A mid (4+14)/2=9, B mid (5+12)/2=8.5 -> avg 8.75
// shingles: A mid (6+21)/2=13.5, B mid (6+14)/2=10 -> avg 11.75
// standing_seam: A mid (10+16)/2=13, B mid (9+16)/2=12.5 -> avg 12.75
//
// Premium-metal rates (zinc, copper):
// Source A: modernize.com/roof/metal/cost (same URL/date) material table:
// zinc $10-20, copper $20-40.
// Source B: https://www.thisoldhouse.com/roofing/metal-roofing-cost, checked
// 2026-07-17 (updated 2026-04-03, Homewyse data): zinc $14-20, copper $29-41.
//
// zinc: A mid (10+20)/2=15, B mid (14+20)/2=17 -> avg 16
// copper: A mid (20+40)/2=30, B mid (29+41)/2=35 -> avg 32.5
//
// Stone-coated steel is deliberately OMITTED: only one of the two sources
// above publishes a figure for it (cobexcg.com does not cover this profile
// at all), and a single-source figure doesn't meet this site's 2-source
// blend bar. Do not add it without a second corroborating source.
export type MetalSystemKey = 'corrugated' | 'shingles' | 'standing_seam' | 'zinc' | 'copper';

export interface MetalSystemRate {
  key: MetalSystemKey;
  label: string;
  costPerSqft: number;
  sourceNote: string;
}

const METAL_PROFILE_SOURCES =
  'https://modernize.com/roof/metal/cost (checked 2026-07-17, updated 2026-03-16) + https://cobexcg.com/metal-roof-cost/ (checked 2026-07-17, updated 2026-03-20).';
const METAL_PREMIUM_SOURCES =
  'https://modernize.com/roof/metal/cost (checked 2026-07-17, updated 2026-03-16) + https://www.thisoldhouse.com/roofing/metal-roofing-cost (Homewyse data, checked 2026-07-17, updated 2026-04-03).';

export const METAL_SYSTEMS: MetalSystemRate[] = [
  {
    key: 'corrugated',
    label: 'Corrugated Steel (exposed fastener)',
    costPerSqft: 8.75,
    sourceNote: `${METAL_PROFILE_SOURCES} Modernize $4-14/sq ft (mid $9), cobexcg.com $5-12/sq ft (mid $8.50) -> average $8.75/sq ft.`,
  },
  {
    key: 'shingles',
    label: 'Metal Shingles',
    costPerSqft: 11.75,
    sourceNote: `${METAL_PROFILE_SOURCES} Modernize $6-21/sq ft (mid $13.50), cobexcg.com $6-14/sq ft (mid $10) -> average $11.75/sq ft.`,
  },
  {
    key: 'standing_seam',
    label: 'Standing Seam (steel/aluminum)',
    costPerSqft: 12.75,
    sourceNote: `${METAL_PROFILE_SOURCES} Modernize $10-16/sq ft (mid $13), cobexcg.com $9-16/sq ft (mid $12.50) -> average $12.75/sq ft.`,
  },
  {
    key: 'zinc',
    label: 'Zinc Standing Seam',
    costPerSqft: 16.0,
    sourceNote: `${METAL_PREMIUM_SOURCES} Modernize $10-20/sq ft (mid $15), This Old House $14-20/sq ft (mid $17) -> average $16/sq ft.`,
  },
  {
    key: 'copper',
    label: 'Copper',
    costPerSqft: 32.5,
    sourceNote: `${METAL_PREMIUM_SOURCES} Modernize $20-40/sq ft (mid $30), This Old House $29-41/sq ft (mid $35) -> average $32.50/sq ft.`,
  },
];

export function getMetalSystem(key: MetalSystemKey): MetalSystemRate {
  const system = METAL_SYSTEMS.find((s) => s.key === key);
  if (!system) throw new Error(`Unknown metal roof system key: ${key}`);
  return system;
}
