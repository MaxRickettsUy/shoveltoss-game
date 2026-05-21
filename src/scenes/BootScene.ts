import Phaser from 'phaser';
import { CHARACTERS } from '../game/characters';
import { LEVELS } from '../game/levels';
import { MISSES_PER_RUN } from '../game/constants';
import { getStoredSettings, getStoredUsername } from '../game/storage';
import { setRegistryValue } from '../game/state';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const { width, height } = this.scale;
    const loadingText = this.add
      .text(width / 2, height / 2 - 18, 'Loading...', {
        fontFamily: 'Archivo, system-ui, sans-serif',
        fontSize: '28px',
        color: '#ede8d8'
      })
      .setOrigin(0.5);
    const progressText = this.add
      .text(width / 2, height / 2 + 24, '0%', {
        fontFamily: 'Archivo, system-ui, sans-serif',
        fontSize: '18px',
        color: 'rgba(237, 232, 216, 0.62)'
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressText.setText(`${Math.round(value * 100)}%`);
    });
    this.load.once('complete', () => {
      loadingText.setText('Starting...');
      progressText.setText('100%');
    });

    this.load.image('pit', 'assets/pit.png');
    this.load.image('pit-left', 'assets/pit-left.png');
    this.load.image('pit-back', 'assets/pit-back.png');
    this.load.image('pit-front', 'assets/pit-front.png');
    this.load.image('dust-puff', 'assets/dust-puff.png');
    this.load.image('shovel', 'assets/shovel.png');
    this.load.image('champ-shovel', 'assets/champ-shovel.png');
    this.load.image('champion', 'assets/champion.png');
    this.load.image('beer', 'assets/beer.png');
    this.load.image('share', 'assets/share.png');

    for (const level of LEVELS) {
      this.load.image(`level:${level.id}`, level.background);
    }

    for (const character of CHARACTERS) {
      this.load.image(`character:${character.id}:hero`, character.hero);
      this.load.spritesheet(`character:${character.id}:sheet`, character.sprite, {
        frameWidth: character.frameWidth,
        frameHeight: character.frameHeight
      });
    }
  }

  async create(): Promise<void> {
    setRegistryValue(this.game, 'username', getStoredUsername() || null);
    setRegistryValue(this.game, 'selectedCharacterId', null);
    setRegistryValue(this.game, 'selectedLevelId', null);
    setRegistryValue(this.game, 'settings', getStoredSettings());
    setRegistryValue(this.game, 'activeMatch', null);
    setRegistryValue(this.game, 'score', 0);
    setRegistryValue(this.game, 'misses', MISSES_PER_RUN);

    await waitForFonts();
    this.scene.start('HomeScene');
  }
}

async function waitForFonts(): Promise<void> {
  if (!document.fonts?.ready) return;
  await Promise.race([
    document.fonts.ready,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 1500);
    })
  ]);
}
