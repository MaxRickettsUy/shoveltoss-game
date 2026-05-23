import type { CharacterId } from './types';

export interface CharacterDefinition {
  id: CharacterId;
  hero: string;
  sprite: string;
  frameWidth: number;
  frameHeight: number;
}

export const CHARACTERS: CharacterDefinition[] = [
  { id: 'Alexsama', hero: 'assets/character/alexsama/hero.png', sprite: 'assets/character/alexsama/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 738 },
  { id: 'Anheuser', hero: 'assets/character/anheuser/hero.png', sprite: 'assets/character/anheuser/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 887 },
  { id: 'Assman', hero: 'assets/character/assman/hero.png', sprite: 'assets/character/assman/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 572 },
  { id: 'Buck', hero: 'assets/character/buck/hero.png', sprite: 'assets/character/buck/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 693 },
  { id: 'Billie', hero: 'assets/character/billie/hero.png', sprite: 'assets/character/billie/sprite-sheet.png', frameWidth: 2500 / 3, frameHeight: 761 },
  { id: 'Chef', hero: 'assets/character/chef/hero.png', sprite: 'assets/character/chef/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 724 },
  { id: 'Chuggo', hero: 'assets/character/chuggo/hero.png', sprite: 'assets/character/chuggo/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 724 },
  { id: 'Cowgirl', hero: 'assets/character/cowgirl/hero.png', sprite: 'assets/character/cowgirl/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 836 },
  { id: 'Gucci', hero: 'assets/character/gucci/hero.png', sprite: 'assets/character/gucci/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 724 },
  { id: 'Inspector', hero: 'assets/character/inspector/hero.png', sprite: 'assets/character/inspector/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 724 },
  { id: 'Luchador', hero: 'assets/character/luchador/hero.png', sprite: 'assets/character/luchador/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 724 },
  { id: 'Maria', hero: 'assets/character/maria/hero.png', sprite: 'assets/character/maria/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 724 },
  { id: 'Ore', hero: 'assets/character/ore/hero.png', sprite: 'assets/character/ore/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 724 },
  { id: 'Patriot', hero: 'assets/character/patriot/hero.png', sprite: 'assets/character/patriot/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 731 },
  { id: 'Seaman', hero: 'assets/character/seaman/hero.png', sprite: 'assets/character/seaman/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 946 },
  { id: 'Shrek', hero: 'assets/character/shrek/hero.png', sprite: 'assets/character/shrek/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 724 },
  { id: 'Smokey', hero: 'assets/character/smokey/hero.png', sprite: 'assets/character/smokey/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 728 },
  { id: 'Wagie', hero: 'assets/character/wagie/hero.png', sprite: 'assets/character/wagie/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 657 },
  { id: 'WD40', hero: 'assets/character/wd40/hero.png', sprite: 'assets/character/wd40/sprite-sheet.png', frameWidth: 2500 / 3, frameHeight: 724 },
  { id: 'Xena', hero: 'assets/character/xena/hero.png', sprite: 'assets/character/xena/sprite-sheet.png', frameWidth: 2172 / 3, frameHeight: 705 }
];

export const CHAMPION_IDS = new Set<CharacterId>(['Alexsama', 'Buck', 'Wagie', 'Chef', 'Chuggo']);
export const NEW_CHARACTER_IDS = new Set<CharacterId>(['Gucci', 'Inspector']);
export const LADY_CHARACTER_IDS = new Set<CharacterId>(['Anheuser', 'Billie', 'Cowgirl', 'Maria', 'Smokey', 'Xena']);
