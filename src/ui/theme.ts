import { THEME } from '../game/constants';

export const UI = {
  colors: THEME,
  radius: 6,
  stroke: 2,
  font: 'Archivo, system-ui, sans-serif',
  titleFont: 'Bungee, Impact, sans-serif'
} as const;

export function fitText(value: unknown, maxChars: number): string {
  const text = String(value ?? '');
  if (text.length <= maxChars) return text;
  if (maxChars <= 0) return '';
  if (maxChars < 3) return '.'.repeat(maxChars);
  return `${text.slice(0, Math.max(0, maxChars - 3))}...`;
}

export function formatDate(value: unknown): string {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
