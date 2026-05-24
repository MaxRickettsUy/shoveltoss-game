import { STORAGE_KEYS } from './constants';

const DAILY_CHALLENGE_LIMIT = 10;

interface ChallengeCountRecord {
  date: string;
  count: number;
}

function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeCount(count: unknown): number {
  if (typeof count !== 'number' || !Number.isFinite(count)) return 0;
  return Math.min(DAILY_CHALLENGE_LIMIT, Math.max(0, Math.floor(count)));
}

export function getChallengeCountRecord(): ChallengeCountRecord {
  const today = todayKey();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.challengeCount) || '{}') as Partial<ChallengeCountRecord>;
    if (parsed.date === today) {
      return { date: today, count: normalizeCount(parsed.count) };
    }
  } catch {
    // Ignore corrupt localStorage and reset the daily counter below.
  }
  return { date: today, count: 0 };
}

export function canSendChallengeToday(): boolean {
  return getChallengeCountRecord().count < DAILY_CHALLENGE_LIMIT;
}

export function recordChallengeSent(): void {
  const record = getChallengeCountRecord();
  record.count = Math.min(DAILY_CHALLENGE_LIMIT, record.count + 1);
  try {
    localStorage.setItem(STORAGE_KEYS.challengeCount, JSON.stringify(record));
  } catch {
    // Ignore storage failures; rate limiting still works in memory for this call.
  }
}

export function challengesRemainingToday(): number {
  return Math.max(0, DAILY_CHALLENGE_LIMIT - getChallengeCountRecord().count);
}
