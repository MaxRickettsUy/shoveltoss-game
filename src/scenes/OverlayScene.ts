import Phaser from 'phaser';
import '../releaseNotes';
import { DEFAULT_SETTINGS } from '../game/constants';
import { getRegistryValue, setRegistryValue } from '../game/state';
import { setStoredSettings, updateStoredSetting } from '../game/storage';
import type { OverlayKind, Settings } from '../game/types';
import Button from '../ui/Button';
import { UI } from '../ui/theme';

interface OverlayData {
  kind: OverlayKind;
}

export default class OverlayScene extends Phaser.Scene {
  private kind: OverlayKind = 'whatsNew';
  private meterButtons: Button[] = [];

  constructor() {
    super('OverlayScene');
  }

  init(data: OverlayData): void {
    this.kind = data.kind;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.64).setOrigin(0).setInteractive();
    const panelW = Math.min(520, width - 36);
    const panelH = Math.min(620, height - 70);
    const panel = this.add.container(width / 2, height / 2);
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(UI.colors.bgTop).color, 1);
    bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, UI.radius);
    bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(UI.colors.secondary).color, 1);
    bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, UI.radius);
    panel.add(bg);

    if (this.kind === 'settings') this.renderSettings(panel, panelW, panelH);
    else this.renderWhatsNew(panel, panelW, panelH);

    new Button(this, width / 2, height / 2 + panelH / 2 - 38, {
      label: 'Close',
      width: Math.min(220, panelW - 48),
      height: 44,
      onClick: () => this.scene.stop()
    });
  }

  private renderWhatsNew(panel: Phaser.GameObjects.Container, panelW: number, panelH: number): void {
    panel.add(this.add.text(0, -panelH / 2 + 42, "What's New", {
      fontFamily: UI.titleFont,
      fontSize: '30px',
      color: UI.colors.accent
    }).setOrigin(0.5));
    const notes = window.releaseNotes?.getLatestNotes(3) ?? [];
    let y = -panelH / 2 + 92;
    for (const note of notes) {
      panel.add(this.add.text(-panelW / 2 + 24, y, `${note.version} - ${note.headline}`, {
        fontFamily: UI.font,
        fontSize: '17px',
        fontStyle: '700',
        color: UI.colors.text
      }).setOrigin(0, 0));
      y += 28;
      for (const item of note.items.slice(0, 3)) {
        panel.add(this.add.text(-panelW / 2 + 34, y, `- ${item}`, {
          fontFamily: UI.font,
          fontSize: '14px',
          color: UI.colors.textMute,
          wordWrap: { width: panelW - 68 }
        }).setOrigin(0, 0));
        y += 38;
      }
      y += 12;
    }
  }

  private renderSettings(panel: Phaser.GameObjects.Container, panelW: number, panelH: number): void {
    panel.add(this.add.text(0, -panelH / 2 + 42, 'Settings', {
      fontFamily: UI.titleFont,
      fontSize: '30px',
      color: UI.colors.accent
    }).setOrigin(0.5));

    const settings = { ...DEFAULT_SETTINGS, ...(getRegistryValue(this.game, 'settings') || {}) };
    const meterLabel = this.add.text(0, -panelH / 2 + 100, `Meter: ${settings.meterPosition}`, {
      fontFamily: UI.font,
      fontSize: '18px',
      color: UI.colors.text
    }).setOrigin(0.5);
    panel.add(meterLabel);

    const positions: Required<Settings>['meterPosition'][] = ['top', 'middle', 'bottom'];
    const renderMeterButtons = (active: Required<Settings>['meterPosition']) => {
      for (const button of this.meterButtons) button.destroy();
      this.meterButtons = positions.map((pos, index) => new Button(this, this.scale.width / 2 + (index - 1) * 112, this.scale.height / 2 - panelH / 2 + 148, {
          label: pos,
          width: 104,
          height: 42,
          fontSize: 15,
          variant: active === pos ? 'primary' : 'secondary',
          onClick: () => {
            const next = updateStoredSetting('meterPosition', pos);
            setRegistryValue(this.game, 'settings', next);
            meterLabel.setText(`Meter: ${pos}`);
            renderMeterButtons(pos);
          }
        }));
    };
    renderMeterButtons(settings.meterPosition);

    this.addToggle(panel, panelW, -panelH / 2 + 230, 'Hide how to play', settings.hideHowToPlay, 'hideHowToPlay');
    this.addToggle(panel, panelW, -panelH / 2 + 286, 'Hide versus how to play', settings.hideVersusHowToPlay, 'hideVersusHowToPlay');
    setStoredSettings(settings);
  }

  private addToggle(
    panel: Phaser.GameObjects.Container,
    panelW: number,
    y: number,
    label: string,
    initial: boolean,
    key: 'hideHowToPlay' | 'hideVersusHowToPlay'
  ): void {
    let value = initial;
    const text = this.add.text(-panelW / 2 + 28, y, `${value ? '[x]' : '[ ]'} ${label}`, {
      fontFamily: UI.font,
      fontSize: '17px',
      color: UI.colors.text
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
      value = !value;
      const next = updateStoredSetting(key, value);
      setRegistryValue(this.game, 'settings', next);
      text.setText(`${value ? '[x]' : '[ ]'} ${label}`);
    });
    panel.add(text);
  }
}
