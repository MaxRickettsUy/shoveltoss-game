import Phaser from 'phaser';
import { LIFE_ICON_W, MISSES_PER_RUN, THEME } from '../game/constants';
import { CHAMPION_IDS } from '../game/characters';
import { getRegistryValue, onRegistryChange } from '../game/state';
import type { CharacterId, GameMode } from '../game/types';

interface HUDSceneData {
  mode: GameMode;
  throwsRemaining: number;
  characterId: CharacterId;
}

export default class HUDScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private throwsText?: Phaser.GameObjects.Text;
  private lives: Phaser.GameObjects.Image[] = [];
  private unsubScore?: () => void;
  private unsubMisses?: () => void;
  private unsubThrows?: () => void;
  private characterId: CharacterId = '';
  private mode: GameMode = 'solo';
  private throwsRemaining = Infinity;

  constructor() {
    super('HUDScene');
  }

  init(data: HUDSceneData): void {
    this.characterId = data.characterId;
    this.mode = data.mode;
    this.throwsRemaining = data.throwsRemaining;
  }

  create(): void {
    const safeTop = Math.max(20, this.scale.height * 0.04);
    const hudFontSize = Math.max(24, Math.floor(this.scale.width * 0.07));
    const subFontSize = Math.max(16, Math.floor(this.scale.width * 0.045));

    this.scoreText = this.add
      .text(20, safeTop + hudFontSize, String(getRegistryValue(this.game, 'score') ?? 0), {
        fontFamily: 'Archivo, system-ui, sans-serif',
        fontSize: `${hudFontSize}px`,
        fontStyle: '700',
        color: THEME.text
      })
      .setOrigin(0, 1);

    if (this.mode === 'solo') {
      this.renderLives(getRegistryValue(this.game, 'misses') ?? 0, safeTop + hudFontSize + subFontSize + 8);
    }
    if (this.mode === 'versus') {
      this.throwsText = this.add
        .text(this.scale.width - 20, safeTop + hudFontSize, this.formatThrows(getRegistryValue(this.game, 'throwsRemaining') ?? this.throwsRemaining), {
          fontFamily: 'Archivo, system-ui, sans-serif',
          fontSize: `${subFontSize}px`,
          fontStyle: '700',
          color: THEME.text
        })
        .setOrigin(1, 1);
      this.unsubThrows = onRegistryChange(this.game, 'throwsRemaining', (value) => {
        this.throwsText?.setText(this.formatThrows(value));
      });
    }
    this.unsubScore = onRegistryChange(this.game, 'score', (value) => this.scoreText.setText(String(value)));
    if (this.mode === 'solo') {
      this.unsubMisses = onRegistryChange(this.game, 'misses', (value) => this.renderLives(value, safeTop + hudFontSize + subFontSize + 8));
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  private formatThrows(value: number): string {
    return `Throws left: ${Number.isFinite(value) ? value : 0}`;
  }

  private renderLives(misses: number, y = Math.max(20, this.scale.height * 0.04) + 96): void {
    for (const life of this.lives) life.destroy();
    this.lives = [];

    const key = CHAMPION_IDS.has(this.characterId) ? 'champ-shovel' : 'shovel';
    const texture = this.textures.get(key).getSourceImage() as HTMLImageElement;
    const iconW = Math.max(20, Math.min(LIFE_ICON_W, this.scale.width * 0.06));
    const iconH = iconW * texture.naturalHeight / texture.naturalWidth;
    const remaining = MISSES_PER_RUN - misses;
    const gap = 8;

    for (let i = 0; i < MISSES_PER_RUN; i += 1) {
      const icon = this.add
        .image(20 + i * (iconW + gap), y - iconH, key)
        .setOrigin(0, 0)
        .setDisplaySize(iconW, iconH)
        .setAlpha(i < remaining ? 1 : 0.25);
      this.lives.push(icon);
    }
  }

  private shutdown(): void {
    this.unsubScore?.();
    this.unsubMisses?.();
    this.unsubThrows?.();
  }
}
