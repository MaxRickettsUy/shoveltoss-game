import type { Settings } from './types';

export const ASPECT_LANDSCAPE = 0.6;
export const ASPECT_PORTRAIT = 1.5;
export const THROW_MULT_MIN = 0.25;
export const THROW_MULT_MAX = 2.6;
export const THROW_DURATION = 0.6;
export const THROW_PEAK_RATIO = 0.4;
export const METER_CYCLE_TIME = 0.85;
export const METER_SPEED = 2 / METER_CYCLE_TIME;
export const METER_SPEED_INCREMENT_PER_THROW = 0.15;
export const PIT_WIDTH_LANDSCAPE = 0.22;
export const PIT_WIDTH_PORTRAIT = 0.44;
export const SWEET_SPOT_CENTER = 0.5;
export const SWEET_CENTER_MIN = 0.3;
export const SWEET_CENTER_MAX = 0.85;
export const SWEET_SPOT_HALF_START = 0.1;
export const RESET_DELAY = 500;
export const MISSES_PER_RUN = 3;
export const GAME_OVER_GUARD = 500;
export const PTS_STICK = 3;
export const PTS_BACK_WALL = 1;
export const PTS_IN_PIT = 0;
export const PTS_FRONT_WALL = 1;
export const PTS_MISS = -2;
export const ZONE_FRONT_WALL_MAX = 0.1;
export const ZONE_BACK_WALL_MIN = 0.9;
export const SHOVEL_ROT_RATE = 9;
export const FEEDBACK_DURATION = 1500;
export const HUD_PAD = 20;
export const BOUNCE_DAMPING = 0.6;
export const WALL_THICKNESS = 8;
export const METER_HEIGHT_FRACTION = 0.06;
export const METER_WIDTH_FRACTION = 0.385;
export const SWEET_SPOT_WIDTH = SWEET_SPOT_HALF_START * 2 * 0.35;
export const WALL_HEIGHT_FRACTION = 0.3;
export const CHARACTER_RENDER_H = 150;
export const SHOVEL_RENDER_W = 40;
export const LIFE_ICON_W = 24;
export const DUST_PUFF_FRAMES = 3;
export const DUST_PUFF_DURATION = 250;
export const DUST_PUFF_W = 54;
export const DUST_PUFF_H = 27;
export const PIT_LANDING_VISUAL_ASSET_OFFSET_RIGHT = 291;
export const PIT_LANDING_VISUAL_ASSET_OFFSET_LEFT = 293;
export const PIT_FRONT_OVERLAY_ASSET_OFFSET_RIGHT = 228;
export const PIT_FRONT_OVERLAY_ASSET_OFFSET_LEFT = 219;
export const SHOVEL_STICK_ANGLE = Math.PI / 2;
export const CARD_FLIP_DURATION = 260;
export const STORAGE_KEYS = {
  username: 'shoveltoss.username',
  settings: 'shoveltoss.settings',
  challengeCount: 'shoveltoss.challengesSentToday',
  seenResults: 'shoveltoss.versus.seenResults',
  inProgressMatch: 'shoveltoss.versus.inProgressMatch'
} as const;
export const SEEN_RESULTS_LIMIT = 200;
export const METER_POSITIONS = ['top', 'middle', 'bottom'] as const;
export const DEFAULT_SETTINGS: Required<Settings> = {
  meterPosition: 'top',
  hideHowToPlay: false,
  hideVersusHowToPlay: false
};
export const GLOBAL_SCORE_LIMIT = 100;
export const HIGH_SCORE_BADGE = '👑';
export const PROD_APEX = 'shoveltoss.ing';
export const VERSUS_ENABLED = true;
export const VERSUS_THROWS_PER_PLAYER = 9;
export const VERSUS_POLL_MS = 30000;
export const APP_VERSION_TAG = 'v1.1.0';

export const THEME = {
  bgTop: '#22281f',
  bgBottom: '#0a0d0a',
  surface: '#2c3328',
  surface2: '#171b15',
  text: '#ede8d8',
  textMute: 'rgba(237, 232, 216, 0.62)',
  textFaint: 'rgba(237, 232, 216, 0.42)',
  accent: '#d97a3c',
  accent2: '#f0a166',
  secondary: '#5e6b4a',
  shadow: 'rgba(0, 0, 0, 0.42)',
  selfHighlight: 'rgba(217, 122, 60, 0.18)'
} as const;

export const ERROR_COLOR = '#ff8888';
export const HIGHLIGHT_FILL = THEME.selfHighlight;
