import {
  WINDOW_TYPES,
  FRAME_MULT,
  GLASS_MULT,
  LABOR_BASE_PER_WINDOW,
  FULL_FRAME_SURCHARGE,
  STORY_MULT,
  MULTI_WINDOW_DISCOUNT_THRESHOLD,
  MULTI_WINDOW_DISCOUNT,
  getWindowType,
  type WindowTypeKey,
  type FrameMaterialKey,
  type GlassPackageKey,
  type StoryKey,
} from '../data/windowRates';
import { roundToDollar } from './money';

export type InstallMethod = 'insert' | 'full-frame';

export interface WindowCalculatorInputs {
  numWindows: number;
  windowType: WindowTypeKey;
  frameMaterial: FrameMaterialKey;
  glassPackage: GlassPackageKey;
  installMethod: InstallMethod;
  stories: StoryKey;
}

// 10 vinyl double-hung windows, insert install, single story, double-Low-E
// glass is this page's citable national-average scenario (see the Worked
// Example section), so it doubles as the default result and matches the
// flat-gate proof scenario.
export const WINDOW_DEFAULT_INPUTS: WindowCalculatorInputs = {
  numWindows: 10,
  windowType: 'double_hung',
  frameMaterial: 'vinyl',
  glassPackage: 'double_lowe_argon',
  installMethod: 'insert',
  stories: 1,
};

const MIN_WINDOWS = 1;
const MAX_WINDOWS = 100;

export interface WindowCalculatorResult {
  numWindows: number;
  /**
   * Rounded to the nearest whole dollar before being multiplied by
   * numWindows, so the displayed per-window figure x the displayed window
   * count always reconciles exactly with the displayed subtotal — a user
   * checking this calculator's math by hand won't hit a rounding mismatch.
   */
  costPerWindow: number;
  subtotal: number;
  /** Subtotal after the multi-window discount, if it applies. */
  total: number;
  mid: number;
  low: number;
  high: number;
  discountApplied: boolean;
  /** Set when numWindows is out of the valid range; other fields are zeroed. */
  error?: string;
}

export function calculateWindow(inputs: WindowCalculatorInputs): WindowCalculatorResult {
  if (
    !Number.isInteger(inputs.numWindows) ||
    inputs.numWindows < MIN_WINDOWS ||
    inputs.numWindows > MAX_WINDOWS
  ) {
    return {
      numWindows: 0,
      costPerWindow: 0,
      subtotal: 0,
      total: 0,
      mid: 0,
      low: 0,
      high: 0,
      discountApplied: false,
      error: `Enter a whole number of windows between ${MIN_WINDOWS} and ${MAX_WINDOWS}`,
    };
  }

  const windowType = getWindowType(inputs.windowType);
  const frameMult = FRAME_MULT[inputs.frameMaterial];
  const glassMult = GLASS_MULT[inputs.glassPackage];
  const storyMult = STORY_MULT[inputs.stories];
  const isFullFrame = inputs.installMethod === 'full-frame';

  const costPerWindowRaw =
    windowType.baseCost * frameMult * glassMult +
    LABOR_BASE_PER_WINDOW * storyMult +
    (isFullFrame ? FULL_FRAME_SURCHARGE : 0);
  const costPerWindow = roundToDollar(costPerWindowRaw);

  const subtotal = costPerWindow * inputs.numWindows;
  const discountApplied = inputs.numWindows >= MULTI_WINDOW_DISCOUNT_THRESHOLD;
  const total = discountApplied ? roundToDollar(subtotal * (1 - MULTI_WINDOW_DISCOUNT)) : subtotal;

  const mid = total;
  const low = roundToDollar(mid * 0.85);
  const high = roundToDollar(mid * 1.15);

  return {
    numWindows: inputs.numWindows,
    costPerWindow,
    subtotal,
    total,
    mid,
    low,
    high,
    discountApplied,
  };
}

const VALID_WINDOW_TYPES = new Set(WINDOW_TYPES.map((t) => t.key));
const VALID_FRAMES = new Set<FrameMaterialKey>(['vinyl', 'aluminum', 'fiberglass', 'wood', 'wood_clad']);
const VALID_GLASS = new Set<GlassPackageKey>(['double', 'double_lowe_argon', 'triple', 'triple_lowe_argon']);
const VALID_STORIES = new Set<StoryKey>([1, 2, 3]);

export function encodeWindowInputs(inputs: WindowCalculatorInputs): URLSearchParams {
  const params = new URLSearchParams();
  params.set('n', String(inputs.numWindows));
  params.set('type', inputs.windowType);
  params.set('frame', inputs.frameMaterial);
  params.set('glass', inputs.glassPackage);
  params.set('method', inputs.installMethod);
  params.set('stories', String(inputs.stories));
  return params;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

export function decodeWindowInputs(searchParams: URLSearchParams): WindowCalculatorInputs {
  const type = searchParams.get('type');
  const frame = searchParams.get('frame');
  const glass = searchParams.get('glass');
  const method = searchParams.get('method');
  const storiesRaw = searchParams.get('stories');
  const stories = storiesRaw === null ? WINDOW_DEFAULT_INPUTS.stories : Number(storiesRaw);

  return {
    numWindows: parsePositiveInt(searchParams.get('n'), WINDOW_DEFAULT_INPUTS.numWindows) || WINDOW_DEFAULT_INPUTS.numWindows,
    windowType: type && VALID_WINDOW_TYPES.has(type as WindowTypeKey)
      ? (type as WindowTypeKey)
      : WINDOW_DEFAULT_INPUTS.windowType,
    frameMaterial: frame && VALID_FRAMES.has(frame as FrameMaterialKey)
      ? (frame as FrameMaterialKey)
      : WINDOW_DEFAULT_INPUTS.frameMaterial,
    glassPackage: glass && VALID_GLASS.has(glass as GlassPackageKey)
      ? (glass as GlassPackageKey)
      : WINDOW_DEFAULT_INPUTS.glassPackage,
    installMethod: method === 'full-frame' ? 'full-frame' : 'insert',
    stories: VALID_STORIES.has(stories as StoryKey) ? (stories as StoryKey) : WINDOW_DEFAULT_INPUTS.stories,
  };
}
