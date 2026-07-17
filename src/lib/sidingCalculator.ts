import { ESTIMATE_SPREAD } from '../data/rates';
import {
  SIDING_MATERIALS,
  ASSUMED_WALL_HEIGHT_PER_STORY_FT,
  getSidingMaterial,
  type SidingMaterialKey,
} from '../data/sidingRates';
import { roundToDollar } from './money';

export type SidingAreaMode = 'direct' | 'perimeter';
export type SidingStories = 1 | 2;

export interface SidingCalculatorInputs {
  areaMode: SidingAreaMode;
  /** Used when areaMode === 'direct'. Wall area in square feet. */
  wallSqft: number;
  /** Used when areaMode === 'perimeter'. Home perimeter in linear feet. */
  perimeter: number;
  /** Used when areaMode === 'perimeter'. wallArea = perimeter x (10 x stories). */
  stories: SidingStories;
  material: SidingMaterialKey;
}

// 2,000 sq ft direct entry, vinyl, is this page's citable national-average
// scenario (see the Worked Example section), so it doubles as the default
// result and matches the flat-gate proof scenario. 200 LF perimeter x 1
// story (10 ft wall height) resolves to the same 2,000 sq ft.
export const SIDING_DEFAULT_INPUTS: SidingCalculatorInputs = {
  areaMode: 'direct',
  wallSqft: 2000,
  perimeter: 200,
  stories: 1,
  material: 'vinyl',
};

const MIN_WALL_AREA_SQFT = 1;
const MAX_WALL_AREA_SQFT = 20000;

// Siding is priced by WALL area, not roof area, so this resolves area fresh
// rather than reusing the anchor roof calculator's footprint/pitch geometry,
// which converts a footprint into sloped *roof* surface area, a different
// quantity entirely.
export function resolveWallAreaSqft(
  areaMode: SidingAreaMode,
  wallSqft: number,
  perimeter: number,
  stories: SidingStories,
): number {
  if (areaMode === 'direct') {
    return wallSqft;
  }
  return perimeter * (ASSUMED_WALL_HEIGHT_PER_STORY_FT * stories);
}

export interface SidingLineItems {
  materialCost: number;
}

export interface SidingCalculatorResult {
  wallAreaSqft: number;
  lineItems: SidingLineItems;
  subtotal: number;
  mid: number;
  low: number;
  high: number;
  /** Set when the resolved wall area is out of the valid range; other fields are zeroed. */
  error?: string;
}

export function calculateSiding(inputs: SidingCalculatorInputs): SidingCalculatorResult {
  const material = getSidingMaterial(inputs.material);

  const wallAreaSqft = resolveWallAreaSqft(inputs.areaMode, inputs.wallSqft, inputs.perimeter, inputs.stories);

  if (wallAreaSqft < MIN_WALL_AREA_SQFT || wallAreaSqft > MAX_WALL_AREA_SQFT) {
    return {
      wallAreaSqft: 0,
      lineItems: { materialCost: 0 },
      subtotal: 0,
      mid: 0,
      low: 0,
      high: 0,
      error: `Enter a wall area between ${MIN_WALL_AREA_SQFT} and ${MAX_WALL_AREA_SQFT.toLocaleString('en-US')} sq ft`,
    };
  }

  const materialCost = roundToDollar(wallAreaSqft * material.costPerSqft);

  const subtotal = materialCost;
  const mid = subtotal;
  const low = roundToDollar(mid * ESTIMATE_SPREAD.low);
  const high = roundToDollar(mid * ESTIMATE_SPREAD.high);

  return {
    wallAreaSqft: Math.round(wallAreaSqft),
    lineItems: { materialCost },
    subtotal,
    mid,
    low,
    high,
  };
}

const VALID_MATERIALS = new Set(SIDING_MATERIALS.map((m) => m.key));

export function encodeSidingInputs(inputs: SidingCalculatorInputs): URLSearchParams {
  const params = new URLSearchParams();
  params.set('mode', inputs.areaMode);
  params.set('wall', String(inputs.wallSqft));
  params.set('perimeter', String(inputs.perimeter));
  params.set('stories', String(inputs.stories));
  params.set('material', inputs.material);
  return params;
}

function parsePositiveNumber(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function decodeSidingInputs(searchParams: URLSearchParams): SidingCalculatorInputs {
  const mode = searchParams.get('mode');
  const material = searchParams.get('material');
  const storiesRaw = searchParams.get('stories');
  const stories = storiesRaw === null ? SIDING_DEFAULT_INPUTS.stories : Number(storiesRaw);

  return {
    areaMode: mode === 'perimeter' ? 'perimeter' : 'direct',
    wallSqft: parsePositiveNumber(searchParams.get('wall'), SIDING_DEFAULT_INPUTS.wallSqft),
    perimeter: parsePositiveNumber(searchParams.get('perimeter'), SIDING_DEFAULT_INPUTS.perimeter),
    stories: ([1, 2] as const).includes(stories as SidingStories)
      ? (stories as SidingStories)
      : SIDING_DEFAULT_INPUTS.stories,
    material: material && VALID_MATERIALS.has(material as SidingMaterialKey)
      ? (material as SidingMaterialKey)
      : SIDING_DEFAULT_INPUTS.material,
  };
}
