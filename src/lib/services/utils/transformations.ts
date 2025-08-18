import { Character, characterSchema } from '@/lib/validations/character';
import { ICharacter } from '@/lib/models/Character';

export function toClientCharacter(character: ICharacter): Character {
  return characterSchema.parse(character.toObject());
}

export function toClientCharacters(characters: ICharacter[]): Character[] {
  return characters.map(toClientCharacter);
}
