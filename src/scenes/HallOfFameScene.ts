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

interface FameMilestone {
  label: string;
  threshold: number;
}

const SCORE_MILESTONES: FameMilestone[] = [
  { label: 'First to 10 Points', threshold: 10 },
  { label: 'First to 20 Points', threshold: 20 },
  { label: 'First to 30 Points', threshold: 30 },
  { label: 'First to 50 Points', threshold: 50 },
  { label: 'First to 69 Points', threshold: 69 },
  { label: 'First to 75 Points', threshold: 75 },
  { label: 'First to 100 Points', threshold: 100 },
  { label: 'First to 150 Points', threshold: 150 },
  { label: 'First to 200 Points', threshold: 200 },
  { label: 'First to 420 Points', threshold: 420 },
  { label: 'First to 666 Points', threshold: 666 }
];

const TOTAL_POINT_MILESTONES: FameMilestone[] = [
  { label: 'First to 100 Total Points', threshold: 100 },
  { label: 'First to 500 Total Points', threshold: 500 },
  { label: 'First to 1k Total Points', threshold: 1000 },
  { label: 'First to 5k Total Points', threshold: 5000 },
  { label: 'First to 10k Total Points', threshold: 10000 }
];

const GAME_MILESTONES: FameMilestone[] = [
  { label: 'First to 10 Games', threshold: 10 },
  { label: 'First to 20 Games', threshold: 20 },
  { label: 'First to 30 Games', threshold: 30 },
  { label: 'First to 50 Games', threshold: 50 },
  { label: 'First to 69 Games', threshold: 69 },
  { label: 'First to 75 Games', threshold: 75 },
  { label: 'First to 100 Games', threshold: 100 },
  { label: 'First to 150 Games', threshold: 150 },
  { label: 'First to 420 Games', threshold: 420 }
];

export default class HallOfFameScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super('HallOfFameScene');
  }

  create(): void {
    drawSceneBackground(this);
    addTitle(this, 'Hall of Fame', 58).setDepth(50);
    new Button(this, this.scale.width / 2, this.scale.height - 38, {
      label: 'Home',
      width: Math.min(240, this.scale.width - 52),
      height: 46,
      onClick: () => this.scene.start('HomeScene')
    }).setDepth(50);
    this.statusText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Loading...', {
      fontFamily: UI.font,
      fontSize: '22px',
      color: UI.colors.textMute
    }).setOrigin(0.5);
    void this.loadRows();
  }

  private async loadRows(): Promise<void> {
    try {
      const [totalLeader, gameLeader, totalPointRows, gameRows, scoreRows] = await Promise.all([
        globalScores.mostTotalPointsLeader(),
        globalScores.mostGamesLeader(),
        globalScores.firstAtTotalPoints(TOTAL_POINT_MILESTONES.map((milestone) => milestone.threshold)),
        globalScores.firstAtGameCounts(GAME_MILESTONES.map((milestone) => milestone.threshold)),
        Promise.all(SCORE_MILESTONES.map((milestone) => globalScores.firstAtMilestone(milestone.threshold)))
      ]);
      const rows: FameRow[] = [
        { milestone: 'Most Total Points All Time', row: totalLeader as LeaderboardRow | null },
        { milestone: 'Most Games All Time', row: gameLeader as LeaderboardRow | null },
        ...SCORE_MILESTONES.map((milestone, index) => ({
          milestone: milestone.label,
          row: scoreRows[index]
        })),
        ...TOTAL_POINT_MILESTONES.map((milestone) => ({
          milestone: milestone.label,
          row: totalPointRows.get(milestone.threshold) ?? null
        })),
        ...GAME_MILESTONES.map((milestone) => ({
          milestone: milestone.label,
          row: gameRows.get(milestone.threshold) ?? null
        }))
      ];
      this.statusText?.destroy();
      this.renderList(rows);
    } catch {
      this.statusText?.setText('Could not load Hall of Fame');
    }
  }

  private renderList(rows: readonly FameRow[]): void {
    const listY = 116;
    const homeButtonTop = this.scale.height - 38 - 46 / 2;
    const listW = this.scale.width - 48;
    const listH = Math.max(120, homeButtonTop - listY - 16);
    const list = new List<FameRow>(this, 24, listY, {
      width: listW,
      height: listH,
      rowHeight: 66,
      renderRow: (row, data, index) => {
        row.add(this.add.rectangle(0, 0, listW, 62, index % 2 ? 0x171b15 : 0x2c3328, 0.82).setOrigin(0));
        row.add(this.add.text(12, 20, data.milestone, { fontFamily: UI.font, fontSize: '17px', fontStyle: '700', color: UI.colors.text }).setOrigin(0, 0.5));
        const detail = data.row ? `${fitText(data.row.name, 16)} - ${data.row.score}` : 'No one yet';
        row.add(this.add.text(12, 44, detail, { fontFamily: UI.font, fontSize: '15px', color: data.row ? UI.colors.accent : UI.colors.textMute }).setOrigin(0, 0.5));
      }
    });
    list.setItems(rows);
    this.add.rectangle(0, 0, this.scale.width, listY, Phaser.Display.Color.HexStringToColor(UI.colors.bgTop).color).setOrigin(0).setDepth(40);
    this.add.rectangle(0, listY + listH, this.scale.width, this.scale.height - listY - listH, Phaser.Display.Color.HexStringToColor(UI.colors.bgTop).color).setOrigin(0).setDepth(40);
  }
}
