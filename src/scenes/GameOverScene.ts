import Phaser from 'phaser';
import { CHARACTERS } from '../game/characters';
import { LEVELS } from '../game/levels';
import { globalScores } from '../globalScores';
import { getRegistryValue } from '../game/state';
import type { GameOverSceneData, GameSceneData } from '../game/types';
import Button from '../ui/Button';
import { UI } from '../ui/theme';

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

  async create(): Promise<void> {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    this.add
      .text(width / 2, height / 2 - 104, 'Game Over', {
        fontFamily: UI.titleFont,
        fontSize: '72px',
        color: UI.colors.accent
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 - 26, `Final score: ${this.finalScore}`, {
        fontFamily: UI.font,
        fontSize: '32px',
        color: UI.colors.text
      })
      .setOrigin(0.5);
    const status = this.add
      .text(width / 2, height / 2 + 20, 'Submitting...', {
        fontFamily: UI.font,
        fontSize: '18px',
        color: UI.colors.textMute
      })
      .setOrigin(0.5);

    void this.submitScore(status);

    new Button(this, width / 2, height / 2 + 78, {
      label: 'Play again',
      variant: 'primary',
      width: 240,
      onClick: () => {
      this.scene.start('GameScene', {
        characterId: this.characterId,
        levelId: this.levelId,
        mode: 'solo'
      } satisfies GameSceneData);
    }});
    new Button(this, width / 2, height / 2 + 140, { label: 'View leaderboard', width: 240, onClick: () => this.scene.start('LeaderboardScene') });
    new Button(this, width / 2, height / 2 + 202, { label: 'Home', width: 240, onClick: () => this.scene.start('HomeScene') });
  }

  private async submitScore(status: Phaser.GameObjects.Text): Promise<void> {
    const username = getRegistryValue(this.game, 'username');
    if (!username || this.finalScore <= 0) {
      status.setText(this.finalScore <= 0 ? 'Score not saved' : 'No username saved');
      return;
    }
    try {
      await globalScores.submit(username, this.finalScore, this.characterId);
      const rows = await globalScores.topN(100);
      const rank = rows.findIndex((row) => row.name === username && row.score === this.finalScore && row.character_name === this.characterId) + 1;
      status.setText(rank > 0 ? `Global rank: #${rank}` : 'Score saved');
    } catch (err) {
      const code = (err as { code?: string }).code;
      status.setText(code === 'disabled-non-prod' ? 'Score not saved (local dev)' : 'Could not submit score');
    }
  }
}
