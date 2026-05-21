export type CharacterId = string;
export type LevelId = string;
export type GameMode = 'solo' | 'versus';

export interface RegistryState {
  username: string | null;
  selectedCharacterId: CharacterId | null;
  selectedLevelId: LevelId | null;
  settings: Settings;
  activeMatch: MatchSnapshot | null;
  score: number;
  misses: number;
}

export interface Settings {
  meterPosition?: 'top' | 'middle' | 'bottom';
  hideHowToPlay?: boolean;
  hideVersusHowToPlay?: boolean;
}

export interface MatchSnapshot {
  matchId: string;
  inviteCode: string;
  challengerName: string;
  recipientName: string;
  challengerScore: number | null;
  recipientScore: number | null;
  status: 'pending' | 'playing' | 'complete';
  expiresAt: string;
  levelId: LevelId;
  challengerCharacterId: CharacterId | null;
  recipientCharacterId: CharacterId | null;
}
