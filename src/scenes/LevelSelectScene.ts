import Phaser from 'phaser';
import { LEVELS } from '../game/levels';
import { getRegistryValue, setRegistryValue } from '../game/state';
import type { GameSceneData } from '../game/types';
import Button from '../ui/Button';
import { UI } from '../ui/theme';
import { drawSceneBackground } from './helpers';

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create(): void {
    drawSceneBackground(this);
    this.addResponsiveTitle();

    const bottomY = this.scale.height - 42;
    const halfW = Math.min(150, (this.scale.width - 70) / 2);
    new Button(this, this.scale.width / 2 - halfW / 2 - 8, bottomY, {
      label: 'Back',
      width: halfW,
      height: 48,
      onClick: () => this.scene.start('CharacterSelectScene')
    });
    new Button(this, this.scale.width / 2 + halfW / 2 + 8, bottomY, {
      label: 'Home',
      width: halfW,
      height: 48,
      onClick: () => this.scene.start('HomeScene')
    });

    const { width, height } = this.scale;
    const titleIsWrapped = width < 560;
    const tileW = Math.min(560, width - 44);
    const tileH = Math.min(titleIsWrapped ? 118 : 138, Math.max(96, height * 0.16));
    const startY = Math.max(titleIsWrapped ? 190 : 150, height * (titleIsWrapped ? 0.3 : 0.24));
    const tileGap = titleIsWrapped ? 14 : 18;
    LEVELS.forEach((level, index) => {
      const y = startY + index * (tileH + tileGap);
      const container = this.add.container(width / 2, y);
      const bg = this.add.graphics();
      bg.fillStyle(Phaser.Display.Color.HexStringToColor(UI.colors.surface).color, 1);
      bg.fillRoundedRect(-tileW / 2, -tileH / 2, tileW, tileH, UI.radius);
      bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(UI.colors.secondary).color, 1);
      bg.strokeRoundedRect(-tileW / 2, -tileH / 2, tileW, tileH, UI.radius);
      const thumb = this.add.image(-tileW / 2 + tileH * 0.75, 0, `level:${level.id}`).setDisplaySize(tileH * 1.28, tileH - 20);
      const label = this.add
        .text(-tileW / 2 + tileH * 1.48, 0, level.label, {
          fontFamily: UI.font,
          fontSize: '26px',
          fontStyle: '700',
          color: UI.colors.text
        })
        .setOrigin(0, 0.5);
      const hit = this.add.zone(0, 0, tileW, tileH).setOrigin(0.5).setInteractive({ useHandCursor: true });
      container.add([bg, thumb, label, hit]);
      hit.on('pointerdown', () => this.startLevel(level.id));
    });
  }

  private addResponsiveTitle(): void {
    const { width } = this.scale;
    const isNarrow = width < 560;
    this.add
      .text(width / 2, isNarrow ? 72 : 64, isNarrow ? 'Choose Your\nLevel' : 'Choose Your Level', {
        fontFamily: UI.titleFont,
        fontSize: `${isNarrow ? Math.max(34, Math.min(44, width * 0.115)) : Math.max(42, Math.min(72, width * 0.075))}px`,
        color: UI.colors.accent,
        align: 'center',
        lineSpacing: isNarrow ? -8 : 0
      })
      .setOrigin(0.5);
  }

  private startLevel(levelId: string): void {
    const characterId = getRegistryValue(this.game, 'selectedCharacterId');
    if (!characterId) {
      this.scene.start('CharacterSelectScene');
      return;
    }
    setRegistryValue(this.game, 'selectedLevelId', levelId);
    this.scene.start('GameScene', {
      characterId,
      levelId,
      mode: 'solo'
    } satisfies GameSceneData);
  }
}
