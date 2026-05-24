import Phaser from 'phaser';
import { globalScores } from '../globalScores';
import { VERSUS_THROWS_PER_PLAYER } from '../game/constants';
import { getRegistryValue, setRegistryValue } from '../game/state';
import type { MatchSnapshot, VersusGameSceneData, VersusRole } from '../game/types';
import { canSendChallengeToday, recordChallengeSent } from '../game/versusRateLimit';
import { normalizeMatch } from '../game/versusPoller';

const DEFAULT_EXPIRES_MS = 60_000;

export default class VersusGameScene extends Phaser.Scene {
  private sceneData!: VersusGameSceneData;
  private match: MatchSnapshot | null = null;

  constructor() {
    super('VersusGameScene');
  }

  init(data: VersusGameSceneData): void {
    this.sceneData = data;
  }

  async create(): Promise<void> {
    this.drawLoading('Preparing match...');
    try {
      this.match = await this.resolveMatch();
      if (this.sceneData.role === 'recipient') {
        const row = await globalScores.setRecipientCharacter(this.match.matchId, this.sceneData.characterId);
        if (row) this.match = normalizeMatch(row);
      }
      setRegistryValue(this.game, 'activeMatch', this.match);
      this.scene.launch('GameScene', {
        mode: 'versus',
        characterId: this.sceneData.characterId,
        levelId: this.sceneData.levelId || this.match.levelId,
        throwsRemaining: VERSUS_THROWS_PER_PLAYER,
        matchId: this.match.matchId
      });
      const gameScene = this.scene.get('GameScene');
      gameScene.events.once('runComplete', this.onRunComplete, this);
      this.scene.bringToTop('GameScene');
    } catch {
      this.scene.start('VersusHomeScene', { message: 'Could not start match' });
    }
  }

  private async resolveMatch(): Promise<MatchSnapshot> {
    if (this.sceneData.matchId && this.sceneData.inviteCode) {
      return {
        matchId: this.sceneData.matchId,
        inviteCode: this.sceneData.inviteCode,
        challengerName: '',
        recipientName: '',
        challengerScore: null,
        recipientScore: null,
        status: 'playing',
        expiresAt: new Date(Date.now() + DEFAULT_EXPIRES_MS).toISOString(),
        levelId: this.sceneData.levelId || 'lil-italy',
        challengerCharacterId: null,
        recipientCharacterId: this.sceneData.role === 'recipient' ? this.sceneData.characterId : null
      };
    }

    if (this.sceneData.matchId) {
      const existing = getRegistryValue(this.game, 'activeMatch');
      if (existing?.matchId === this.sceneData.matchId) return existing;
    }

    if (this.sceneData.role === 'challenger' && this.sceneData.opponentName) {
      if (!canSendChallengeToday()) throw new Error('daily-limit');
      const username = getRegistryValue(this.game, 'username') || 'Player';
      const row = await globalScores.createDirectChallenge(username, this.sceneData.opponentName, {
        levelId: this.sceneData.levelId,
        characterId: this.sceneData.characterId
      });
      recordChallengeSent();
      return normalizeMatch(row);
    }

    const existing = getRegistryValue(this.game, 'activeMatch');
    if (existing) return existing;
    throw new Error('missing-match');
  }

  private async onRunComplete({ score }: { score: number }): Promise<void> {
    if (!this.match) return;
    try {
      const row = await globalScores.submitMatchScore(this.match.matchId, this.sceneData.role as VersusRole, score);
      const updated = normalizeMatch(row);
      setRegistryValue(this.game, 'activeMatch', updated);
      this.scene.stop('GameScene');
      this.scene.start(updated.status === 'complete' ? 'VersusResultScene' : 'VersusWaitingScene', { match: updated });
    } catch {
      this.scene.stop('GameScene');
      this.scene.start('VersusWaitingScene', { match: this.match, message: 'Could not submit score. Try again from history.' });
    }
  }

  private drawLoading(message: string): void {
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x22281f).setOrigin(0);
    this.add.text(this.scale.width / 2, this.scale.height / 2, message, {
      fontFamily: 'Archivo, system-ui, sans-serif',
      fontSize: '20px',
      color: '#ede8d8'
    }).setOrigin(0.5);
  }
}
