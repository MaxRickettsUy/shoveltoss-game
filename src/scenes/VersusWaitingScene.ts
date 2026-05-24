import Phaser from 'phaser';
import { getRegistryValue, setRegistryValue } from '../game/state';
import type { MatchSnapshot } from '../game/types';
import * as versusPoller from '../game/versusPoller';
import Button from '../ui/Button';
import { UI } from '../ui/theme';
import { drawSceneBackground } from './helpers';

export default class VersusWaitingScene extends Phaser.Scene {
  private match: MatchSnapshot | null = null;
  private unsubscribe: (() => void) | null = null;
  private pollErrorText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('VersusWaitingScene');
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
    const opponent = versusPoller.getOpponentName(this.match, username);
    const role = versusPoller.getMatchRole(this.match, username);
    const myScore = role === 'challenger' ? this.match.challengerScore : this.match.recipientScore;

    this.add.text(this.scale.width / 2, this.scale.height * 0.24, 'WAITING', {
      fontFamily: UI.titleFont,
      fontSize: `${Math.max(44, Math.min(68, this.scale.width * 0.14))}px`,
      color: UI.colors.accent
    }).setOrigin(0.5);
    this.add.text(this.scale.width / 2, this.scale.height * 0.42, String(myScore ?? 0), {
      fontFamily: UI.titleFont,
      fontSize: `${Math.max(56, Math.min(86, this.scale.width * 0.18))}px`,
      color: UI.colors.text
    }).setOrigin(0.5);
    this.add.text(this.scale.width / 2, this.scale.height * 0.55, `Waiting for ${opponent}...`, {
      fontFamily: UI.font,
      fontSize: '20px',
      color: UI.colors.textMute
    }).setOrigin(0.5);

    const buttonW = Math.min(310, this.scale.width - 44);
    new Button(this, this.scale.width / 2, this.scale.height - 106, {
      label: 'Share challenge',
      width: buttonW,
      onClick: () => void navigator.clipboard?.writeText(this.match?.inviteCode || '')
    });
    new Button(this, this.scale.width / 2, this.scale.height - 48, {
      label: 'Home',
      width: buttonW,
      onClick: () => this.scene.start('VersusHomeScene')
    });

    this.unsubscribe = versusPoller.subscribe((match, error) => {
      if (error) {
        this.showPollError();
        return;
      }
      this.pollErrorText?.destroy();
      this.pollErrorText = null;
      if (match.status === 'complete') this.scene.start('VersusResultScene', { match });
    });
    versusPoller.start(this.game, this.match);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  private onShutdown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private showPollError(): void {
    if (this.pollErrorText) return;
    this.pollErrorText = this.add.text(this.scale.width / 2, this.scale.height - 154, 'Connection issue. Retrying...', {
      fontFamily: UI.font,
      fontSize: '15px',
      color: UI.colors.textMute
    }).setOrigin(0.5);
  }
}
