import type { LevelId } from './types';

export interface LevelDefinition {
  id: LevelId;
  label: string;
  background: string;
  isMirrored: boolean;
}

export const LEVELS: LevelDefinition[] = [
  { id: 'lil-italy', label: 'Lil Italy', background: 'assets/level/lil-italy.png', isMirrored: true },
  { id: 'the-swamp', label: 'The Swamp', background: 'assets/level/theswamp.png', isMirrored: false },
  { id: 'house', label: 'St Paul', background: 'assets/level/shins.png', isMirrored: false }
];
