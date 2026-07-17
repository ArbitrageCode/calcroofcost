import {
  ESTIMATE_SPREAD,
} from '../data/rates';
import {
  GUTTER_MATERIALS,
  STORY_SURCHARGE_PER_LF,
  SQFT_TO_LF_DIVISOR,
  getGutterMaterial,
  type GutterMaterialKey,
} from '../data/gutterRates';
import { roundToDollar } from './money';

export type GutterAreaMode = 'direct' | 'sqft';
export type GutterStories = 1 | 2;

export interface GutterCalculatorInputs {
  areaMode: GutterAreaMode;
  /** Used when areaMode === 'direct'. Gutter run length in linear feet. */
  directLf: number;
  /** Used when areaMode === 'sqft'. Roof/home area in square feet; LF = sqft / SQFT_TO_LF_DIVISOR. */
  sqft: number;
  material: GutterMaterialKey;
  stories: GutterStories;
}

// 160 LF, aluminum, 1 story is this page's citable national-average scenario
// (see the Worked Example section), so it doubles as the default result.
export const GUTTER_DEFAULT_INPUTS: GutterCalculatorInputs = {
  areaMode: 'direct',
  directLf: 160,
  sqft: 1600,
  material: 'aluminum',
  stories: 1,
};

export interface GutterLineItems {
  materialCost: number;
  storySurchargeCost: number;
}

export interface GutterCalculatorResult {
  lf: number;
  lineItems: GutterLineItems;
  subtotal: number;
  mid: number;
  low: number;
  high: number;
  /** Set when the resolved LF is out of the valid range; other fields are zeroed. */
  error?: string;
}

const MIN_LF = 1;
// Matches the anchor roof calculator's 20,000 sq ft max area divided by the
// same SQFT_TO_LF_DIVISOR, so the two calculators' input ranges stay consistent.
const MAX_LF = 20000 / SQFT_TO_LF_DIVISOR;

export function calculateGutter(inputs: GutterCalculatorInputs): GutterCalculatorResult {
  const material = getGutterMaterial(inputs.material);

  const lf = inputs.areaMode === 'direct' ? inputs.directLf : inputs.sqft / SQFT_TO_LF_DIVISOR;

  if (lf < MIN_LF || lf > MAX_LF) {
    return {
      lf: 0,
      lineItems: { materialCost: 0, storySurchargeCost: 0 },
      subtotal: 0,
      mid: 0,
      low: 0,
      high: 0,
      error: `Enter a gutter run between ${MIN_LF} and ${MAX_LF.toLocaleString('en-US')} linear feet`,
    };
  }

  const materialCost = roundToDollar(lf * material.costPerLf);
  const storySurchargeCost = roundToDollar(inputs.stories === 2 ? STORY_SURCHARGE_PER_LF * lf : 0);

  const subtotal = materialCost + storySurchargeCost;
  const mid = subtotal;
  const low = roundToDollar(mid * ESTIMATE_SPREAD.low);
  const high = roundToDollar(mid * ESTIMATE_SPREAD.high);

  return {
    lf: Math.round(lf * 100) / 100,
    lineItems: { materialCost, storySurchargeCost },
    subtotal,
    mid,
    low,
    high,
  };
}

const VALID_MATERIALS = new Set(GUTTER_MATERIALS.map((m) => m.key));

export function encodeGutterInputs(inputs: GutterCalculatorInputs): URLSearchParams {
  const params = new URLSearchParams();
  params.set('mode', inputs.areaMode);
  params.set('lf', String(inputs.directLf));
  params.set('sqft', String(inputs.sqft));
  params.set('material', inputs.material);
  params.set('stories', String(inputs.stories));
  return params;
}

function parsePositiveNumber(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function decodeGutterInputs(searchParams: URLSearchParams): GutterCalculatorInputs {
  const mode = searchParams.get('mode');
  const material = searchParams.get('material');
  const storiesRaw = searchParams.get('stories');
  const stories = storiesRaw === null ? GUTTER_DEFAULT_INPUTS.stories : Number(storiesRaw);

  return {
    areaMode: mode === 'sqft' ? 'sqft' : 'direct',
    directLf: parsePositiveNumber(searchParams.get('lf'), GUTTER_DEFAULT_INPUTS.directLf),
    sqft: parsePositiveNumber(searchParams.get('sqft'), GUTTER_DEFAULT_INPUTS.sqft),
    material: material && VALID_MATERIALS.has(material as GutterMaterialKey)
      ? (material as GutterMaterialKey)
      : GUTTER_DEFAULT_INPUTS.material,
    stories: ([1, 2] as const).includes(stories as GutterStories)
      ? (stories as GutterStories)
      : GUTTER_DEFAULT_INPUTS.stories,
  };
}
