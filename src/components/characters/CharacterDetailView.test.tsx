/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import CharacterDetailView from './CharacterDetailView';
import {
  setupUserEvent,
  createBasicTestCharacter,
  createCharacterWithAbilityScores,
  createMulticlassCharacter,
  createCharacterWithSpells,
  createCharacterWithEquipment,
  createCharacterWithNotes,
  createCharacterWithBackstory,
  testTabNavigation,
  expectTextToBeVisible,
} from './__tests__/shared-test-utils';

describe('CharacterDetailView', () => {
  const mockOnEdit = jest.fn();
  const mockOnShare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderCharacterDetailView = (character: any) => {
    return render(
      <CharacterDetailView
        character={character}
        onEdit={mockOnEdit}
        onShare={mockOnShare}
      />
    );
  };

  it('should render character basic information', () => {
    const testCharacter = createBasicTestCharacter({
      name: 'Aragorn',
      classes: [{ class: 'ranger', level: 10, hitDie: 10 }],
    });

    renderCharacterDetailView(testCharacter);

    expectTextToBeVisible('Aragorn');
    expectTextToBeVisible('human • Level 10');
    expectTextToBeVisible('Edit Character');
    expectTextToBeVisible('Share');
  });

  it('should display character stats when available', () => {
    const testCharacter = createCharacterWithAbilityScores();
    renderCharacterDetailView(testCharacter);

    expectTextToBeVisible('Hit Points');
    expectTextToBeVisible('Armor Class');
    expectTextToBeVisible('Speed');
  });

  it('should render ability scores in stats section', async () => {
    const user = setupUserEvent();
    const testCharacter = createCharacterWithAbilityScores();

    renderCharacterDetailView(testCharacter);

    await testTabNavigation(user, 'Stats', [
      '16 (+3)', // STR
      '14 (+2)', // DEX
      '13 (+1)', // CON
      '12 (+1)', // INT
      '10 (+0)', // WIS
      '8 (-1)',  // CHA
    ]);
  });

  it('should render skills when character has proficiencies', async () => {
    const user = setupUserEvent();
    const testCharacter = createBasicTestCharacter({
      skills: new Map([
        ['Athletics', true],
        ['Stealth', true],
        ['Perception', false],
      ]),
      abilityScores: {
        strength: 16,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 15,
        charisma: 8,
      },
    });

    renderCharacterDetailView(testCharacter);

    await testTabNavigation(user, 'Stats', [
      'Athletics',
      'Stealth',
    ]);
  });

  it('should render spells grouped by level', async () => {
    const user = setupUserEvent();
    const testCharacter = createCharacterWithSpells(['fireball', 'magicMissile', 'shield']);

    renderCharacterDetailView(testCharacter);

    await testTabNavigation(user, 'Spells', [
      'Fireball',
      'Magic Missile',
      'Shield',
    ]);
  });

  it('should render equipment when character has items', async () => {
    const user = setupUserEvent();
    const testCharacter = createCharacterWithEquipment(['longsword', 'chainMail']);

    renderCharacterDetailView(testCharacter);

    await testTabNavigation(user, 'Equipment', [
      'Longsword',
      'Chain Mail',
    ]);
  });

  it('should render notes section when character has notes', async () => {
    const user = setupUserEvent();
    const testCharacter = createCharacterWithNotes();

    renderCharacterDetailView(testCharacter);

    await testTabNavigation(user, 'Notes', [
      'This is a test character with some notes.',
    ]);
  });

  it('should render backstory section when character has backstory', async () => {
    const user = setupUserEvent();
    const testCharacter = createCharacterWithBackstory();

    renderCharacterDetailView(testCharacter);

    await testTabNavigation(user, 'Notes', [
      'Born in a small village, this character has a rich history.',
    ]);
  });

  it('should display multiclass information correctly', () => {
    const testCharacter = createMulticlassCharacter();
    renderCharacterDetailView(testCharacter);

    expectTextToBeVisible('Fighter (Battle Master) - Level 3');
    expectTextToBeVisible('Rogue (Arcane Trickster) - Level 2');
  });

  it('should handle edit button click', () => {
    const testCharacter = createBasicTestCharacter();
    renderCharacterDetailView(testCharacter);

    const editButton = screen.getByText('Edit Character');
    editButton.click();

    expect(mockOnEdit).toHaveBeenCalledWith(testCharacter);
  });

  it('should handle share button click', () => {
    const testCharacter = createBasicTestCharacter();
    renderCharacterDetailView(testCharacter);

    const shareButton = screen.getByText('Share');
    shareButton.click();

    expect(mockOnShare).toHaveBeenCalledWith(testCharacter);
  });
});