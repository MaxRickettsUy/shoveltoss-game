import Phaser from 'phaser';
import { globalScores } from '../globalScores';
import { getRegistryValue, setRegistryValue } from '../game/state';
import type { MatchSnapshot } from '../game/types';
import { canSendChallengeToday, recordChallengeSent } from '../game/versusRateLimit';
import { getMatchRole, getOpponentName, normalizeMatch } from '../game/versusPoller';
import Button from '../ui/Button';
import { UI } from '../ui/theme';
import { drawSceneBackground } from './helpers';

export default class VersusResultScene extends Phaser.Scene {
  private match: MatchSnapshot | null = null;

  constructor() {
    super('VersusResultScene');
  }

  init(data: { match?: MatchSnapshot }): void {
    this.match = data.match || getRegistryValue(this.game, 'activeMatch') || null;
  }

  create(): void {
    drawSceneBackground(this);
    if (!this.match) {
      this.scene.start('VersusHomeScene');
      return;
    }
    setRegistryValue(this.game, 'activeMatch', this.match);
    const username = getRegistryValue(this.game, 'username');
    const role = getMatchRole(this.match, username) || 'challenger';
    const myScore = role === 'challenger' ? this.match.challengerScore : this.match.recipientScore;
    const theirScore = role === 'challenger' ? this.match.recipientScore : this.match.challengerScore;
    const headline = myScore === theirScore ? 'TIE' : Number(myScore) > Number(theirScore) ? 'WIN' : 'LOSS';
    const opponent = getOpponentName(this.match, username);

    this.add.text(this.scale.width / 2, this.scale.height * 0.22, headline, {
      fontFamily: UI.titleFont,
      fontSize: `${Math.max(56, Math.min(84, this.scale.width * 0.18))}px`,
      color: UI.colors.accent
    }).setOrigin(0.5);
    this.add.text(this.scale.width / 2, this.scale.height * 0.39, `${myScore ?? '-'}  -  ${theirScore ?? '-'}`, {
      fontFamily: UI.titleFont,
      fontSize: `${Math.max(42, Math.min(68, this.scale.width * 0.14))}px`,
      color: UI.colors.text
    }).setOrigin(0.5);
    this.add.text(this.scale.width / 2, this.scale.height * 0.5, `You vs ${opponent}`, {
      fontFamily: UI.font,
      fontSize: '20px',
      color: UI.colors.textMute
    }).setOrigin(0.5);

    const buttonW = Math.min(320, this.scale.width - 44);
    new Button(this, this.scale.width / 2, this.scale.height - 166, {
      label: canSendChallengeToday() ? 'Rematch' : 'Daily limit reached',
      width: buttonW,
      variant: 'primary',
      onClick: () => void this.rematch(opponent)
    });
    new Button(this, this.scale.width / 2, this.scale.height - 106, {
      label: 'History',
      width: buttonW,
      onClick: () => this.scene.start('VersusHistoryScene')
    });
    new Button(this, this.scale.width / 2, this.scale.height - 48, {
      label: 'Home',
      width: buttonW,
      onClick: () => this.scene.start('VersusHomeScene')
    });
  }

  private async rematch(opponent: string): Promise<void> {
    if (!canSendChallengeToday()) return;
    const username = getRegistryValue(this.game, 'username') || 'Player';
    try {
      const row = await globalScores.createDirectChallenge(username, opponent);
      recordChallengeSent();
      const match = normalizeMatch(row);
      setRegistryValue(this.game, 'activeMatch', match);
      this.scene.start('VersusHomeScene');
    } catch (error) {
      console.error('Failed to create rematch', { opponent, error });
      this.scene.start('VersusHomeScene', { message: 'Could not start rematch' });
    }
  }
}
