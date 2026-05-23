import { DEFAULT_SETTINGS, METER_POSITIONS, STORAGE_KEYS } from './constants';
import type { Settings } from './types';

export function sanitizeUsername(raw: unknown): string {
  return String(raw || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .trim()
    .slice(0, 20);
}

export function getStoredUsername(): string {
  return sanitizeUsername(localStorage.getItem(STORAGE_KEYS.username));
}

export function setStoredUsername(name: unknown): string {
  const clean = sanitizeUsername(name);
  if (!clean) return '';
  localStorage.setItem(STORAGE_KEYS.username, clean);
  return clean;
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
  }
  return fallback;
}

function isMeterPosition(value: unknown): value is Required<Settings>['meterPosition'] {
  return typeof value === 'string' && (METER_POSITIONS as readonly string[]).includes(value);
}

function getStoredObject(raw: string | null): Record<string, unknown> {
  const parsed = raw ? JSON.parse(raw) : null;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

export function getStoredSettings(): Required<Settings> {
  try {
    const stored = getStoredObject(localStorage.getItem(STORAGE_KEYS.settings));

    const normalized: Required<Settings> = {
      meterPosition: isMeterPosition(stored.meterPosition) ? stored.meterPosition : DEFAULT_SETTINGS.meterPosition,
      hideHowToPlay: coerceBoolean(stored.hideHowToPlay, DEFAULT_SETTINGS.hideHowToPlay),
      hideVersusHowToPlay: coerceBoolean(stored.hideVersusHowToPlay, DEFAULT_SETTINGS.hideVersusHowToPlay)
    };

    return normalized;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function setStoredSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }));
}

export function updateStoredSetting<K extends keyof Settings>(key: K, value: Settings[K]): Required<Settings> {
  const next = { ...getStoredSettings(), [key]: value };
  setStoredSettings(next);
  return next;
}
