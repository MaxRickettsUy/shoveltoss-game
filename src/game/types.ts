export type CharacterId = string;
export type LevelId = string;
export type GameMode = 'solo' | 'versus';
export type VersusRole = 'challenger' | 'recipient';

export interface RegistryState {
  username: string | null;
  selectedCharacterId: CharacterId | null;
  selectedLevelId: LevelId | null;
  settings: Settings;
  activeMatch: MatchSnapshot | null;
  score: number;
  misses: number;
  throwsRemaining: number;
}

export type OverlayKind = 'whatsNew' | 'settings' | 'versusHowTo';

export interface Settings {
  meterPosition?: 'top' | 'middle' | 'bottom';
  hideHowToPlay?: boolean;
  hideVersusHowToPlay?: boolean;
}

export interface LeaderboardRow {
  id?: string | number;
  rank?: number;
  name: string;
  character_name?: string | null;
  score: number;
  created_at?: string;
}

export interface PlayerStat {
  name: string;
  games: number;
  totalPoints: number;
  bestScore: number;
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
  createdAt?: string;
}

export interface ThrowInput {
  power: number;
  accuracy: number;
  sweetSpotCenter?: number;
  width: number;
  height: number;
  launchOffsetY?: number;
  characterId: CharacterId;
  levelId: LevelId;
  mode: GameMode;
}

export type ThrowZone = 'stick' | 'miss' | 'front_wall' | 'back_wall' | 'in_pit';

export interface ThrowOutcome {
  outcome: 'stick' | 'miss';
  zone: ThrowZone;
  landingX: number;
  landingY: number;
  score: number;
  sweetSpot: boolean;
  inPit: boolean;
}

export interface GameSceneData {
  mode: GameMode;
  characterId: CharacterId;
  levelId: LevelId;
  throwsRemaining?: number;
  matchId?: string;
}

export interface VersusGameSceneData {
  matchId?: string;
  inviteCode?: string;
  role: VersusRole;
  opponentName?: string;
  characterId: CharacterId;
  levelId?: LevelId;
}

export interface GameOverSceneData {
  score: number;
  characterId: CharacterId;
  levelId: LevelId;
}

export type ThrowState = 'IDLE' | 'CHARGING' | 'FLYING' | 'RESETTING';
