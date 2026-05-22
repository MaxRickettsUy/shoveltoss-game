import Phaser from 'phaser';
import { setRegistryValue } from '../game/state';
import { sanitizeUsername, setStoredUsername } from '../game/storage';
import Button from '../ui/Button';
import { UI } from '../ui/theme';
import { addDomInput, addTitle, drawSceneBackground } from './helpers';

export default class UsernameScene extends Phaser.Scene {
  private inputEl?: HTMLInputElement;
  private errorText?: Phaser.GameObjects.Text;

  constructor() {
    super('UsernameScene');
  }

  create(): void {
    const { width, height } = this.scale;
    drawSceneBackground(this);
    addTitle(this, 'Choose Your Name', Math.max(76, height * 0.18));

    this.inputEl = addDomInput(this, width / 2, height * 0.42, Math.min(340, width - 44), '', 'Username');
    this.inputEl.focus();
    this.errorText = this.add
      .text(width / 2, height * 0.49, '', {
        fontFamily: UI.font,
        fontSize: '15px',
        color: '#ff8888'
      })
      .setOrigin(0.5);

    new Button(this, width / 2, height * 0.58, {
      label: 'Continue',
      variant: 'primary',
      width: Math.min(300, width - 64),
      onClick: () => this.save()
    });
    this.input.keyboard?.on('keydown-ENTER', this.save, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ENTER', this.save, this);
    });
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
