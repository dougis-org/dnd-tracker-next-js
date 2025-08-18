import { Character } from '@/lib/validations/character';
import { ICharacter } from '@/lib/models/Character';

export function toClientCharacter(character: ICharacter): Character {
  return Character.parse(character.toObject());
}

export function toClientCharacters(characters: ICharacter[]): Character[] {
  return characters.map(toClientCharacter);
}
