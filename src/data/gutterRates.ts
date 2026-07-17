// Gutter installation cost rate table.
//
// All costPerLf figures are installed $/LF for a complete system: material,
// downspouts, hardware, and labor are all INCLUDED in these rates. Do not add
// a separate downspout line item anywhere in the calculator; that would
// double-count a cost this rate already contains.
//
// Blend method: average of each source's own midpoint for that material.
// Source A: https://homeguide.com/costs/gutter-installation-cost, checked
// 2026-07-17. Source B: https://www.thisoldhouse.com/gutters/gutter-installation-cost
// (Homewyse data), checked 2026-07-17, publishes 200-LF total installed
// prices; that total is divided by 200 to get a comparable $/LF figure before
// averaging against Source A's own midpoint.
//
// vinyl: A mid $10.00, B $11.94 -> (10.00 + 11.94) / 2 = 10.97 -> 11
// aluminum: A mid $15.00, B $16.76 -> (15.00 + 16.76) / 2 = 15.88 -> 16
// steel: A mid $22.50, B $17.67 -> (22.50 + 17.67) / 2 = 20.09 -> 20
// copper: A mid $32.50, B $37.83 -> (32.50 + 37.83) / 2 = 35.17 -> 35
export type GutterMaterialKey = 'vinyl' | 'aluminum' | 'steel' | 'copper';

export interface GutterMaterialRate {
  key: GutterMaterialKey;
  label: string;
  costPerLf: number;
  sourceNote: string;
}

const GUTTER_MATERIAL_SOURCES =
  'https://homeguide.com/costs/gutter-installation-cost (checked 2026-07-17) + https://www.thisoldhouse.com/gutters/gutter-installation-cost (Homewyse data, 200-LF totals divided by 200, checked 2026-07-17).';

export const GUTTER_MATERIALS: GutterMaterialRate[] = [
  {
    key: 'vinyl',
    label: 'Vinyl',
    costPerLf: 11,
    sourceNote: `${GUTTER_MATERIAL_SOURCES} HomeGuide mid $10.00/LF, This Old House $11.94/LF -> average $10.97 -> $11/LF.`,
  },
  {
    key: 'aluminum',
    label: 'Aluminum',
    costPerLf: 16,
    sourceNote: `${GUTTER_MATERIAL_SOURCES} HomeGuide mid $15.00/LF, This Old House $16.76/LF -> average $15.88 -> $16/LF.`,
  },
  {
    key: 'steel',
    label: 'Steel',
    costPerLf: 20,
    sourceNote: `${GUTTER_MATERIAL_SOURCES} HomeGuide mid $22.50/LF, This Old House $17.67/LF -> average $20.09 -> $20/LF.`,
  },
  {
    key: 'copper',
    label: 'Copper',
    costPerLf: 35,
    sourceNote: `${GUTTER_MATERIAL_SOURCES} HomeGuide mid $32.50/LF, This Old House $37.83/LF -> average $35.17 -> $35/LF.`,
  },
];

export function getGutterMaterial(key: GutterMaterialKey): GutterMaterialRate {
  const material = GUTTER_MATERIALS.find((m) => m.key === key);
  if (!material) throw new Error(`Unknown gutter material key: ${key}`);
  return material;
}

// Additive $/LF surcharge applied when the home is 2 stories (0 for 1 story).
// Two sources, each independently stating the same "+$1 to $3 per linear
// foot" range for second-story work; surcharge is the midpoint of that range.
// Source A: https://homeguide.com/costs/gutter-installation-cost, checked
// 2026-07-17, "+$1 to $3+/LF". Source B:
// https://www.bigriverroofs.com/why-seamless-gutters-are-worth-every-penny/,
// checked 2026-07-17, "adds $1 to $3 per linear foot". Midpoint of $1-$3 is
// $2/LF.
export const STORY_SURCHARGE_PER_LF = 2;
export const STORY_SURCHARGE_SOURCE_NOTE =
  'https://homeguide.com/costs/gutter-installation-cost ("+$1 to $3+/LF" for 2-story homes) + https://www.bigriverroofs.com/why-seamless-gutters-are-worth-every-penny/ ("adds $1 to $3 per linear foot"), both checked 2026-07-17. Midpoint of the $1-$3/LF range is $2/LF.';

// Linear-feet-from-roof-area conversion rule: LF = sqft / 10. Stated by both
// rate sources above (homeguide.com and thisoldhouse.com) as the standard
// rule of thumb for estimating gutter footage from a home's roof/footprint
// square footage.
export const SQFT_TO_LF_DIVISOR = 10;
