import Phaser from 'phaser';
import { getRegistryValue, setRegistryValue } from '../game/state';
import type { MatchSnapshot } from '../game/types';
import { fetchHistoryForPlayer, getMatchRole, getOpponentName } from '../game/versusPoller';
import Button from '../ui/Button';
import { fitText, formatDate, UI } from '../ui/theme';
import { drawSceneBackground } from './helpers';

export default class VersusHistoryScene extends Phaser.Scene {
  private rows: MatchSnapshot[] = [];
  private status: 'loading' | 'ready' | 'error' = 'loading';

  constructor() {
    super('VersusHistoryScene');
  }

  create(): void {
    this.render();
    void this.loadRows();
  }

  private async loadRows(): Promise<void> {
    const username = getRegistryValue(this.game, 'username');
    if (!username) {
      this.rows = [];
      this.status = 'error';
      this.render();
      return;
    }
    try {
      this.rows = await fetchHistoryForPlayer(username);
      this.status = 'ready';
    } catch {
      this.rows = [];
      this.status = 'error';
    }
    this.render();
  }

  private render(): void {
    this.children.removeAll(true);
    drawSceneBackground(this);
    const { width, height } = this.scale;
    this.add.text(width / 2, 62, 'HISTORY', {
      fontFamily: UI.titleFont,
      fontSize: `${Math.max(38, Math.min(62, width * 0.1))}px`,
      color: UI.colors.accent
    }).setOrigin(0.5);
    if (this.status === 'loading') this.addStatus('Loading...');
    else if (this.status === 'error') this.addStatus('Offline');
    else if (this.rows.length === 0) this.addStatus('No completed matches yet');
    else this.addRows();
    new Button(this, width / 2, height - 44, {
      label: 'Back',
      width: Math.min(320, width - 44),
      onClick: () => this.scene.start('VersusHomeScene')
    });
  }

  private addRows(): void {
    const username = getRegistryValue(this.game, 'username');
    const w = this.scale.width - 44;
    let y = 126;
    for (const match of this.rows.slice(0, 8)) {
      const role = getMatchRole(match, username);
      const myScore = role === 'challenger' ? match.challengerScore : match.recipientScore;
      const theirScore = role === 'challenger' ? match.recipientScore : match.challengerScore;
      const result = myScore === theirScore ? 'TIE' : Number(myScore) > Number(theirScore) ? 'WIN' : 'LOSS';
      const bg = this.add.graphics();
      bg.fillStyle(Phaser.Display.Color.HexStringToColor(UI.colors.surface).color, 1);
      bg.fillRoundedRect(22, y, w, 64, UI.radius);
      const opponent = getOpponentName(match, username);
      this.add.text(34, y + 10, fitText(opponent, 20), {
        fontFamily: UI.font,
        fontSize: '18px',
        fontStyle: '700',
        color: UI.colors.text
      });
      this.add.text(34, y + 37, formatDate(match.createdAt || match.expiresAt), {
        fontFamily: UI.font,
        fontSize: '13px',
        color: UI.colors.textFaint
      });
      this.add.text(this.scale.width - 34, y + 10, result, {
        fontFamily: UI.font,
        fontSize: '14px',
        fontStyle: '700',
        color: result === 'LOSS' ? '#ff8888' : UI.colors.accent
      }).setOrigin(1, 0);
      this.add.text(this.scale.width - 34, y + 34, `${myScore ?? '-'} - ${theirScore ?? '-'}`, {
        fontFamily: UI.font,
        fontSize: '18px',
        color: UI.colors.text
      }).setOrigin(1, 0);
      this.add.zone(22, y, w, 64).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        setRegistryValue(this.game, 'activeMatch', match);
        this.scene.start('VersusResultScene', { match });
      });
      y += 72;
    }
  }

  private addStatus(label: string): void {
    this.add.text(this.scale.width / 2, this.scale.height / 2, label, {
      fontFamily: UI.font,
      fontSize: '20px',
      color: UI.colors.textMute
    }).setOrigin(0.5);
  }
}
