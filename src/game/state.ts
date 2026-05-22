import Phaser from 'phaser';
import type { RegistryState } from './types';

export type RegistryKey = keyof RegistryState;

export function getRegistryValue<K extends RegistryKey>(
  game: Phaser.Game,
  key: K
): RegistryState[K] | undefined {
  return game.registry.get(key) as RegistryState[K] | undefined;
}

export function setRegistryValue<K extends RegistryKey>(
  game: Phaser.Game,
  key: K,
  value: RegistryState[K]
): void {
  game.registry.set(key, value);
}

export function onRegistryChange<K extends RegistryKey>(
  game: Phaser.Game,
  key: K,
  fn: (value: RegistryState[K], previousValue: RegistryState[K]) => void,
  context?: unknown
): () => void {
  const eventName = `changedata-${String(key)}`;
  const handler = (_parent: unknown, value: RegistryState[K], previousValue: RegistryState[K]) => fn(value, previousValue);
  game.registry.events.on(eventName, handler, context);
  return () => {
    game.registry.events.off(eventName, handler, context);
  };
}

export function offRegistryChange<K extends RegistryKey>(
  game: Phaser.Game,
  key: K,
  fn: (value: RegistryState[K], previousValue: RegistryState[K]) => void,
  context?: unknown
): void {
  game.registry.events.off(`changedata-${String(key)}`, fn, context);
}
