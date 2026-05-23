import Phaser from 'phaser';
import { globalScores } from '../globalScores';
import type { LeaderboardRow } from '../game/types';
import Button from '../ui/Button';
import List from '../ui/List';
import { fitText, formatDate, UI } from '../ui/theme';
import { addTitle, drawSceneBackground } from './helpers';

export default class LeaderboardScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super('LeaderboardScene');
  }

  create(): void {
    drawSceneBackground(this);
    addTitle(this, 'Leaderboard', 58);
    new Button(this, this.scale.width / 2, this.scale.height - 38, {
      label: 'Home',
      width: Math.min(240, this.scale.width - 52),
      height: 46,
      onClick: () => this.scene.start('HomeScene')
    });
    this.statusText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Loading...', {
        fontFamily: UI.font,
        fontSize: '22px',
        color: UI.colors.textMute
      })
      .setOrigin(0.5);
    void this.loadRows();
  }

  private async loadRows(): Promise<void> {
    try {
      const rows = await globalScores.topN(100);
      if (rows.length === 0) {
        this.showMessage('No scores yet');
        return;
      }
      this.statusText?.destroy();
      this.renderList(rows);
    } catch {
      this.showMessage('Could not load leaderboard');
    }
  }

  private renderList(rows: readonly LeaderboardRow[]): void {
    const list = new List<LeaderboardRow>(this, 24, 116, {
      width: this.scale.width - 48,
      height: this.scale.height - 206,
      rowHeight: 54,
      renderRow: (row, data, index) => {
        row.add(this.add.rectangle(0, 0, this.scale.width - 48, 50, index % 2 ? 0x171b15 : 0x2c3328, 0.82).setOrigin(0));
        row.add(this.add.text(10, 25, `${index + 1}.`, { fontFamily: UI.font, fontSize: '18px', color: UI.colors.textMute }).setOrigin(0, 0.5));
        row.add(this.add.text(58, 25, fitText(data.name, 15), { fontFamily: UI.font, fontSize: '18px', color: UI.colors.text }).setOrigin(0, 0.5));
        row.add(this.add.text(this.scale.width * 0.46, 25, fitText(data.character_name || 'Unknown', 12), { fontFamily: UI.font, fontSize: '15px', color: UI.colors.textMute }).setOrigin(0, 0.5));
        row.add(this.add.text(this.scale.width - 142, 25, formatDate(data.created_at), { fontFamily: UI.font, fontSize: '14px', color: UI.colors.textMute }).setOrigin(1, 0.5));
        row.add(this.add.text(this.scale.width - 70, 25, String(data.score), { fontFamily: UI.font, fontSize: '20px', fontStyle: '700', color: UI.colors.accent }).setOrigin(1, 0.5));
      }
    });
    list.setItems(rows);
  }

  private showMessage(message: string): void {
    this.statusText?.setText(message);
  }
}
