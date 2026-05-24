import Phaser from 'phaser';
import { getRegistryValue } from '../game/state';
import Button from '../ui/Button';
import { UI } from '../ui/theme';
import { addTitle, addVersion, drawSceneBackground } from './helpers';

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create(): void {
    const { width, height } = this.scale;
    const username = getRegistryValue(this.game, 'username') || 'NEW PLAYER';

    drawSceneBackground(this);
    addTitle(this, 'SHOVEL\nTOSS', Math.max(104, height * 0.2)).setLineSpacing(-12);

    const nameButton = this.add
      .text(width / 2, height * 0.34, username, {
        fontFamily: UI.font,
        fontSize: '18px',
        fontStyle: '700',
        color: UI.colors.text,
        backgroundColor: UI.colors.surface,
        padding: { x: 18, y: 9 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    nameButton.on('pointerdown', () => this.scene.start('UsernameScene'));

    const buttonW = Math.min(320, width - 52);
    const startY = Math.max(height * 0.45, 300);
    const gap = 58;
    new Button(this, width / 2, startY, {
      label: 'Play',
      variant: 'primary',
      width: buttonW,
      onClick: () => this.scene.start('CharacterSelectScene', { next: 'LevelSelectScene' })
    });
    new Button(this, width / 2, startY + gap, {
      label: '1v1 Toss-Off',
      width: buttonW,
      onClick: () => this.scene.start('VersusHomeScene')
    });
    new Button(this, width / 2, startY + gap * 2, { label: 'Leaderboard', width: buttonW, onClick: () => this.scene.start('LeaderboardScene') });
    new Button(this, width / 2, startY + gap * 3, { label: 'Hall of Fame', width: buttonW, onClick: () => this.scene.start('HallOfFameScene') });
    new Button(this, width / 2, startY + gap * 4, { label: 'Player Stats', width: buttonW, onClick: () => this.scene.start('PlayerStatsScene') });
    new Button(this, width / 2 - buttonW / 4 - 6, startY + gap * 5, {
      label: 'Settings',
      variant: 'ghost',
      width: buttonW / 2 - 8,
      height: 46,
      fontSize: 16,
      onClick: () => this.scene.launch('OverlayScene', { kind: 'settings' })
    });
    new Button(this, width / 2 + buttonW / 4 + 6, startY + gap * 5, {
      label: "What's New",
      variant: 'ghost',
      width: buttonW / 2 - 8,
      height: 46,
      fontSize: 16,
      onClick: () => this.scene.launch('OverlayScene', { kind: 'whatsNew' })
    });
    addVersion(this);
  }

  private showToast(message: string): void {
    const text = this.add
      .text(this.scale.width / 2, this.scale.height - 86, message, {
        fontFamily: UI.font,
        fontSize: '18px',
        color: UI.colors.text,
        backgroundColor: UI.colors.surface,
        padding: { x: 16, y: 10 }
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: text, alpha: 0, delay: 950, duration: 300, onComplete: () => text.destroy() });
  }
}
