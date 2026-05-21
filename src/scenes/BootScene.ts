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

    await document.fonts.ready;
    this.scene.start('HomeScene');
  }
}
