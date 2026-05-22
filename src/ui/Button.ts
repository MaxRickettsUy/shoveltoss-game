import Phaser from 'phaser';
import { UI } from './theme';

export interface ButtonOptions {
  label: string;
  width?: number;
  height?: number;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  fontSize?: number;
}

export default class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private readonly hit: Phaser.GameObjects.Zone;
  private readonly widthValue: number;
  private readonly heightValue: number;
  private readonly variant: NonNullable<ButtonOptions['variant']>;
  private isDown = false;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly opts: ButtonOptions) {
    super(scene, x, y);
    scene.add.existing(this);

    this.widthValue = opts.width ?? 260;
    this.heightValue = opts.height ?? 54;
    this.variant = opts.variant ?? 'secondary';
    this.bg = scene.add.graphics();
    this.text = scene.add
      .text(0, 0, opts.label, {
        fontFamily: UI.font,
        fontSize: `${opts.fontSize ?? 20}px`,
        fontStyle: '700',
        color: UI.colors.text,
        align: 'center'
      })
      .setOrigin(0.5);
    this.hit = scene.add.zone(0, 0, this.widthValue, this.heightValue).setOrigin(0.5);

    this.add([this.bg, this.text, this.hit]);
    this.hit.setInteractive({ useHandCursor: true });
    this.hit.on('pointerover', () => this.draw('hover'));
    this.hit.on('pointerout', () => {
      this.isDown = false;
      this.draw('idle');
    });
    this.hit.on('pointerdown', () => {
      this.isDown = true;
      this.draw('down');
    });
    this.hit.on('pointerup', () => {
      if (!this.isDown) return;
      this.isDown = false;
      this.draw('hover');
      opts.onClick();
    });
    this.draw('idle');
  }

  setLabel(label: string): this {
    this.text.setText(label);
    return this;
  }

  private draw(state: 'idle' | 'hover' | 'down'): void {
    const colors = UI.colors;
    const fill = this.variant === 'primary'
      ? colors.accent
      : this.variant === 'ghost'
        ? 'rgba(0, 0, 0, 0)'
        : colors.surface;
    const hoverFill = this.variant === 'primary' ? colors.accent2 : colors.secondary;
    const colorSource = this.variant === 'ghost' && state === 'idle' ? UI.colors.surface : (state === 'idle' ? fill : hoverFill);
    const color = Phaser.Display.Color.HexStringToColor(colorSource).color;

    this.bg.clear();
    if (this.variant !== 'ghost' || state !== 'idle') {
      this.bg.fillStyle(color, state === 'down' ? 0.85 : 1);
      this.bg.fillRoundedRect(-this.widthValue / 2, -this.heightValue / 2, this.widthValue, this.heightValue, UI.radius);
    }
    this.bg.lineStyle(UI.stroke, Phaser.Display.Color.HexStringToColor(colors.secondary).color, this.variant === 'ghost' ? 1 : 0.7);
    this.bg.strokeRoundedRect(-this.widthValue / 2, -this.heightValue / 2, this.widthValue, this.heightValue, UI.radius);
  }
}
