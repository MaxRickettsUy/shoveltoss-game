import {
  ASPECT_LANDSCAPE,
  ASPECT_PORTRAIT,
  BOUNCE_DAMPING,
  PIT_WIDTH_LANDSCAPE,
  PIT_WIDTH_PORTRAIT,
  PTS_BACK_WALL,
  PTS_FRONT_WALL,
  PTS_IN_PIT,
  PTS_MISS,
  PTS_STICK,
  SHOVEL_RENDER_W,
  SWEET_SPOT_WIDTH,
  THROW_MULT_MAX,
  THROW_MULT_MIN,
  WALL_THICKNESS,
  ZONE_BACK_WALL_MIN,
  ZONE_FRONT_WALL_MAX
} from './constants';
import type { ThrowInput, ThrowOutcome, ThrowZone } from './types';

const PIT_RIGHT_NATURAL = { width: 1285, height: 814 };
const PIT_LEFT_NATURAL = { width: 1296, height: 831 };
const EPSILON = 0.000001;

export interface ThrowLayout {
  groundY: number;
  playerX: number;
  playerY: number;
  pitLeft: number;
  pitRight: number;
  pitCenterX: number;
  wallX: number;
  wallTopY: number;
  pitScoreLeft: number;
  pitScoreRight: number;
  mirrored: boolean;
}

export function computeOutcome(input: ThrowInput): ThrowOutcome {
  const layout = computeLayout(input.levelId, input.width, input.height);
  const accuracy = clamp(input.accuracy, 0, 1);
  const sweetCenter = clamp(input.sweetSpotCenter ?? 0.5, EPSILON, 1 - EPSILON);
  const sweetSpot = accuracy >= sweetCenter - SWEET_SPOT_WIDTH / 2 && accuracy <= sweetCenter + SWEET_SPOT_WIDTH / 2;
  const throwMultiplier = computeThrowMultiplier(accuracy, sweetCenter);
  const pitDistance = layout.pitCenterX - layout.playerX;
  let landingX = layout.playerX + pitDistance * throwMultiplier;

  const overshoots = layout.mirrored ? landingX < layout.pitLeft : landingX > layout.pitRight;
  if (overshoots && crossesWallBeforeLanding(layout, landingX, input.launchOffsetY ?? 50)) {
    landingX = layout.mirrored
      ? layout.wallX + Math.abs(landingX - layout.wallX) * BOUNCE_DAMPING
      : layout.wallX - Math.abs(landingX - layout.wallX) * BOUNCE_DAMPING;
  }

  const shovelLeft = landingX - SHOVEL_RENDER_W / 2;
  const shovelRight = landingX + SHOVEL_RENDER_W / 2;
  const inPit = shovelRight >= layout.pitScoreLeft && shovelLeft <= layout.pitScoreRight;
  const clampedX = inPit ? clamp(landingX, layout.pitScoreLeft, layout.pitScoreRight) : landingX;
  const zone = computeZone(clampedX, inPit, sweetSpot, input.mode, layout);
  const score = scoreForZone(zone, input.mode);

  return {
    outcome: zone === 'miss' ? 'miss' : 'stick',
    zone,
    landingX: clampedX,
    landingY: layout.groundY,
    score,
    sweetSpot,
    inPit
  };
}

export function computeLayout(levelId: string, width: number, height: number): ThrowLayout {
  const mirrored = levelId === 'lil-italy';
  const aspect = height / width;
  const tA = clamp((aspect - ASPECT_LANDSCAPE) / (ASPECT_PORTRAIT - ASPECT_LANDSCAPE), 0, 1);
  const pitWidth = PIT_WIDTH_LANDSCAPE + tA * (PIT_WIDTH_PORTRAIT - PIT_WIDTH_LANDSCAPE);
  const isLandscape = width > height;
  const groundY = isLandscape ? height : height * 0.82;
  const playerX = width * (mirrored ? 0.9 : 0.1);
  const playerY = groundY;
  const pitCenterX = width * (mirrored ? 0.2 : 0.8);
  const halfWidth = width * pitWidth / 2;
  const natural = mirrored ? PIT_LEFT_NATURAL : PIT_RIGHT_NATURAL;

  if (mirrored) {
    const wallX = WALL_THICKNESS;
    const pitLeft = wallX;
    const pitRight = pitCenterX + halfWidth;
    const dW = pitRight;
    return {
      groundY,
      playerX,
      playerY,
      pitCenterX,
      wallX,
      pitLeft,
      pitRight,
      pitScoreLeft: 0,
      pitScoreRight: pitRight,
      wallTopY: groundY - dW * natural.height / natural.width,
      mirrored
    };
  }

  const pitLeft = pitCenterX - halfWidth;
  const wallX = width - WALL_THICKNESS;
  const pitRight = wallX;
  const dW = width - pitLeft;
  return {
    groundY,
    playerX,
    playerY,
    pitCenterX,
    wallX,
    pitLeft,
    pitRight,
    pitScoreLeft: pitLeft,
    pitScoreRight: width,
    wallTopY: groundY - dW * natural.height / natural.width,
    mirrored
  };
}

function computeThrowMultiplier(fill: number, sweetCenter: number): number {
  if (fill < sweetCenter) {
    const denominator = sweetCenter;
    if (denominator === 0) return 1;
    const multiplier = THROW_MULT_MIN + (fill / denominator) * (1 - THROW_MULT_MIN);
    return Number.isFinite(multiplier) ? multiplier : 1;
  }

  const denominator = 1 - sweetCenter;
  if (denominator === 0) return 1;
  const overPower = (fill - sweetCenter) / denominator;
  const multiplier = 1 + overPower * overPower * (THROW_MULT_MAX - 1);
  return Number.isFinite(multiplier) ? multiplier : 1;
}

function crossesWallBeforeLanding(layout: ThrowLayout, landingX: number, launchOffsetY: number): boolean {
  const originX = layout.playerX;
  const originY = layout.playerY - launchOffsetY;
  const peakHeight = Math.abs(layout.pitCenterX - layout.playerX) * 0.4;
  const wallT = (layout.wallX - originX) / (landingX - originX);
  if (wallT < 0 || wallT > 1) return false;
  const wallY = originY + (layout.groundY - originY) * wallT - peakHeight * 4 * wallT * (1 - wallT);
  return wallY >= layout.wallTopY && wallY < layout.groundY;
}

function computeZone(x: number, inPit: boolean, sweetSpot: boolean, mode: ThrowInput['mode'], layout: ThrowLayout): ThrowZone {
  if (!inPit) return 'miss';

  const norm = layout.mirrored
    ? (layout.pitScoreRight - x) / (layout.pitScoreRight - layout.pitScoreLeft)
    : (x - layout.pitScoreLeft) / (layout.pitScoreRight - layout.pitScoreLeft);

  if (norm < ZONE_FRONT_WALL_MAX) return 'front_wall';
  if (sweetSpot) return 'stick';
  if (norm > ZONE_BACK_WALL_MIN) return 'back_wall';
  return mode === 'versus' ? 'in_pit' : 'in_pit';
}

function scoreForZone(zone: ThrowZone, mode: ThrowInput['mode']): number {
  if (zone === 'miss') return PTS_MISS;
  if (zone === 'front_wall') return mode === 'versus' ? 0 : PTS_FRONT_WALL;
  if (zone === 'stick') return PTS_STICK;
  if (zone === 'back_wall') return mode === 'versus' ? 2 : PTS_BACK_WALL;
  return mode === 'versus' ? 1 : PTS_IN_PIT;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
