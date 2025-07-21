import { createMockCharacter } from '@/lib/services/__tests__/CharacterService.test-helpers';

// Common spell data to reduce duplication
export const mockSpells = {
  fireball: {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: 'V, S, M',
    duration: 'Instantaneous',
    description: 'A bright streak flashes from your pointing finger to a point you choose within range.',
    isPrepared: true,
  },
  magicMissile: {
    name: 'Magic Missile',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'You create three glowing darts of magical force.',
    isPrepared: true,
  },
  shield: {
    name: 'Shield',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 reaction',
    range: 'Self',
    components: 'V, S',
    duration: '1 round',
    description: 'An invisible barrier of magical force appears and protects you.',
    isPrepared: false,
  },
};

// Common equipment data
export const mockEquipment = {
  longsword: {
    name: 'Longsword',
    quantity: 1,
    weight: 3,
    value: 15,
    equipped: true,
    magical: false,
  },
  chainMail: {
    name: 'Chain Mail',
    quantity: 1,
    weight: 55,
    value: 75,
    equipped: true,
    magical: false,
  },
};

// Helper to create character with spells
export const createCharacterWithSpells = (spellNames: (keyof typeof mockSpells)[]) => {
  const spells = spellNames.map(name => mockSpells[name]);
  return createMockCharacter({
    name: 'Test Character',
    spells,
    abilityScores: {
      strength: 16,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    },
  });
};

// Helper to create character with equipment
export const createCharacterWithEquipment = (equipmentNames: (keyof typeof mockEquipment)[]) => {
  const equipment = equipmentNames.map(name => mockEquipment[name]);
  return createMockCharacter({
    name: 'Test Character',
    equipment,
    abilityScores: {
      strength: 16,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    },
  });
};