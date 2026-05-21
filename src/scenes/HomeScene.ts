import Phaser from 'phaser';
import { APP_VERSION_TAG, THEME } from '../game/constants';

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x22281f).setOrigin(0);
    this.add
      .text(width / 2, height / 2 - 62, 'SHOVEL\nTOSS', {
        fontFamily: 'Bungee, Impact, sans-serif',
        fontSize: '76px',
        color: THEME.accent,
        align: 'center',
        lineSpacing: -12
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 72, 'Phaser bootstrap ready', {
        fontFamily: 'Archivo, system-ui, sans-serif',
        fontSize: '24px',
        color: THEME.text
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 36, APP_VERSION_TAG, {
        fontFamily: 'Archivo, system-ui, sans-serif',
        fontSize: '16px',
        color: THEME.textMute
      })
      .setOrigin(0.5);
  }
}
