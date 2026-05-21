import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants';
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

export function getStoredSettings(): Required<Settings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
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
