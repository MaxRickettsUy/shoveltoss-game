import Phaser from 'phaser';
import { CHARACTERS } from '../game/characters';
import { LEVELS } from '../game/levels';
import { THEME } from '../game/constants';
import type { GameOverSceneData, GameSceneData } from '../game/types';

export default class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  private characterId = CHARACTERS[0].id;
  private levelId = LEVELS[0].id;

  constructor() {
    super('GameOverScene');
  }

  init(data: GameOverSceneData): void {
    this.finalScore = data.score;
    this.characterId = data.characterId;
    this.levelId = data.levelId;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    this.add
      .text(width / 2, height / 2 - 104, 'Game Over', {
        fontFamily: 'Bungee, Impact, sans-serif',
        fontSize: '72px',
        color: THEME.accent
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 26, `Final score: ${this.finalScore}`, {
        fontFamily: 'Archivo, system-ui, sans-serif',
        fontSize: '32px',
        color: THEME.text
      })
      .setOrigin(0.5);

    this.addButton(width / 2, height / 2 + 54, 'Play again', () => {
      this.scene.start('GameScene', {
        characterId: this.characterId,
        levelId: this.levelId,
        mode: 'solo'
      } satisfies GameSceneData);
    });
    this.addButton(width / 2, height / 2 + 126, 'Home', () => this.scene.start('HomeScene'));
  }

  private addButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add
      .text(x, y, label, {
        fontFamily: 'Archivo, system-ui, sans-serif',
        fontSize: '24px',
        fontStyle: '700',
        color: THEME.text,
        backgroundColor: THEME.surface,
        padding: { x: 28, y: 14 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setBackgroundColor(THEME.secondary));
    button.on('pointerout', () => button.setBackgroundColor(THEME.surface));
    button.on('pointerdown', onClick);
  }
}
