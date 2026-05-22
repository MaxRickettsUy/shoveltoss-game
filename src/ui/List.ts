import Phaser from 'phaser';

export interface ListOptions<T> {
  width: number;
  height: number;
  rowHeight: number;
  renderRow: (container: Phaser.GameObjects.Container, data: T, index: number) => void;
}

export default class List<T> extends Phaser.GameObjects.Container {
  private readonly content: Phaser.GameObjects.Container;
  private readonly hit: Phaser.GameObjects.Zone;
  private dragStartY = 0;
  private contentStartY = 0;
  private maxScroll = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly opts: ListOptions<T>) {
    super(scene, x, y);
    scene.add.existing(this);
    this.content = scene.add.container(0, 0);
    this.hit = scene.add.zone(0, opts.height / 2, opts.width, opts.height).setOrigin(0, 0.5);
    this.add([this.hit, this.content]);
    this.hit.setInteractive({ draggable: true });
    this.hit.on('dragstart', (_pointer: Phaser.Input.Pointer, _dragX: number, dragY: number) => {
      this.dragStartY = dragY;
      this.contentStartY = this.content.y;
    });
    this.hit.on('drag', (_pointer: Phaser.Input.Pointer, _dragX: number, dragY: number) => {
      this.setScroll(this.contentStartY + dragY - this.dragStartY);
    });
    this.hit.on('wheel', (_pointer: Phaser.Input.Pointer, _dx: number, dy: number) => {
      this.setScroll(this.content.y - dy);
    });
  }

  setItems(items: readonly T[]): void {
    this.content.removeAll(true);
    items.forEach((item, index) => {
      const row = this.scene.add.container(0, index * this.opts.rowHeight);
      this.opts.renderRow(row, item, index);
      this.content.add(row);
    });
    this.maxScroll = Math.max(0, items.length * this.opts.rowHeight - this.opts.height);
    this.setScroll(0);
  }

  private setScroll(y: number): void {
    this.content.y = Phaser.Math.Clamp(y, -this.maxScroll, 0);
  }
}
