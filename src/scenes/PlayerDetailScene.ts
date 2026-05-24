import Phaser from 'phaser';
import { globalScores } from '../globalScores';
import type { LeaderboardRow } from '../game/types';
import Button from '../ui/Button';
import List from '../ui/List';
import { fitText, formatDate, UI } from '../ui/theme';
import { addTitle, drawSceneBackground } from './helpers';

interface PlayerDetailData {
  playerName: string;
}

export default class PlayerDetailScene extends Phaser.Scene {
  private playerName = '';
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super('PlayerDetailScene');
  }

  init(data: PlayerDetailData): void {
    this.playerName = data.playerName;
  }

  create(): void {
    drawSceneBackground(this);
    addTitle(this, fitText(this.playerName, 18), 58);
    new Button(this, this.scale.width / 2, this.scale.height - 38, {
      label: 'Home',
      width: Math.min(240, this.scale.width - 52),
      height: 46,
      onClick: () => this.scene.start('HomeScene')
    });
    this.statusText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Loading...', {
      fontFamily: UI.font,
      fontSize: '22px',
      color: UI.colors.textMute
    }).setOrigin(0.5);
    void this.loadRows();
  }

  private async loadRows(): Promise<void> {
    try {
      const rows = await globalScores.playerScores(this.playerName, 100);
      const total = rows.reduce((sum, row) => sum + (Number(row.score) || 0), 0);
      const best = rows.reduce((max, row) => Math.max(max, Number(row.score) || 0), 0);
      this.add.text(this.scale.width / 2, 112, `${rows.length} games   ${total} total   best ${best}`, {
        fontFamily: UI.font,
        fontSize: '16px',
        color: UI.colors.textMute
      }).setOrigin(0.5);
      this.renderList(rows);
    } catch {
      this.statusText?.setText('Could not load player');
    }
  }

  private renderList(rows: readonly LeaderboardRow[]): void {
    if (rows.length === 0) {
      this.statusText?.setText('No scores yet');
      return;
    }
    this.statusText?.destroy();
    const listW = this.scale.width - 48;
    const list = new List<LeaderboardRow>(this, 24, 150, {
      width: listW,
      height: this.scale.height - 238,
      rowHeight: 60,
      renderRow: (row, data, index) => {
        row.add(this.add.rectangle(0, 0, listW, 56, index % 2 ? 0x171b15 : 0x2c3328, 0.82).setOrigin(0));
        row.add(this.add.text(12, 20, fitText(data.character_name || 'Unknown', this.scale.width < 440 ? 14 : 20), { fontFamily: UI.font, fontSize: '16px', color: UI.colors.text }).setOrigin(0, 0.5));
        row.add(this.add.text(listW - 16, 20, String(data.score), { fontFamily: UI.font, fontSize: '20px', fontStyle: '700', color: UI.colors.accent }).setOrigin(1, 0.5));
        row.add(this.add.text(12, 42, formatDate(data.created_at), { fontFamily: UI.font, fontSize: '14px', color: UI.colors.textMute }).setOrigin(0, 0.5));
      }
    });
    list.setItems(rows);
  }
}
