import { ESTIMATE_SPREAD, type PitchKey } from '../data/rates';
import {
  METAL_SYSTEMS,
  getMetalSystem,
  type MetalSystemKey,
} from '../data/metalRoofRates';
import {
  resolveRoofAreaSqft,
  MIN_ROOF_AREA_SQFT,
  MAX_ROOF_AREA_SQFT,
  type AreaMode,
} from './calculator';
import { roundToDollar } from './money';

export interface MetalRoofCalculatorInputs {
  areaMode: AreaMode;
  /** Used when areaMode === 'direct'. Roof area in square feet (already sloped, not flat footprint). */
  directSqft: number;
  /** Used when areaMode === 'footprint'. Total home living area in square feet. */
  homeSqft: number;
  /** Used when areaMode === 'footprint'. Number of stories; footprint = homeSqft / stories. */
  stories: number;
  /**
   * Used only in footprint mode, to convert flat footprint into sloped roof
   * area via the shared geometry factor. This spoke does NOT apply the
   * anchor's per-square pitch labor surcharge: these system rates are
   * installed $/sq ft that already price labor, and stacking a second
   * labor adjustment on top would double-count it.
   */
  pitch: PitchKey;
  system: MetalSystemKey;
}

// 2,000 sq ft direct entry, standing seam, is this page's citable
// national-average scenario (see the Worked Example section), so it doubles
// as the default result and matches the flat-gate proof scenario.
export const METAL_ROOF_DEFAULT_INPUTS: MetalRoofCalculatorInputs = {
  areaMode: 'direct',
  directSqft: 2000,
  homeSqft: 2000,
  stories: 1,
  pitch: 'moderate',
  system: 'standing_seam',
};

export interface MetalRoofLineItems {
  materialCost: number;
}

export interface MetalRoofCalculatorResult {
  roofAreaSqft: number;
  lineItems: MetalRoofLineItems;
  subtotal: number;
  mid: number;
  low: number;
  high: number;
  /** Set when the resolved roof area is out of the valid range; other fields are zeroed. */
  error?: string;
}

export function calculateMetalRoof(inputs: MetalRoofCalculatorInputs): MetalRoofCalculatorResult {
  const system = getMetalSystem(inputs.system);

  const roofAreaSqft = resolveRoofAreaSqft(
    inputs.areaMode,
    inputs.directSqft,
    inputs.homeSqft,
    inputs.stories,
    inputs.pitch,
  );

  if (roofAreaSqft < MIN_ROOF_AREA_SQFT || roofAreaSqft > MAX_ROOF_AREA_SQFT) {
    return {
      roofAreaSqft: 0,
      lineItems: { materialCost: 0 },
      subtotal: 0,
      mid: 0,
      low: 0,
      high: 0,
      error: `Enter a roof area between ${MIN_ROOF_AREA_SQFT} and ${MAX_ROOF_AREA_SQFT.toLocaleString('en-US')} sq ft`,
    };
  }

  const materialCost = roundToDollar(roofAreaSqft * system.costPerSqft);

  const subtotal = materialCost;
  const mid = subtotal;
  const low = roundToDollar(mid * ESTIMATE_SPREAD.low);
  const high = roundToDollar(mid * ESTIMATE_SPREAD.high);

  return {
    roofAreaSqft: Math.round(roofAreaSqft),
    lineItems: { materialCost },
    subtotal,
    mid,
    low,
    high,
  };
}

const VALID_SYSTEMS = new Set(METAL_SYSTEMS.map((s) => s.key));

export function encodeMetalRoofInputs(inputs: MetalRoofCalculatorInputs): URLSearchParams {
  const params = new URLSearchParams();
  params.set('mode', inputs.areaMode);
  params.set('sqft', String(inputs.directSqft));
  params.set('home', String(inputs.homeSqft));
  params.set('stories', String(inputs.stories));
  params.set('pitch', inputs.pitch);
  params.set('system', inputs.system);
  return params;
}

function parsePositiveNumber(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const VALID_PITCHES = new Set<PitchKey>(['low', 'moderate', 'steep', 'very_steep']);

export function decodeMetalRoofInputs(searchParams: URLSearchParams): MetalRoofCalculatorInputs {
  const mode = searchParams.get('mode');
  const pitch = searchParams.get('pitch');
  const system = searchParams.get('system');

  return {
    areaMode: mode === 'footprint' ? 'footprint' : 'direct',
    directSqft: parsePositiveNumber(searchParams.get('sqft'), METAL_ROOF_DEFAULT_INPUTS.directSqft),
    homeSqft: parsePositiveNumber(searchParams.get('home'), METAL_ROOF_DEFAULT_INPUTS.homeSqft),
    stories: parsePositiveNumber(searchParams.get('stories'), METAL_ROOF_DEFAULT_INPUTS.stories) || 1,
    pitch: pitch && VALID_PITCHES.has(pitch as PitchKey) ? (pitch as PitchKey) : METAL_ROOF_DEFAULT_INPUTS.pitch,
    system: system && VALID_SYSTEMS.has(system as MetalSystemKey)
      ? (system as MetalSystemKey)
      : METAL_ROOF_DEFAULT_INPUTS.system,
  };
}
