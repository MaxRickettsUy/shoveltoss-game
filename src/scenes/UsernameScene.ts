import Phaser from 'phaser';
import { getRegistryValue, setRegistryValue } from '../game/state';
import { sanitizeUsername, setStoredUsername } from '../game/storage';
import Button from '../ui/Button';
import { UI } from '../ui/theme';
import { addDomInput, drawSceneBackground } from './helpers';

export default class UsernameScene extends Phaser.Scene {
  private inputEl?: HTMLInputElement;
  private errorText?: Phaser.GameObjects.Text;
  private pausedScenes: string[] = [];

  constructor() {
    super('UsernameScene');
  }

  create(): void {
    this.scene.bringToTop();
    this.pauseOtherScenes();
    const { width, height } = this.scale;
    drawSceneBackground(this);
    this.add.zone(0, 0, width, height).setOrigin(0).setInteractive();
    this.addResponsiveTitle();

    const currentName = getRegistryValue(this.game, 'username') || '';
    this.inputEl = addDomInput(this, width / 2, height * 0.42, Math.min(340, width - 44), currentName, 'Username');
    this.inputEl.focus();
    this.errorText = this.add
      .text(width / 2, height * 0.49, '', {
        fontFamily: UI.font,
        fontSize: '15px',
        color: '#ff8888'
      })
      .setOrigin(0.5);

    const buttonW = currentName ? Math.min(150, (width - 70) / 2) : Math.min(300, width - 64);
    new Button(this, currentName ? width / 2 - buttonW / 2 - 8 : width / 2, height * 0.58, {
      label: 'Continue',
      variant: 'primary',
      width: buttonW,
      onClick: () => this.save()
    });
    if (currentName) {
      new Button(this, width / 2 + buttonW / 2 + 8, height * 0.58, {
        label: 'Cancel',
        width: buttonW,
        onClick: () => this.scene.start('HomeScene')
      });
    }
    this.input.keyboard?.on('keydown-ENTER', this.save, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ENTER', this.save, this);
      this.resumePausedScenes();
    });
  }

  private addResponsiveTitle(): void {
    const { width, height } = this.scale;
    const isNarrow = width < 560;
    this.add
      .text(width / 2, Math.max(76, height * 0.18), isNarrow ? 'Choose Your\nName' : 'Choose Your Name', {
        fontFamily: UI.titleFont,
        fontSize: `${isNarrow ? Math.max(34, Math.min(44, width * 0.115)) : Math.max(42, Math.min(72, width * 0.075))}px`,
        color: UI.colors.accent,
        align: 'center',
        lineSpacing: isNarrow ? -8 : 0
      })
      .setOrigin(0.5);
  }

  private pauseOtherScenes(): void {
    this.pausedScenes = [];
    for (const scene of this.scene.manager.getScenes(true)) {
      if (scene.scene.key === this.scene.key) continue;
      this.pausedScenes.push(scene.scene.key);
      this.scene.pause(scene.scene.key);
    }
  }

  private resumePausedScenes(): void {
    for (const key of this.pausedScenes) {
      this.scene.resume(key);
    }
    this.pausedScenes = [];
  }

  private save(): void {
    const clean = sanitizeUsername(this.inputEl?.value);
    if (!clean) {
      this.errorText?.setText('Enter a username.');
      return;
    }
    const saved = setStoredUsername(clean);
    setRegistryValue(this.game, 'username', saved);
    this.scene.start('HomeScene');
  }
}
