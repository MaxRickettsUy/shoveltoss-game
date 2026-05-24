import type Phaser from 'phaser';
import { VERSUS_POLL_MS } from './constants';
import { LEVELS } from './levels';
import { setRegistryValue } from './state';
import type { MatchSnapshot } from './types';

interface MatchRow {
  id: string;
  invite_code: string;
  challenger_name: string;
  recipient_name: string | null;
  challenger_score: number | null;
  recipient_score: number | null;
  status: 'pending' | 'playing' | 'complete';
  created_at?: string;
  expires_at: string;
  level_id?: string | null;
  challenger_character_id?: string | null;
  recipient_character_id?: string | null;
}

type Listener = (match: MatchSnapshot, error?: unknown) => void;

let timer: number | null = null;
let activeMatch: MatchSnapshot | null = null;
const listeners = new Set<Listener>();

export function normalizeMatch(row: MatchRow): MatchSnapshot {
  return {
    matchId: row.id,
    inviteCode: row.invite_code,
    challengerName: row.challenger_name,
    recipientName: row.recipient_name || 'opponent',
    challengerScore: row.challenger_score,
    recipientScore: row.recipient_score,
    status: row.status,
    expiresAt: row.expires_at,
    levelId: row.level_id || LEVELS[0].id,
    challengerCharacterId: row.challenger_character_id || null,
    recipientCharacterId: row.recipient_character_id || null,
    createdAt: row.created_at
  };
}

export function getOpponentName(match: MatchSnapshot, username: string | null | undefined): string {
  return isSameName(match.challengerName, username) ? match.recipientName : match.challengerName;
}

export function getMatchRole(match: MatchSnapshot, username: string | null | undefined): 'challenger' | 'recipient' | null {
  if (isSameName(match.challengerName, username)) return 'challenger';
  if (isSameName(match.recipientName, username)) return 'recipient';
  return null;
}

export function isSameName(a: unknown, b: unknown): boolean {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

export function isExpired(match: MatchSnapshot): boolean {
  return new Date(match.expiresAt).getTime() < Date.now();
}

export function hasMyScore(match: MatchSnapshot, username: string | null | undefined): boolean {
  const role = getMatchRole(match, username);
  if (role === 'challenger') return match.challengerScore != null;
  if (role === 'recipient') return match.recipientScore != null;
  return false;
}

export function hasOpponentScore(match: MatchSnapshot, username: string | null | undefined): boolean {
  const role = getMatchRole(match, username);
  if (role === 'challenger') return match.recipientScore != null;
  if (role === 'recipient') return match.challengerScore != null;
  return false;
}

export async function fetchMatch(match: MatchSnapshot): Promise<MatchSnapshot> {
  const row = await window.globalScores.fetchMatchByCode(match.inviteCode);
  return normalizeMatch(row);
}

export async function fetchMatchesForPlayer(username: string): Promise<MatchSnapshot[]> {
  const [pending, recent] = await Promise.all([
    window.globalScores.fetchPendingForUser(username),
    window.globalScores.fetchRecentResultsForUser(username)
  ]);
  return [...pending, ...recent].map(normalizeMatch);
}

export async function fetchHistoryForPlayer(username: string): Promise<MatchSnapshot[]> {
  const rows = await window.globalScores.fetchHistoryForUser(username);
  return rows.map(normalizeMatch);
}

export function start(game: Phaser.Game, match: MatchSnapshot): void {
  stop();
  activeMatch = match;
  setRegistryValue(game, 'activeMatch', match);
  void poll(game);
  timer = window.setInterval(() => void poll(game), VERSUS_POLL_MS);
}

export function stop(): void {
  if (timer != null) window.clearInterval(timer);
  timer = null;
  activeMatch = null;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function poll(game: Phaser.Game): Promise<void> {
  if (!activeMatch) return;
  const startedMatch = activeMatch;
  const startedMatchId = startedMatch.matchId;
  try {
    const match = await fetchMatch(startedMatch);
    if (activeMatch?.matchId !== startedMatchId) return;
    activeMatch = match;
    setRegistryValue(game, 'activeMatch', match);
    for (const fn of listeners) fn(match);
    if (match.status === 'complete') stop();
  } catch (error) {
    console.error('Failed to poll versus match', { activeMatch, startedMatch, error });
    if (activeMatch?.matchId !== startedMatchId) return;
    for (const fn of listeners) fn(startedMatch, error);
  }
}
