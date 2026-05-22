import Phaser from 'phaser';
import { globalScores } from '../globalScores';
import type { PlayerStat } from '../game/types';
import Button from '../ui/Button';
import List from '../ui/List';
import { fitText, UI } from '../ui/theme';
import { addDomInput, addTitle, drawSceneBackground } from './helpers';

export default class PlayerStatsScene extends Phaser.Scene {
  private allRows: PlayerStat[] = [];
  private inputEl?: HTMLInputElement;
  private statusText?: Phaser.GameObjects.Text;
  private list?: List<PlayerStat>;

  constructor() {
    super('PlayerStatsScene');
  }

  create(): void {
    drawSceneBackground(this);
    addTitle(this, 'Player Stats', 58);
    new Button(this, this.scale.width / 2, this.scale.height - 38, {
      label: 'Home',
      width: Math.min(240, this.scale.width - 52),
      height: 46,
      onClick: () => this.scene.start('HomeScene')
    });
    this.inputEl = addDomInput(this, this.scale.width / 2, 112, Math.min(360, this.scale.width - 56), '', 'Search players');
    this.inputEl.addEventListener('input', () => this.renderFiltered());
    this.statusText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Loading...', {
      fontFamily: UI.font,
      fontSize: '22px',
      color: UI.colors.textMute
    }).setOrigin(0.5);
    void this.loadRows();
  }

  private async loadRows(): Promise<void> {
    try {
      const rows = await globalScores.allScores(5000);
      const stats = new Map<string, PlayerStat>();
      for (const row of rows) {
        const key = row.name.toLowerCase();
        const current = stats.get(key) || { name: row.name, games: 0, totalPoints: 0, bestScore: 0 };
        current.games += 1;
        current.totalPoints += Number(row.score) || 0;
        current.bestScore = Math.max(current.bestScore, Number(row.score) || 0);
        stats.set(key, current);
      }
      this.allRows = Array.from(stats.values()).sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
      this.statusText?.destroy();
      this.renderFiltered();
    } catch {
      this.statusText?.setText('Could not load player stats');
    }
  }

  private renderFiltered(): void {
    const q = (this.inputEl?.value || '').trim().toLowerCase();
    const rows = this.allRows.filter((row) => row.name.toLowerCase().includes(q));
    this.list?.destroy(true);
    this.list = new List<PlayerStat>(this, 24, 154, {
      width: this.scale.width - 48,
      height: this.scale.height - 242,
      rowHeight: 58,
      renderRow: (row, data, index) => {
        row.add(this.add.rectangle(0, 0, this.scale.width - 48, 54, index % 2 ? 0x171b15 : 0x2c3328, 0.82).setOrigin(0));
        row.add(this.add.text(12, 28, fitText(data.name, 18), { fontFamily: UI.font, fontSize: '18px', fontStyle: '700', color: UI.colors.text }).setOrigin(0, 0.5));
        row.add(this.add.text(this.scale.width - 220, 28, `${data.games} games`, { fontFamily: UI.font, fontSize: '14px', color: UI.colors.textMute }).setOrigin(0, 0.5));
        row.add(this.add.text(this.scale.width - 70, 28, String(data.totalPoints), { fontFamily: UI.font, fontSize: '18px', fontStyle: '700', color: UI.colors.accent }).setOrigin(1, 0.5));
        row.setSize(this.scale.width - 48, 54);
        row.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scale.width - 48, 54), Phaser.Geom.Rectangle.Contains);
        row.on('pointerdown', () => this.scene.start('PlayerDetailScene', { playerName: data.name }));
      }
    });
    this.list.setItems(rows);
  }
}
