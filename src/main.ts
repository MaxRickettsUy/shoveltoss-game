import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import GameOverScene from './scenes/GameOverScene';
import GameScene from './scenes/GameScene';
import HomeScene from './scenes/HomeScene';
import HUDScene from './scenes/HUDScene';

const root = document.getElementById('game-root');
if (root) root.textContent = '';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER
  },
  scene: [BootScene, HomeScene, GameScene, HUDScene, GameOverScene]
};

new Phaser.Game(config);
