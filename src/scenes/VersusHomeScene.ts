import Phaser from 'phaser';
import { getRegistryValue, setRegistryValue } from '../game/state';
import type { MatchSnapshot } from '../game/types';
import { canSendChallengeToday, challengesRemainingToday } from '../game/versusRateLimit';
import * as versusPoller from '../game/versusPoller';
import Button from '../ui/Button';
import { fitText, UI } from '../ui/theme';
import { addDomInput, drawSceneBackground } from './helpers';

interface VersusRankRow {
  name: string;
  wins: number;
  losses: number;
  ties: number;
  total: number;
  rank: number;
}

export default class VersusHomeScene extends Phaser.Scene {
  private matches: MatchSnapshot[] = [];
  private records: VersusRankRow[] = [];
  private status: 'loading' | 'ready' | 'error' = 'loading';
  private opponentInput: HTMLInputElement | null = null;
  private opponentSelect: HTMLSelectElement | null = null;

  constructor() {
    super('VersusHomeScene');
  }

  async create(): Promise<void> {
    versusPoller.stop();
    this.render();
    const redirected = await this.loadMatches();
    if (redirected) return;
    const settings = getRegistryValue(this.game, 'settings');
    if (!settings?.hideVersusHowToPlay) {
      this.scene.launch('OverlayScene', { kind: 'versusHowTo' });
    }
  }

  private async loadMatches(): Promise<boolean> {
    const username = getRegistryValue(this.game, 'username');
    if (!username) {
      this.scene.start('UsernameScene');
      return true;
    }
    try {
      this.status = 'loading';
      const [matches, records] = await Promise.all([
        versusPoller.fetchMatchesForPlayer(username),
        this.fetchRankedRecords(username)
      ]);
      this.matches = matches;
      this.records = records;
      this.status = 'ready';
    } catch {
      this.matches = [];
      this.records = [];
      this.status = 'error';
    }
    this.render();
    return false;
  }

  private render(): void {
    this.children.removeAll(true);
    this.opponentInput?.remove();
    this.opponentInput = null;
    this.opponentSelect?.remove();
    this.opponentSelect = null;
    drawSceneBackground(this);
    const { width, height } = this.scale;
    const username = getRegistryValue(this.game, 'username');
    this.add.text(width / 2, 58, '1V1 TOSS-OFF', {
      fontFamily: UI.titleFont,
      fontSize: `${Math.max(34, Math.min(60, width * 0.095))}px`,
      color: UI.colors.accent
    }).setOrigin(0.5);

    new Button(this, 58, 112, { label: '?', width: 44, height: 42, onClick: () => this.scene.launch('OverlayScene', { kind: 'versusHowTo' }) });
    new Button(this, width - 92, 112, { label: 'History', width: 142, height: 42, fontSize: 15, onClick: () => this.scene.start('VersusHistoryScene') });

    if (this.status === 'loading') {
      this.addStatus('Loading...');
    } else if (this.status === 'error') {
      this.addStatus('Offline');
    } else {
      const yourTurn = this.matches.filter((m) => !versusPoller.hasMyScore(m, username) && m.status !== 'complete');
      const awaiting = this.matches.filter((m) => versusPoller.hasMyScore(m, username) && !versusPoller.hasOpponentScore(m, username) && m.status !== 'complete');
      let y = 154;
      y = this.addSection('Your turn', yourTurn, y);
      y = this.addSection('Awaiting opponent', awaiting, y);
      this.addRecordSection(y);
    }

    const buttonW = Math.min(320, width - 44);
    new Button(this, width / 2, height - 102, {
      label: canSendChallengeToday() ? `New challenge (${challengesRemainingToday()} left)` : 'Daily limit reached',
      width: buttonW,
      variant: 'primary',
      fontSize: 17,
      onClick: () => void this.openChallengeInput()
    });
    new Button(this, width / 2, height - 44, { label: 'Home', width: buttonW, onClick: () => this.scene.start('HomeScene') });
  }

  private addStatus(label: string): void {
    this.add.text(this.scale.width / 2, this.scale.height / 2, label, {
      fontFamily: UI.font,
      fontSize: '20px',
      color: UI.colors.textMute
    }).setOrigin(0.5);
  }

  private addSection(title: string, rows: MatchSnapshot[], y: number): number {
    const { width } = this.scale;
    const rowH = 56;
    this.add.text(24, y, title, {
      fontFamily: UI.font,
      fontSize: '16px',
      fontStyle: '700',
      color: UI.colors.textMute
    });
    y += 26;
    if (rows.length === 0) {
      this.add.text(24, y + 8, 'None', {
        fontFamily: UI.font,
        fontSize: '15px',
        color: UI.colors.textFaint
      });
      return y + 46;
    }
    for (const match of rows.slice(0, 3)) {
      this.addMatchRow(match, 22, y, width - 44, rowH);
      y += rowH + 8;
    }
    return y + 12;
  }

  private addRecordSection(y: number): void {
    this.add.text(24, y, 'Player records', {
      fontFamily: UI.font,
      fontSize: '16px',
      fontStyle: '700',
      color: UI.colors.textMute
    });
    y += 26;
    if (this.records.length === 0) {
      this.add.text(24, y + 8, 'None', {
        fontFamily: UI.font,
        fontSize: '15px',
        color: UI.colors.textFaint
      });
      return;
    }
    const username = getRegistryValue(this.game, 'username');
    for (const row of this.visibleRecordRows(username)) {
      const isMe = versusPoller.isSameName(row.name, username);
      this.add.text(24, y, `#${row.rank} ${fitText(row.name, 14)}`, {
        fontFamily: UI.font,
        fontSize: '15px',
        fontStyle: isMe ? '700' : '400',
        color: isMe ? UI.colors.accent : UI.colors.text
      });
      this.add.text(this.scale.width - 24, y, `${row.wins}-${row.losses}-${row.ties}`, {
        fontFamily: UI.font,
        fontSize: '15px',
        fontStyle: isMe ? '700' : '400',
        color: isMe ? UI.colors.accent : UI.colors.textMute
      }).setOrigin(1, 0);
      y += 24;
    }
  }

  private visibleRecordRows(username: string | null | undefined): VersusRankRow[] {
    const rows = this.records.slice(0, 4);
    const mine = this.records.find((row) => versusPoller.isSameName(row.name, username));
    if (mine && !rows.includes(mine)) rows.push(mine);
    return rows;
  }

  private addMatchRow(match: MatchSnapshot, x: number, y: number, w: number, h: number): void {
    const username = getRegistryValue(this.game, 'username');
    const opponent = versusPoller.getOpponentName(match, username);
    const role = versusPoller.getMatchRole(match, username);
    const myScore = role === 'challenger' ? match.challengerScore : match.recipientScore;
    const theirScore = role === 'challenger' ? match.recipientScore : match.challengerScore;
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(UI.colors.surface).color, 1);
    bg.fillRoundedRect(x, y, w, h, UI.radius);
    const hit = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    this.add.text(x + 12, y + 11, fitText(opponent, 20), {
      fontFamily: UI.font,
      fontSize: '18px',
      fontStyle: '700',
      color: UI.colors.text
    });
    const score = myScore != null && theirScore != null ? `${myScore} - ${theirScore}` : myScore != null ? `you: ${myScore}` : 'play';
    this.add.text(x + w - 12, y + 17, score, {
      fontFamily: UI.font,
      fontSize: '16px',
      color: UI.colors.accent
    }).setOrigin(1, 0);
    hit.on('pointerdown', () => this.openMatch(match));
  }

  private openMatch(match: MatchSnapshot): void {
    const username = getRegistryValue(this.game, 'username');
    const role = versusPoller.getMatchRole(match, username);
    setRegistryValue(this.game, 'activeMatch', match);
    if (match.status === 'complete') {
      this.scene.start('VersusResultScene', { match });
      return;
    }
    if (versusPoller.isExpired(match)) {
      this.addStatus('Expired');
      return;
    }
    if (versusPoller.hasMyScore(match, username)) {
      this.scene.start('VersusWaitingScene', { match });
      return;
    }
    if (role === 'recipient' || role === 'challenger') {
      this.scene.start('CharacterSelectScene', {
        next: 'VersusGameScene',
        init: { matchId: match.matchId, role, levelId: match.levelId }
      });
    }
  }

  private async openChallengeInput(): Promise<void> {
    if (!canSendChallengeToday()) {
      this.addStatus('Daily limit reached, try again tomorrow.');
      return;
    }
    const username = getRegistryValue(this.game, 'username');
    let players: string[] = [];
    try {
      players = (await window.globalScores.fetchKnownPlayers()).filter((name) => !versusPoller.isSameName(name, username));
    } catch (error) {
      console.error('Failed to load challenge players', error);
    }
    this.render();
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.65).setOrigin(0).setInteractive();
    this.add.text(this.scale.width / 2, this.scale.height / 2 - 132, 'Opponent username', {
      fontFamily: UI.font,
      fontSize: '20px',
      color: UI.colors.text
    }).setOrigin(0.5);
    this.opponentSelect = this.addOpponentSelect(this.scale.width / 2, this.scale.height / 2 - 78, Math.min(320, this.scale.width - 64), players);
    this.opponentInput = addDomInput(this, this.scale.width / 2, this.scale.height / 2 - 18, Math.min(320, this.scale.width - 64), '', 'username');
    this.opponentInput.focus();
    new Button(this, this.scale.width / 2, this.scale.height / 2 + 62, {
      label: 'Continue',
      width: Math.min(260, this.scale.width - 80),
      variant: 'primary',
      onClick: () => this.continueChallenge()
    });
    new Button(this, this.scale.width / 2, this.scale.height / 2 + 122, {
      label: 'Cancel',
      width: Math.min(260, this.scale.width - 80),
      onClick: () => this.render()
    });
  }

  private continueChallenge(): void {
    const opponentName = String(this.opponentInput?.value || this.opponentSelect?.value || '').trim().slice(0, 20);
    const username = getRegistryValue(this.game, 'username');
    if (!opponentName || versusPoller.isSameName(opponentName, username)) {
      this.addStatus('Pick someone other than yourself.');
      return;
    }
    this.opponentInput?.remove();
    this.scene.start('CharacterSelectScene', {
      next: 'LevelSelectScene',
      init: { next: 'VersusGameScene', role: 'challenger', opponentName }
    });
  }

  private addOpponentSelect(x: number, y: number, width: number, players: string[]): HTMLSelectElement {
    const select = document.createElement('select');
    select.style.position = 'fixed';
    select.style.left = `${Math.round(x - width / 2)}px`;
    select.style.top = `${Math.round(y - 24)}px`;
    select.style.width = `${Math.round(width)}px`;
    select.style.boxSizing = 'border-box';
    select.style.padding = '12px 14px';
    select.style.border = `2px solid ${UI.colors.secondary}`;
    select.style.borderRadius = '6px';
    select.style.background = UI.colors.surface2;
    select.style.color = UI.colors.text;
    select.style.font = `700 18px ${UI.font}`;
    select.style.zIndex = '20';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = players.length ? 'Select player' : 'No players found';
    select.appendChild(placeholder);
    for (const player of players) {
      const option = document.createElement('option');
      option.value = player;
      option.textContent = player;
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      if (this.opponentInput && select.value) this.opponentInput.value = '';
    });

    document.body.appendChild(select);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => select.remove());
    return select;
  }

  private async fetchRankedRecords(username: string): Promise<VersusRankRow[]> {
    const records = await window.globalScores.fetchVersusLeaderboard();
    if (!records.some((row) => versusPoller.isSameName(row.name, username))) {
      records.push({ name: username, wins: 0, losses: 0, ties: 0, total: 0 });
    }
    return records
      .sort((a, b) => {
        const aDiff = a.wins - a.losses;
        const bDiff = b.wins - b.losses;
        if (bDiff !== aDiff) return bDiff - aDiff;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.total !== a.total) return b.total - a.total;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      })
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }
}
