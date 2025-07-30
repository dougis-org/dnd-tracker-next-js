/**
 * Common test interaction utilities to reduce code duplication
 */

import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSafeTestRegExp } from '../../../../../test-utils/secure-regexp';

// Common form interaction patterns
export const fillCharacterName = async (name: string) => {
  const nameField = screen.getByLabelText(/character name/i);
  await userEvent.clear(nameField);
  await userEvent.type(nameField, name);
  return nameField;
};

export const selectCharacterType = async (type: string) => {
  const typeField = screen.getByLabelText(/character type/i);
  await userEvent.selectOptions(typeField, type);
  return typeField;
};

export const selectRace = async (race: string) => {
  const raceField = screen.getByLabelText(/race/i);
  await userEvent.click(raceField);

  if (race === 'custom') {
    await userEvent.click(screen.getByText('Custom'));
  } else {
    const raceOption = screen.getByText(createSafeTestRegExp(race));
    await userEvent.click(raceOption);
  }
  return raceField;
};

export const fillCustomRace = async (customRaceName: string) => {
  const customRaceField = screen.getByLabelText(/custom race name/i);
  await userEvent.clear(customRaceField);
  await userEvent.type(customRaceField, customRaceName);
  return customRaceField;
};

export const selectSize = async (size: string) => {
  const sizeField = screen.getByLabelText(/size/i);
  await userEvent.click(sizeField);
  await userEvent.click(screen.getByText(createSafeTestRegExp(size)));
  return sizeField;
};

// Ability score interactions
export const fillAbilityScore = async (abilityName: string, value: number) => {
  const field = screen.getByLabelText(createSafeTestRegExp(abilityName));
  // Use fireEvent.change for number inputs to avoid concatenation issues
  fireEvent.change(field, { target: { value: value.toString() } });
  return field;
};

export const fillAllAbilityScores = async (scores: {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}) => {
  const fields = [];
  for (const [ability, score] of Object.entries(scores)) {
    const field = await fillAbilityScore(ability, score);
    fields.push(field);
  }
  return fields;
};

export const clickStandardArrayButton = async () => {
  const button = screen.getByRole('button', { name: /use standard array/i });
  await userEvent.click(button);
  return button;
};

export const clickRollDiceButton = async () => {
  const button = screen.getByRole('button', { name: /roll dice/i });
  await userEvent.click(button);
  return button;
};

export const togglePointBuy = async () => {
  const toggle = screen.getByLabelText(/use point buy/i);
  await userEvent.click(toggle);
  return toggle;
};

// Class interactions
export const selectCharacterClass = async (className: string, index: number = 0) => {
  const classFields = screen.getAllByLabelText(/character class/i);
  const classField = classFields[index];
  await userEvent.click(classField);
  await userEvent.click(screen.getByText(createSafeTestRegExp(className)));
  return classField;
};

export const setClassLevel = async (level: number, index: number = 0) => {
  const levelFields = screen.getAllByLabelText(/level/i);
  const levelField = levelFields[index];
  await userEvent.clear(levelField);
  await userEvent.type(levelField, level.toString());
  return levelField;
};

export const addCharacterClass = async () => {
  const addButton = screen.getByRole('button', { name: /add class/i });
  await userEvent.click(addButton);
  return addButton;
};

export const removeCharacterClass = async (index: number) => {
  const removeButtons = screen.getAllByRole('button').filter(button =>
    button.querySelector('.sr-only')?.textContent === 'Remove class'
  );
  await userEvent.click(removeButtons[index]);
  return removeButtons[index];
};

// Combat stats interactions
export const fillHitPoints = async (maxHp: number, currentHp?: number, tempHp?: number) => {
  const maxHpField = screen.getByLabelText(/maximum hp/i);
  await userEvent.tripleClick(maxHpField);
  await userEvent.keyboard(maxHp.toString());

  if (currentHp !== undefined) {
    const currentHpField = screen.getByLabelText(/current hp/i);
    await userEvent.tripleClick(currentHpField);
    await userEvent.keyboard(currentHp.toString());
  }

  if (tempHp !== undefined) {
    const tempHpField = screen.getByLabelText(/temporary hp/i);
    await userEvent.tripleClick(tempHpField);
    await userEvent.keyboard(tempHp.toString());
  }

  return {
    maxHp: maxHpField,
    currentHp: currentHp !== undefined ? screen.getByLabelText(/current hp/i) : undefined,
    tempHp: tempHp !== undefined ? screen.getByLabelText(/temporary hp/i) : undefined,
  };
};

export const fillArmorClass = async (ac: number) => {
  const acField = screen.getByLabelText(/armor class/i);
  await userEvent.clear(acField);
  await userEvent.type(acField, ac.toString());
  return acField;
};

export const fillSpeed = async (speed: number) => {
  const speedField = screen.getByLabelText(/speed/i);
  await userEvent.clear(speedField);
  await userEvent.type(speedField, speed.toString());
  return speedField;
};

export const fillProficiencyBonus = async (bonus: number) => {
  const bonusField = screen.getByLabelText(/proficiency bonus/i);
  await userEvent.clear(bonusField);
  await userEvent.type(bonusField, bonus.toString());
  return bonusField;
};

// Form submission and navigation
export const submitForm = async (buttonText: string = /create character/i) => {
  const submitButton = screen.getByRole('button', { name: buttonText });
  await userEvent.click(submitButton);
  return submitButton;
};

export const cancelForm = async () => {
  const cancelButton = screen.getByRole('button', { name: /cancel/i });
  await userEvent.click(cancelButton);
  return cancelButton;
};

export const closeModal = async () => {
  const user = userEvent.setup();
  await user.keyboard('{Escape}');
};

// Tab navigation
export const clickTab = async (tabName: string) => {
  const tab = screen.getByRole('tab', { name: tabName });
  await userEvent.click(tab);
  return tab;
};

// Search and filter interactions
export const searchTemplates = async (searchTerm: string) => {
  const searchInput = screen.getByPlaceholderText('Search by name or type...');
  await userEvent.type(searchInput, searchTerm);
  return searchInput;
};

// Common form filling patterns
export const fillBasicCharacterInfo = async (data: {
  name: string;
  type?: string;
  race?: string;
  customRace?: string;
  size?: string;
}) => {
  await fillCharacterName(data.name);

  if (data.type) {
    await selectCharacterType(data.type);
  }

  if (data.race) {
    await selectRace(data.race);
    if (data.race === 'custom' && data.customRace) {
      await fillCustomRace(data.customRace);
    }
  }

  if (data.size) {
    await selectSize(data.size);
  }
};

export const fillCompleteCharacterForm = async (data: {
  name: string;
  type?: string;
  race?: string;
  customRace?: string;
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  classes: Array<{ className: string; level: number }>;
  hitPoints: { maximum: number; current: number; temporary?: number };
  armorClass: number;
  speed?: number;
}) => {
  // Fill basic info
  await fillBasicCharacterInfo(data);

  // Fill ability scores
  await fillAllAbilityScores(data.abilityScores);

  // Fill classes
  if (data.classes.length > 0) {
    await selectCharacterClass(data.classes[0].className, 0);
    await setClassLevel(data.classes[0].level, 0);

    // Add additional classes
    for (let i = 1; i < data.classes.length; i++) {
      await addCharacterClass();
      await selectCharacterClass(data.classes[i].className, i);
      await setClassLevel(data.classes[i].level, i);
    }
  }

  // Fill combat stats
  await fillHitPoints(data.hitPoints.maximum, data.hitPoints.current, data.hitPoints.temporary);
  await fillArmorClass(data.armorClass);

  if (data.speed) {
    await fillSpeed(data.speed);
  }
};

// Trigger validation patterns
export const triggerFieldValidation = async (fieldGetter: () => HTMLElement) => {
  const field = fieldGetter();
  await userEvent.focus(field);
  await userEvent.blur(field);
  return field;
};

export const triggerFormValidation = async () => {
  const submitButton = screen.getByRole('button', { name: /create character/i });
  fireEvent.click(submitButton);
  return submitButton;
};