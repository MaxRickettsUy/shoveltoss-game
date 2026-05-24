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
  private readonly maskShape: Phaser.GameObjects.Graphics;
  private readonly bounds: Phaser.Geom.Rectangle;
  private activePointer?: Phaser.Input.Pointer;
  private dragStartY = 0;
  private contentStartY = 0;
  private maxScroll = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly opts: ListOptions<T>) {
    super(scene, x, y);
    scene.add.existing(this);
    this.content = scene.add.container(0, 0);
    this.maskShape = scene.add.graphics().setAlpha(0);
    this.maskShape.fillStyle(0xffffff);
    this.maskShape.fillRect(x, y, opts.width, opts.height);
    this.content.setMask(this.maskShape.createGeometryMask());
    this.bounds = new Phaser.Geom.Rectangle(x, y, opts.width, opts.height);
    this.hit = scene.add.zone(0, opts.height / 2, opts.width, opts.height).setOrigin(0, 0.5);
    this.add([this.hit, this.content]);
    this.hit.setInteractive();
    this.hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.activePointer = pointer;
      this.dragStartY = pointer.y;
      this.contentStartY = this.content.y;
    });
    scene.input.on('pointermove', this.handlePointerMove, this);
    scene.input.on('pointerup', this.handlePointerUp, this);
    scene.input.on('wheel', this.handleWheel, this);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer !== this.activePointer || !pointer.isDown) {
      return;
    }
    this.setScroll(this.contentStartY + pointer.y - this.dragStartY);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer === this.activePointer) {
      this.activePointer = undefined;
    }
  }

  private handleWheel(pointer: Phaser.Input.Pointer, _currentlyOver: Phaser.GameObjects.GameObject[], _dx: number, dy: number): void {
    if (this.bounds.contains(pointer.x, pointer.y)) {
      this.setScroll(this.content.y - dy);
    }
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

  destroy(fromScene?: boolean): void {
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.scene.input.off('wheel', this.handleWheel, this);
    this.maskShape.destroy();
    super.destroy(fromScene);
  }
}
