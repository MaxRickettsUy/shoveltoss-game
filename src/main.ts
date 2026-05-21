import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import HomeScene from './scenes/HomeScene';

const root = document.getElementById('game-root');
if (root) root.textContent = '';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  scene: [BootScene, HomeScene]
};

new Phaser.Game(config);
