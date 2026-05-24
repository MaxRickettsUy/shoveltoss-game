import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import CharacterSelectScene from './scenes/CharacterSelectScene';
import GameOverScene from './scenes/GameOverScene';
import GameScene from './scenes/GameScene';
import HallOfFameScene from './scenes/HallOfFameScene';
import HomeScene from './scenes/HomeScene';
import HUDScene from './scenes/HUDScene';
import LeaderboardScene from './scenes/LeaderboardScene';
import LevelSelectScene from './scenes/LevelSelectScene';
import OverlayScene from './scenes/OverlayScene';
import PlayerDetailScene from './scenes/PlayerDetailScene';
import PlayerStatsScene from './scenes/PlayerStatsScene';
import UsernameScene from './scenes/UsernameScene';
import VersusGameScene from './scenes/VersusGameScene';
import VersusHistoryScene from './scenes/VersusHistoryScene';
import VersusHomeScene from './scenes/VersusHomeScene';
import VersusResultScene from './scenes/VersusResultScene';
import VersusWaitingScene from './scenes/VersusWaitingScene';

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
  scene: [
    BootScene,
    UsernameScene,
    HomeScene,
    CharacterSelectScene,
    LevelSelectScene,
    GameScene,
    VersusGameScene,
    HUDScene,
    GameOverScene,
    LeaderboardScene,
    HallOfFameScene,
    PlayerStatsScene,
    PlayerDetailScene,
    VersusHomeScene,
    VersusWaitingScene,
    VersusResultScene,
    VersusHistoryScene,
    OverlayScene
  ]
};

new Phaser.Game(config);
