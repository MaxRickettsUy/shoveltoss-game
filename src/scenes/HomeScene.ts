import Phaser from 'phaser';
import Button from '../ui/Button';
import { UI } from '../ui/theme';
import { addTitle, addVersion, drawSceneBackground } from './helpers';

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create(): void {
    const { width, height } = this.scale;

    drawSceneBackground(this);
    addTitle(this, 'SHOVEL\nTOSS', Math.max(72, height * 0.13)).setLineSpacing(-12);

    const compact = height < 620;
    const buttonW = Math.min(320, width - 52);
    const buttonH = compact ? 44 : 54;
    const ghostH = compact ? 40 : 46;
    const earliestStartY = Math.max(height * 0.33, height * 0.3);
    const lastRowY = height - (compact ? 70 : 74);
    const gap = Phaser.Math.Clamp(
      (lastRowY - earliestStartY) / 5,
      buttonH + (compact ? 8 : 10),
      buttonH + (compact ? 12 : 16)
    );
    const topSafeMargin = Math.max(height * 0.26, compact ? 182 : 210);
    const startY = Math.max(Math.min(earliestStartY, lastRowY - gap * 5), topSafeMargin);
    new Button(this, width / 2, startY, {
      label: 'Play',
      variant: 'primary',
      width: buttonW,
      height: buttonH,
      onClick: () => this.scene.start('CharacterSelectScene', { next: 'LevelSelectScene' })
    });
    new Button(this, width / 2, startY + gap, {
      label: '1v1 Toss-Off',
      width: buttonW,
      height: buttonH,
      onClick: () => this.scene.start('VersusHomeScene')
    });
    new Button(this, width / 2, startY + gap * 2, { label: 'Leaderboard', width: buttonW, height: buttonH, onClick: () => this.scene.start('LeaderboardScene') });
    new Button(this, width / 2, startY + gap * 3, { label: 'Hall of Fame', width: buttonW, height: buttonH, onClick: () => this.scene.start('HallOfFameScene') });
    new Button(this, width / 2, startY + gap * 4, { label: 'Player Stats', width: buttonW, height: buttonH, onClick: () => this.scene.start('PlayerStatsScene') });
    new Button(this, width / 2 - buttonW / 4 - 6, startY + gap * 5, {
      label: 'Settings',
      variant: 'ghost',
      width: buttonW / 2 - 8,
      height: ghostH,
      fontSize: compact ? 14 : 16,
      onClick: () => this.scene.launch('OverlayScene', { kind: 'settings' })
    });
    new Button(this, width / 2 + buttonW / 4 + 6, startY + gap * 5, {
      label: "What's New",
      variant: 'ghost',
      width: buttonW / 2 - 8,
      height: ghostH,
      fontSize: compact ? 14 : 16,
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
