import Phaser from 'phaser';
import { CHARACTERS, CHAMPION_IDS, LADY_CHARACTER_IDS, NEW_CHARACTER_IDS } from '../game/characters';
import { setRegistryValue } from '../game/state';
import type { CharacterId } from '../game/types';
import Button from '../ui/Button';
import { fitText, UI } from '../ui/theme';

interface CharacterSelectData {
  next?: string;
  init?: Record<string, unknown>;
}

export default class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private nextScene = 'LevelSelectScene';
  private nextInit: Record<string, unknown> = {};
  private cards: Phaser.GameObjects.Container[] = [];
  private navButtons: Button[] = [];

  constructor() {
    super('CharacterSelectScene');
  }

  init(data: CharacterSelectData = {}): void {
    this.nextScene = data.next || 'LevelSelectScene';
    this.nextInit = data.init || {};
  }

  create(): void {
    this.drawBackground();
    this.addResponsiveTitle();
    this.renderCards();

    new Button(this, this.scale.width / 2, this.scale.height - 62, {
      label: 'Home',
      width: Math.min(240, this.scale.width - 52),
      height: 50,
      onClick: () => this.scene.start('HomeScene')
    });
  }

  private drawBackground(): void {
    this.add.rectangle(
      0,
      0,
      this.scale.width,
      this.scale.height,
      Phaser.Display.Color.HexStringToColor(UI.colors.bgTop).color
    ).setOrigin(0);
  }

  private addResponsiveTitle(): void {
    const { width } = this.scale;
    const isNarrow = width < 560;
    this.add
      .text(width / 2, isNarrow ? 72 : 64, isNarrow ? 'Choose Your\nCharacter' : 'Choose Your Character', {
        fontFamily: UI.titleFont,
        fontSize: `${isNarrow ? Math.max(34, Math.min(44, width * 0.115)) : Math.max(42, Math.min(72, width * 0.075))}px`,
        color: UI.colors.accent,
        align: 'center',
        lineSpacing: isNarrow ? -8 : 0
      })
      .setOrigin(0.5);
  }

  private renderCards(): void {
    for (const card of this.cards) card.destroy();
    for (const button of this.navButtons) button.destroy();
    this.cards = [];
    this.navButtons = [];

    const { width, height } = this.scale;
    const visible = width < 520 ? 1 : 3;
    const cardW = Math.min(220, width * 0.58);
    const cardH = Math.min(320, height * 0.48);
    const gap = Math.min(250, width * 0.24);
    const centerY = height * 0.48;

    for (let offset = -Math.floor(visible / 2); offset <= Math.floor(visible / 2); offset += 1) {
      const index = Phaser.Math.Wrap(this.selectedIndex + offset, 0, CHARACTERS.length);
      const character = CHARACTERS[index];
      const x = width / 2 + offset * gap;
      const scale = offset === 0 ? 1 : 0.82;
      const card = this.add.container(x, centerY).setScale(scale);
      const bg = this.add.graphics();
      bg.fillStyle(Phaser.Display.Color.HexStringToColor(UI.colors.surface).color, 1);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, UI.radius);
      bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(offset === 0 ? UI.colors.accent : UI.colors.secondary).color, 1);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, UI.radius);

      const hero = this.add.image(0, -18, `character:${character.id}:hero`).setDisplaySize(cardW * 0.82, cardH * 0.68);
      const name = this.add
        .text(0, cardH / 2 - 42, fitText(character.id, 18), {
          fontFamily: UI.font,
          fontSize: '22px',
          fontStyle: '700',
          color: UI.colors.text
        })
        .setOrigin(0.5);
      const tags = this.tagText(character.id);
      const tagText = this.add
        .text(0, cardH / 2 - 16, tags, {
          fontFamily: UI.font,
          fontSize: '12px',
          color: UI.colors.textMute
        })
        .setOrigin(0.5);
      const hit = this.add.zone(0, 0, cardW, cardH).setOrigin(0.5).setInteractive({ useHandCursor: true });

      card.add([bg, hero, name, tagText, hit]);
      hit.on('pointerdown', () => {
        this.selectedIndex = index;
        this.confirm();
      });
      this.cards.push(card);
    }

    this.navButtons.push(new Button(this, 58, centerY, { label: '<', width: 44, height: 54, onClick: () => this.shift(-1) }));
    this.navButtons.push(new Button(this, width - 58, centerY, { label: '>', width: 44, height: 54, onClick: () => this.shift(1) }));
  }

  private tagText(id: CharacterId): string {
    const tags: string[] = [];
    if (NEW_CHARACTER_IDS.has(id)) tags.push('NEW');
    if (CHAMPION_IDS.has(id)) tags.push('CHAMPION');
    if (LADY_CHARACTER_IDS.has(id)) tags.push('LADY');
    return tags.join('  ');
  }

  private shift(delta: number): void {
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + delta, 0, CHARACTERS.length);
    this.renderCards();
  }

  private confirm(): void {
    const character = CHARACTERS[this.selectedIndex] ?? CHARACTERS[0];
    setRegistryValue(this.game, 'selectedCharacterId', character.id);
    this.scene.start(this.nextScene, { ...this.nextInit, characterId: character.id });
  }
}
