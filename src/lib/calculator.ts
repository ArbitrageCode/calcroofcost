import {
  ESTIMATE_SPREAD,
  MATERIALS,
  PITCH_ADDERS,
  REGIONS,
  TEAR_OFF_COST_PER_SQUARE_BY_LAYERS,
  UNDERLAYMENT_UPGRADE_COST_PER_SQUARE,
  getMaterial,
  getPitchAdder,
  getRegion,
  type MaterialKey,
  type PitchKey,
  type RegionKey,
} from '../data/rates';

export type AreaMode = 'direct' | 'footprint';
export type TearOffLayers = 0 | 1 | 2;

export interface CalculatorInputs {
  areaMode: AreaMode;
  /** Used when areaMode === 'direct'. Roof area in square feet (already sloped, not flat footprint). */
  directSqft: number;
  /** Used when areaMode === 'footprint'. Total home living area in square feet. */
  homeSqft: number;
  /** Used when areaMode === 'footprint'. Number of stories; footprint = homeSqft / stories. */
  stories: number;
  material: MaterialKey;
  pitch: PitchKey;
  tearOffLayers: TearOffLayers;
  underlayment: boolean;
  region: RegionKey;
}

export const DEFAULT_INPUTS: CalculatorInputs = {
  areaMode: 'direct',
  directSqft: 2000,
  homeSqft: 2000,
  stories: 1,
  material: 'asphalt',
  pitch: 'moderate',
  tearOffLayers: 1,
  underlayment: true,
  region: 'national',
};

// Representative rise-over-12 value for each pitch bucket, used to convert a
// flat footprint into actual sloped roof surface area via the standard
// roofing geometry formula: areaFactor = sqrt(1 + (rise/12)^2).
const PITCH_REPRESENTATIVE_RISE: Record<PitchKey, number> = {
  low: 3,
  moderate: 6,
  steep: 9,
  very_steep: 12,
};

export function pitchAreaFactor(pitch: PitchKey): number {
  const rise = PITCH_REPRESENTATIVE_RISE[pitch];
  return Math.sqrt(1 + (rise / 12) ** 2);
}

export function roundTo50(n: number): number {
  // Snap to the nearest cent before dividing so floating-point noise below
  // $0.01 (e.g. 10500 * 1.15 === 12074.999999999998) can't tip a $25 tie
  // the wrong way; a true half-dollar tie still resolves up deterministically.
  return Math.round(Math.round(n * 100) / 5000) * 50;
}

export interface LineItems {
  materialCost: number;
  pitchSurchargeCost: number;
  tearOffCost: number;
  underlaymentCost: number;
}

export interface CalculatorResult {
  roofAreaSqft: number;
  squares: number;
  lineItems: LineItems;
  subtotal: number;
  mid: number;
  low: number;
  high: number;
  /** Set when the resolved roof area is out of the valid 1-20,000 sq ft range; other fields are zeroed. */
  error?: string;
}

const MIN_ROOF_AREA_SQFT = 1;
const MAX_ROOF_AREA_SQFT = 20000;

export function calculate(inputs: CalculatorInputs): CalculatorResult {
  const material = getMaterial(inputs.material);
  const pitch = getPitchAdder(inputs.pitch);
  const region = getRegion(inputs.region);

  let roofAreaSqft: number;
  if (inputs.areaMode === 'direct') {
    roofAreaSqft = inputs.directSqft;
  } else {
    const stories = Math.max(1, inputs.stories);
    const footprintSqft = inputs.homeSqft / stories;
    roofAreaSqft = footprintSqft * pitchAreaFactor(inputs.pitch);
  }

  if (roofAreaSqft < MIN_ROOF_AREA_SQFT || roofAreaSqft > MAX_ROOF_AREA_SQFT) {
    return {
      roofAreaSqft: 0,
      squares: 0,
      lineItems: { materialCost: 0, pitchSurchargeCost: 0, tearOffCost: 0, underlaymentCost: 0 },
      subtotal: 0,
      mid: 0,
      low: 0,
      high: 0,
      error: `Enter a roof area between ${MIN_ROOF_AREA_SQFT} and ${MAX_ROOF_AREA_SQFT.toLocaleString('en-US')} sq ft`,
    };
  }

  const squares = roofAreaSqft / 100;

  const materialCost = roundTo50(squares * material.costPerSquare * region.multiplier);
  const pitchSurchargeCost = roundTo50(squares * pitch.laborSurchargePerSquare * region.multiplier);
  const tearOffCost = roundTo50(
    inputs.tearOffLayers > 0
      ? squares * TEAR_OFF_COST_PER_SQUARE_BY_LAYERS[inputs.tearOffLayers] * region.multiplier
      : 0,
  );
  const underlaymentCost = roundTo50(
    inputs.underlayment ? squares * UNDERLAYMENT_UPGRADE_COST_PER_SQUARE * region.multiplier : 0,
  );

  const subtotal = materialCost + pitchSurchargeCost + tearOffCost + underlaymentCost;
  const mid = subtotal;
  const low = roundTo50(mid * ESTIMATE_SPREAD.low);
  const high = roundTo50(mid * ESTIMATE_SPREAD.high);

  return {
    roofAreaSqft: Math.round(roofAreaSqft),
    squares: Math.round(squares * 100) / 100,
    lineItems: {
      materialCost,
      pitchSurchargeCost,
      tearOffCost,
      underlaymentCost,
    },
    subtotal,
    mid,
    low,
    high,
  };
}

const VALID_MATERIALS = new Set(MATERIALS.map((m) => m.key));
const VALID_PITCHES = new Set(PITCH_ADDERS.map((p) => p.key));
const VALID_REGIONS = new Set(REGIONS.map((r) => r.key));

export function encodeInputs(inputs: CalculatorInputs): URLSearchParams {
  const params = new URLSearchParams();
  params.set('mode', inputs.areaMode);
  params.set('sqft', String(inputs.directSqft));
  params.set('home', String(inputs.homeSqft));
  params.set('stories', String(inputs.stories));
  params.set('material', inputs.material);
  params.set('pitch', inputs.pitch);
  params.set('tearoff', String(inputs.tearOffLayers));
  params.set('underlayment', inputs.underlayment ? '1' : '0');
  params.set('region', inputs.region);
  return params;
}

function parsePositiveNumber(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function decodeInputs(searchParams: URLSearchParams): CalculatorInputs {
  const mode = searchParams.get('mode');
  const material = searchParams.get('material');
  const pitch = searchParams.get('pitch');
  const region = searchParams.get('region');
  const tearoffRaw = searchParams.get('tearoff');
  const tearoff = tearoffRaw === null ? DEFAULT_INPUTS.tearOffLayers : Number(tearoffRaw);

  return {
    areaMode: mode === 'footprint' ? 'footprint' : 'direct',
    directSqft: parsePositiveNumber(searchParams.get('sqft'), DEFAULT_INPUTS.directSqft),
    homeSqft: parsePositiveNumber(searchParams.get('home'), DEFAULT_INPUTS.homeSqft),
    stories: parsePositiveNumber(searchParams.get('stories'), DEFAULT_INPUTS.stories) || 1,
    material: material && VALID_MATERIALS.has(material as MaterialKey)
      ? (material as MaterialKey)
      : DEFAULT_INPUTS.material,
    pitch: pitch && VALID_PITCHES.has(pitch as PitchKey)
      ? (pitch as PitchKey)
      : DEFAULT_INPUTS.pitch,
    tearOffLayers: ([0, 1, 2] as const).includes(tearoff as TearOffLayers)
      ? (tearoff as TearOffLayers)
      : DEFAULT_INPUTS.tearOffLayers,
    underlayment: searchParams.get('underlayment')
      ? searchParams.get('underlayment') === '1'
      : DEFAULT_INPUTS.underlayment,
    region: region && VALID_REGIONS.has(region as RegionKey)
      ? (region as RegionKey)
      : DEFAULT_INPUTS.region,
  };
}
