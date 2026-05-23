import Phaser from 'phaser';
import { APP_VERSION_TAG } from '../game/constants';
import { UI } from '../ui/theme';

export function drawSceneBackground(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  scene.add.rectangle(0, 0, width, height, Phaser.Display.Color.HexStringToColor(UI.colors.bgTop).color).setOrigin(0);
}

export function addTitle(scene: Phaser.Scene, title: string, y = 74): Phaser.GameObjects.Text {
  return scene.add
    .text(scene.scale.width / 2, y, title, {
      fontFamily: UI.titleFont,
      fontSize: `${Math.max(42, Math.min(72, scene.scale.width * 0.1))}px`,
      color: UI.colors.accent,
      align: 'center'
    })
    .setOrigin(0.5);
}

export function addVersion(scene: Phaser.Scene): void {
  scene.add
    .text(scene.scale.width / 2, scene.scale.height - 28, APP_VERSION_TAG, {
      fontFamily: UI.font,
      fontSize: '14px',
      color: UI.colors.textMute
    })
    .setOrigin(0.5);
}

export function addDomInput(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  value: string,
  placeholder: string
): HTMLInputElement {
  const input = document.createElement('input');
  input.value = value;
  input.placeholder = placeholder;
  input.maxLength = 20;
  input.autocomplete = 'nickname' as AutoFill;
  input.style.position = 'fixed';
  input.style.left = `${Math.round(x - width / 2)}px`;
  input.style.top = `${Math.round(y - 24)}px`;
  input.style.width = `${Math.round(width)}px`;
  input.style.boxSizing = 'border-box';
  input.style.padding = '12px 14px';
  input.style.border = `2px solid ${UI.colors.secondary}`;
  input.style.borderRadius = '6px';
  input.style.background = UI.colors.surface2;
  input.style.color = UI.colors.text;
  input.style.font = `700 18px ${UI.font}`;
  input.style.zIndex = '20';
  document.body.appendChild(input);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => input.remove());
  return input;
}
