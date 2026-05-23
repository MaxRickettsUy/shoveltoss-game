import Phaser from 'phaser';
import type { RegistryState } from './types';

export type RegistryKey = keyof RegistryState;

type RegistryChangeHandler<K extends RegistryKey> = (
  parent: unknown,
  value: RegistryState[K],
  previousValue: RegistryState[K]
) => void;
type RegistryCallback = (
  value: RegistryState[RegistryKey],
  previousValue: RegistryState[RegistryKey]
) => void;

const listenersMap = new Map<
  string,
  Map<RegistryCallback, Map<unknown, RegistryChangeHandler<RegistryKey>>>
>();

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
  const registryCallback = fn as RegistryCallback;
  const keyListeners = listenersMap.get(eventName) ?? new Map();
  const contextListeners = keyListeners.get(registryCallback) ?? new Map();
  const handler: RegistryChangeHandler<K> = (_parent, value, previousValue) => fn.call(context, value, previousValue);

  contextListeners.set(context, handler as RegistryChangeHandler<RegistryKey>);
  keyListeners.set(registryCallback, contextListeners);
  listenersMap.set(eventName, keyListeners);

  game.registry.events.on(eventName, handler, context);
  return () => {
    game.registry.events.off(eventName, handler, context);
    if (contextListeners.get(context) === handler) {
      contextListeners.delete(context);
      if (contextListeners.size === 0) {
        keyListeners.delete(registryCallback);
      }
      if (keyListeners.size === 0) {
        listenersMap.delete(eventName);
      }
    }
  };
}

export function offRegistryChange<K extends RegistryKey>(
  game: Phaser.Game,
  key: K,
  fn: (value: RegistryState[K], previousValue: RegistryState[K]) => void,
  context?: unknown
): void {
  const eventName = `changedata-${String(key)}`;
  const registryCallback = fn as RegistryCallback;
  const keyListeners = listenersMap.get(eventName);
  const contextListeners = keyListeners?.get(registryCallback);
  const handler = contextListeners?.get(context);

  if (!keyListeners || !contextListeners || !handler) {
    return;
  }

  game.registry.events.off(eventName, handler, context);
  contextListeners.delete(context);
  if (contextListeners.size === 0) {
    keyListeners.delete(registryCallback);
  }
  if (keyListeners.size === 0) {
    listenersMap.delete(eventName);
  }
}
