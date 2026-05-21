import type { LevelId } from './types';

export interface LevelDefinition {
  id: LevelId;
  label: string;
  background: string;
}

export const LEVELS: LevelDefinition[] = [
  { id: 'lil-italy', label: 'Lil Italy', background: 'assets/level/lil-italy.png' },
  { id: 'the-swamp', label: 'The Swamp', background: 'assets/level/theswamp.png' },
  { id: 'house', label: 'St Paul', background: 'assets/level/shins.png' }
];
