import Phaser from 'phaser';
import { THEME } from '../game/constants';

export interface MeterOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  hotSpotCenter: number;
  hotSpotWidth: number;
  speed: number;
}

export interface MeterRelease {
  accuracy: number;
  inSweetSpot: boolean;
}

export default class Meter extends Phaser.GameObjects.Container {
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly sweetSpot: Phaser.GameObjects.Graphics;
  private readonly fill: Phaser.GameObjects.Graphics;
  private readonly border: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly speedLabel: Phaser.GameObjects.Text;
  private fillValue = 0;
  private direction = 1;
  private running = false;

  constructor(scene: Phaser.Scene, private readonly opts: MeterOptions) {
    super(scene, opts.x, opts.y);
    scene.add.existing(this);

    this.bar = scene.add.graphics();
    this.sweetSpot = scene.add.graphics();
    this.fill = scene.add.graphics();
    this.border = scene.add.graphics();
    this.label = scene.add
      .text(opts.width / 2, opts.height + 14, 'POWER', {
        fontFamily: 'Archivo, system-ui, sans-serif',
        fontSize: '14px',
        color: THEME.text
      })
      .setOrigin(0.5);
    this.speedLabel = scene.add
      .text(opts.width / 2, opts.height + 30, `SPEED ${opts.speed.toFixed(2)}`, {
        fontFamily: 'Archivo, system-ui, sans-serif',
        fontSize: '12px',
        color: THEME.text
      })
      .setOrigin(0.5);

    this.add([this.bar, this.sweetSpot, this.fill, this.border, this.label, this.speedLabel]);
    this.setVisible(false);
    this.draw();
  }

  start(): void {
    this.fillValue = 0;
    this.direction = 1;
    this.running = true;
    this.setVisible(true);
    this.draw();
  }

  stop(): MeterRelease {
    this.running = false;
    const inSweetSpot = this.isInSweetSpot(this.fillValue);
    this.draw();
    return {
      accuracy: this.fillValue,
      inSweetSpot
    };
  }

  tick(delta: number): void {
    if (!this.running) return;
    this.fillValue += this.direction * this.opts.speed * (delta / 1000);
    if (this.fillValue >= 1) {
      this.fillValue = 1;
      this.direction = -1;
    }
    if (this.fillValue <= 0) {
      this.fillValue = 0;
      this.direction = 1;
    }
    this.draw();
  }

  private draw(): void {
    const { width, height, hotSpotCenter, hotSpotWidth } = this.opts;
    const radius = 4;
    const sweetMin = hotSpotCenter - hotSpotWidth / 2;
    const sweetMax = hotSpotCenter + hotSpotWidth / 2;

    this.bar.clear();
    this.bar.fillStyle(Phaser.Display.Color.HexStringToColor(THEME.surface).color, 1);
    this.bar.fillRoundedRect(0, 0, width, height, radius);

    this.sweetSpot.clear();
    this.sweetSpot.fillStyle(0xffdc00, 0.25);
    this.sweetSpot.fillRoundedRect(width * sweetMin, 0, width * (sweetMax - sweetMin), height, radius);

    this.fill.clear();
    this.fill.fillStyle(this.isInSweetSpot(this.fillValue) ? 0xffe600 : 0xff6b35, 1);
    this.fill.fillRoundedRect(0, 0, width * this.fillValue, height, radius);

    this.border.clear();
    this.border.lineStyle(2, Phaser.Display.Color.HexStringToColor(THEME.text).color, 1);
    this.border.strokeRoundedRect(0, 0, width, height, radius);
  }

  private isInSweetSpot(value: number): boolean {
    const half = this.opts.hotSpotWidth / 2;
    return value >= this.opts.hotSpotCenter - half && value <= this.opts.hotSpotCenter + half;
  }
}
