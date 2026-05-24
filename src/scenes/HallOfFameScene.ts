import Phaser from 'phaser';
import { globalScores } from '../globalScores';
import type { LeaderboardRow } from '../game/types';
import Button from '../ui/Button';
import List from '../ui/List';
import { fitText, UI } from '../ui/theme';
import { addTitle, drawSceneBackground } from './helpers';

interface FameRow {
  milestone: string;
  row: LeaderboardRow | null;
}

const SCORE_MILESTONES = [69, 100, 420, 500, 666, 1000];

export default class HallOfFameScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super('HallOfFameScene');
  }

  create(): void {
    drawSceneBackground(this);
    addTitle(this, 'Hall of Fame', 58);
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
      const rows: FameRow[] = await Promise.all(SCORE_MILESTONES.map(async (score) => ({
        milestone: `First to ${score}`,
        row: await globalScores.firstAtMilestone(score)
      })));
      const totalLeader = await globalScores.mostTotalPointsLeader();
      const gameLeader = await globalScores.mostGamesLeader();
      rows.push({ milestone: 'Most total points', row: totalLeader as LeaderboardRow | null });
      rows.push({ milestone: 'Most games', row: gameLeader as LeaderboardRow | null });
      this.statusText?.destroy();
      this.renderList(rows);
    } catch {
      this.statusText?.setText('Could not load Hall of Fame');
    }
  }

  private renderList(rows: readonly FameRow[]): void {
    const listW = this.scale.width - 48;
    const list = new List<FameRow>(this, 24, 116, {
      width: listW,
      height: this.scale.height - 206,
      rowHeight: 66,
      renderRow: (row, data, index) => {
        row.add(this.add.rectangle(0, 0, listW, 62, index % 2 ? 0x171b15 : 0x2c3328, 0.82).setOrigin(0));
        row.add(this.add.text(12, 20, data.milestone, { fontFamily: UI.font, fontSize: '17px', fontStyle: '700', color: UI.colors.text }).setOrigin(0, 0.5));
        const detail = data.row ? `${fitText(data.row.name, 16)} - ${data.row.score}` : 'No one yet';
        row.add(this.add.text(12, 44, detail, { fontFamily: UI.font, fontSize: '15px', color: data.row ? UI.colors.accent : UI.colors.textMute }).setOrigin(0, 0.5));
      }
    });
    list.setItems(rows);
  }
}
