import Phaser from 'phaser';
import { CHARACTERS, CHAMPION_IDS } from '../game/characters';
import {
  CHARACTER_RENDER_H,
  FEEDBACK_DURATION,
  METER_HEIGHT_FRACTION,
  METER_SPEED,
  METER_SPEED_INCREMENT_PER_THROW,
  METER_WIDTH_FRACTION,
  MISSES_PER_RUN,
  PIT_LANDING_VISUAL_ASSET_OFFSET_LEFT,
  PIT_LANDING_VISUAL_ASSET_OFFSET_RIGHT,
  RESET_DELAY,
  SHOVEL_RENDER_W,
  SHOVEL_ROT_RATE,
  SHOVEL_STICK_ANGLE,
  SWEET_CENTER_MAX,
  SWEET_CENTER_MIN,
  SWEET_SPOT_CENTER,
  SWEET_SPOT_WIDTH,
  THEME,
  THROW_DURATION,
  THROW_PEAK_RATIO,
  VERSUS_THROWS_PER_PLAYER
} from '../game/constants';
import { LEVELS } from '../game/levels';
import { setRegistryValue } from '../game/state';
import { computeLayout, computeOutcome } from '../game/throw';
import type { GameSceneData, ThrowOutcome, ThrowState } from '../game/types';
import Meter from '../ui/Meter';

interface FlightTweenTarget {
  t: number;
}

export default class GameScene extends Phaser.Scene {
  private throwState: ThrowState = 'IDLE';
  private score = 0;
  private misses = 0;
  private throwsRemaining = Infinity;
  private mode: GameSceneData['mode'] = 'solo';
  private characterId: GameSceneData['characterId'] = CHARACTERS[0].id;
  private levelId: GameSceneData['levelId'] = LEVELS[0].id;
  private meter!: Meter;
  private background!: Phaser.GameObjects.Image;
  private pitLayer?: Phaser.GameObjects.Image;
  private character!: Phaser.GameObjects.Sprite;
  private shovel?: Phaser.GameObjects.Image;
  private idleHint?: Phaser.GameObjects.Text;
  private feedbackText?: Phaser.GameObjects.Text;
  private feedbackPoints?: Phaser.GameObjects.Text;
  private resetTimer?: Phaser.Time.TimerEvent;
  private meterSpeed = METER_SPEED;
  private sweetCenter = SWEET_SPOT_CENTER;

  constructor() {
    super('GameScene');
  }

  init(data: GameSceneData): void {
    this.mode = data.mode;
    this.characterId = data.characterId;
    this.levelId = data.levelId;
    this.throwsRemaining = data.throwsRemaining ?? (data.mode === 'versus' ? VERSUS_THROWS_PER_PLAYER : Infinity);
    this.score = 0;
    this.misses = 0;
    this.meterSpeed = METER_SPEED;
    this.throwState = 'IDLE';
    setRegistryValue(this.game, 'score', this.score);
    setRegistryValue(this.game, 'misses', this.misses);
  }

  create(): void {
    const { width, height } = this.scale;
    const level = LEVELS.find((item) => item.id === this.levelId) ?? LEVELS[0];
    const mirrored = level.isMirrored;
    const layout = this.getLayout();

    this.background = this.add.image(width / 2, height / 2, `level:${this.levelId}`).setDepth(-20);
    this.sizeBackground();
    this.addPitLayer(mirrored);

    this.character = this.add
      .sprite(layout.playerX, layout.playerY, `character:${this.characterId}:sheet`, 0)
      .setOrigin(0.5, 1)
      .setFlipX(mirrored)
      .setDepth(0);
    this.sizeCharacter();

    this.meter = this.createMeter();

    this.idleHint = this.add
      .text(width / 2, height - Math.max(28, height * 0.06), 'Hold to charge', {
        fontFamily: 'Archivo, system-ui, sans-serif',
        fontSize: '28px',
        color: THEME.textMute
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.scene.launch('HUDScene', { mode: this.mode, throwsRemaining: this.throwsRemaining, characterId: this.characterId });
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  update(_time: number, delta: number): void {
    if (this.throwState === 'CHARGING') this.meter.tick(delta);
    if (this.shovel && this.throwState === 'FLYING') {
      this.shovel.rotation += SHOVEL_ROT_RATE * (delta / 1000);
    }
  }

  private onPointerDown(): void {
    if (this.throwState !== 'IDLE') return;
    this.throwState = 'CHARGING';
    this.idleHint?.setVisible(false);
    this.sweetCenter = SWEET_CENTER_MIN + Math.random() * (SWEET_CENTER_MAX - SWEET_CENTER_MIN);
    this.meter.destroy();
    this.meter = this.createMeter();
    this.character.setFrame(1);
    this.meter.start();
  }

  private onPointerUp(): void {
    if (this.throwState !== 'CHARGING') return;

    const release = this.meter.stop();
    const outcome = computeOutcome({
      power: release.accuracy,
      accuracy: release.accuracy,
      sweetSpotCenter: this.sweetCenter,
      width: this.scale.width,
      height: this.scale.height,
      launchOffsetY: this.getShovelLaunchOffset(),
      characterId: this.characterId,
      levelId: this.levelId,
      mode: this.mode
    });
    this.throwState = 'FLYING';
    this.character.setFrame(2);
    this.startFlight(outcome);
  }

  private startFlight(outcome: ThrowOutcome): void {
    const layout = this.getLayout();
    const originX = layout.playerX;
    const originY = layout.playerY - this.getShovelLaunchOffset();
    const peakHeight = Math.abs(layout.pitCenterX - layout.playerX) * THROW_PEAK_RATIO;
    const shovelKey = CHAMPION_IDS.has(this.characterId) ? 'champ-shovel' : 'shovel';
    const texture = this.textures.get(shovelKey).getSourceImage() as HTMLImageElement;
    const shovelH = SHOVEL_RENDER_W * texture.naturalHeight / texture.naturalWidth;

    this.shovel?.destroy();
    this.shovel = this.add.image(originX, originY, shovelKey).setDisplaySize(SHOVEL_RENDER_W, shovelH).setDepth(10);

    const target: FlightTweenTarget = { t: 0 };
    this.tweens.add({
      targets: target,
      t: 1,
      duration: THROW_DURATION * 1000,
      ease: 'Linear',
      onUpdate: () => {
        if (!this.shovel) return;
        this.shovel.x = originX + (outcome.landingX - originX) * target.t;
        this.shovel.y = originY + (outcome.landingY - originY) * target.t - peakHeight * 4 * target.t * (1 - target.t);
      },
      onComplete: () => {
        this.resolveThrow(outcome);
      }
    });
  }

  private resolveThrow(outcome: ThrowOutcome): void {
    if (!this.shovel) return;
    this.throwState = 'RESETTING';
    this.meter.setVisible(false);
    this.shovel.x = outcome.landingX;
    this.shovel.y = outcome.inPit ? outcome.landingY - this.getPitLandingVisualYOffset() : outcome.landingY;
    if (outcome.zone === 'stick') this.shovel.rotation = SHOVEL_STICK_ANGLE;
    this.character.setFrame(0);

    this.score += outcome.score;
    if (outcome.zone === 'miss') this.misses += 1;
    if (outcome.zone === 'stick') this.meterSpeed += METER_SPEED_INCREMENT_PER_THROW;
    if (Number.isFinite(this.throwsRemaining)) this.throwsRemaining = Math.max(0, this.throwsRemaining - 1);
    setRegistryValue(this.game, 'score', this.score);
    setRegistryValue(this.game, 'misses', this.misses);

    this.showFeedback(outcome);
    const done = this.misses >= MISSES_PER_RUN || this.throwsRemaining === 0;
    this.resetTimer = this.time.delayedCall(RESET_DELAY, () => {
      if (done) {
        this.scene.stop('HUDScene');
        this.scene.start('GameOverScene', {
          score: this.score,
          characterId: this.characterId,
          levelId: this.levelId
        });
        return;
      }
      this.shovel?.destroy();
      this.meter.setVisible(false);
      this.throwState = 'IDLE';
      this.idleHint?.setVisible(true);
    });
  }

  private showFeedback(outcome: ThrowOutcome): void {
    this.feedbackText?.destroy();
    this.feedbackPoints?.destroy();
    const label = outcome.zone.toUpperCase().replace('_', ' ');
    const color = outcome.zone === 'stick' ? THEME.accent : outcome.zone === 'miss' ? '#ff4444' : THEME.text;
    this.feedbackText = this.add
      .text(this.scale.width / 2, outcome.landingY - 120, label, {
        fontFamily: 'Bungee, Impact, sans-serif',
        fontSize: '42px',
        color
      })
      .setOrigin(0.5)
      .setDepth(20);
    if (outcome.score !== 0) {
      this.feedbackPoints = this.add
        .text(this.scale.width / 2, outcome.landingY - 76, `${outcome.score > 0 ? '+' : ''}${outcome.score}`, {
          fontFamily: 'Archivo, system-ui, sans-serif',
          fontSize: '28px',
          color: THEME.text
        })
        .setOrigin(0.5)
        .setDepth(20);
    }
    this.tweens.add({
      targets: [this.feedbackText, this.feedbackPoints].filter(Boolean),
      alpha: 0,
      delay: FEEDBACK_DURATION - 450,
      duration: 450
    });
  }

  private addPitLayer(mirrored: boolean): void {
    const layout = this.getLayout();
    const key = mirrored ? 'pit-left' : 'pit';
    const texture = this.textures.get(key).getSourceImage() as HTMLImageElement;
    const displayWidth = mirrored ? layout.pitRight : this.scale.width - layout.pitLeft;
    const displayHeight = displayWidth * texture.naturalHeight / texture.naturalWidth;
    const x = mirrored ? 0 : layout.pitLeft;
    this.pitLayer?.destroy();
    this.pitLayer = this.add.image(x, layout.groundY - displayHeight, key).setOrigin(0, 0).setDisplaySize(displayWidth, displayHeight).setDepth(-10);
  }

  private getPitLandingVisualYOffset(): number {
    const layout = this.getLayout();
    const texture = this.textures.get(this.levelId === 'lil-italy' ? 'pit-left' : 'pit').getSourceImage() as HTMLImageElement;
    const displayWidth = this.levelId === 'lil-italy' ? layout.pitRight : this.scale.width - layout.pitLeft;
    const scale = displayWidth / texture.naturalWidth;
    const offset = this.levelId === 'lil-italy' ? PIT_LANDING_VISUAL_ASSET_OFFSET_LEFT : PIT_LANDING_VISUAL_ASSET_OFFSET_RIGHT;
    return offset * scale;
  }

  private getCharacterAspect(): number {
    const character = CHARACTERS.find((item) => item.id === this.characterId) ?? CHARACTERS[0];
    return character.frameWidth / character.frameHeight;
  }

  private getCharacterRenderHeight(): number {
    return Math.max(CHARACTER_RENDER_H, Math.min(this.scale.height * 0.28, this.scale.width * 0.22, 260));
  }

  private getShovelLaunchOffset(): number {
    return Math.max(50, this.getCharacterRenderHeight() * 0.34);
  }

  private sizeCharacter(): void {
    const renderHeight = this.getCharacterRenderHeight();
    this.character.setDisplaySize(renderHeight * this.getCharacterAspect(), renderHeight);
  }

  private getLayout() {
    return computeLayout(this.levelId, this.scale.width, this.scale.height);
  }

  private sizeBackground(): void {
    const texture = this.textures.get(`level:${this.levelId}`).getSourceImage() as HTMLImageElement;
    const scale = Math.max(this.scale.width / texture.naturalWidth, this.scale.height / texture.naturalHeight);
    this.background
      .setPosition(this.scale.width / 2, this.scale.height / 2)
      .setDisplaySize(texture.naturalWidth * scale, texture.naturalHeight * scale);
  }

  private onResize(): void {
    if (!this.background || !this.character) return;
    const layout = this.getLayout();
    const level = LEVELS.find((item) => item.id === this.levelId) ?? LEVELS[0];
    this.sizeBackground();
    this.addPitLayer(level.isMirrored);
    this.character.setPosition(layout.playerX, layout.playerY);
    this.sizeCharacter();
    this.idleHint?.setPosition(this.scale.width / 2, this.scale.height - Math.max(28, this.scale.height * 0.06));
    if (this.throwState === 'IDLE') {
      this.meter.destroy();
      this.meter = this.createMeter();
    }
  }

  private createMeter(): Meter {
    const { width, height } = this.scale;
    return new Meter(this, {
      x: (width - Math.max(220, width * METER_WIDTH_FRACTION)) / 2,
      y: this.getMeterY(),
      width: Math.max(220, width * METER_WIDTH_FRACTION),
      height: Math.max(36, height * METER_HEIGHT_FRACTION),
      hotSpotCenter: this.sweetCenter,
      hotSpotWidth: SWEET_SPOT_WIDTH,
      speed: this.meterSpeed
    }).setDepth(20);
  }

  private getMeterY(): number {
    const safeTop = Math.max(20, this.scale.height * 0.04);
    const hudFontSize = Math.max(24, Math.floor(this.scale.width * 0.07));
    const subFontSize = Math.max(16, Math.floor(this.scale.width * 0.045));
    return safeTop + hudFontSize + subFontSize + 30;
  }

  private shutdown(): void {
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.input.off('pointerupoutside', this.onPointerUp, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.resetTimer?.remove(false);
    this.tweens.killAll();
  }
}
