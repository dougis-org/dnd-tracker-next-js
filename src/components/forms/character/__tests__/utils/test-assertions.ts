/**
 * Shared test assertion utilities to reduce duplication across test files
 */
import { screen } from '@testing-library/react';
import { createSafeTestRegExp } from '../../../../../test-utils/secure-regexp';

// Field validation assertions - replaces repeated field checking patterns
export const expectFieldToBeRequired = (field: HTMLElement) => {
  expect(field).toHaveAttribute('aria-required', 'true');
};

export const expectFieldToHaveError = (field: HTMLElement, errorMessage: string) => {
  expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText(createSafeTestRegExp(errorMessage))).toBeInTheDocument();
};

export const expectFieldToBeRendered = (labelPattern: string | RegExp) => {
  expect(screen.getByLabelText(labelPattern)).toBeInTheDocument();
};

export const expectFieldToHaveValue = (labelPattern: string | RegExp, value: string | number) => {
  const field = screen.getByLabelText(labelPattern);
  expect(field).toHaveValue(value);
};

// Form state assertions - consolidates form state checking
export const expectFormToBeInLoadingState = () => {
  expect(screen.getByText(/creating character/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /create character/i })).toBeDisabled();
};

export const expectFormToShowError = (errorMessage: string) => {
  expect(screen.getByText(createSafeTestRegExp(errorMessage))).toBeInTheDocument();
};

export const expectFormToShowSuccess = (successMessage: string) => {
  expect(screen.getByText(createSafeTestRegExp(successMessage))).toBeInTheDocument();
};

// Section-specific assertions - reduces section duplication
export const expectBasicInfoFieldsToBeRendered = () => {
  expectFieldToBeRendered(/character name/i);
  expectFieldToBeRendered(/character type/i);
  expectFieldToBeRendered(/race/i);
};

export const expectAbilityScoreFieldsToBeRendered = () => {
  const abilities = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
  abilities.forEach(ability => {
    expectFieldToBeRendered(createSafeTestRegExp(ability));
  });
};

export const expectClassFieldsToBeRendered = () => {
  expectFieldToBeRendered(/character class/i);
  expectFieldToBeRendered(/level/i);
};

export const expectCombatStatsFieldsToBeRendered = () => {
  expectFieldToBeRendered(/maximum hit points/i);
  expectFieldToBeRendered(/current hit points/i);
  expectFieldToBeRendered(/armor class/i);
  expectFieldToBeRendered(/speed/i);
};

// Character preview assertions - consolidates preview checking
export const expectCharacterPreviewToShowValidState = (character: any) => {
  expect(screen.getByText('Character Preview')).toBeInTheDocument();
  expect(screen.getByText(character.name)).toBeInTheDocument();
  expect(screen.getByText(createSafeTestRegExp(character.race))).toBeInTheDocument();
};

export const expectCharacterPreviewToShowInvalidState = () => {
  expect(screen.getByText(/character validation/i)).toBeInTheDocument();
  expect(screen.getByText(/please fix the following issues/i)).toBeInTheDocument();
};

// Service call assertions - consolidates service checking
export const expectCharacterServiceToBeCalledWith = (mockService: any, expectedData: any) => {
  expect(mockService.create).toHaveBeenCalledWith(
    expect.objectContaining(expectedData)
  );
};

export const expectCharacterServiceNotToBeCalled = (mockService: any) => {
  expect(mockService.create).not.toHaveBeenCalled();
};

// Component rendering assertions - consolidates rendering checks
export const expectSectionHeaderToBeRendered = (title: string, description?: string) => {
  expect(screen.getByText(title)).toBeInTheDocument();
  if (description) {
    expect(screen.getByText(createSafeTestRegExp(description))).toBeInTheDocument();
  }
};

export const expectButtonsToBeRendered = (buttonNames: (string | RegExp)[]) => {
  buttonNames.forEach(buttonName => {
    expect(screen.getByRole('button', { name: buttonName })).toBeInTheDocument();
  });
};

// Accessibility assertions - consolidates a11y checks
export const expectProperHeadingStructure = (headingText: string, level: number) => {
  const heading = screen.getByRole('heading', { name: createSafeTestRegExp(headingText) });
  expect(heading).toHaveAttribute('aria-level', level.toString());
};

export const expectFieldsToHaveProperLabels = (fieldPatterns: (string | RegExp)[]) => {
  fieldPatterns.forEach(pattern => {
    expect(screen.getByLabelText(pattern)).toBeInTheDocument();
  });
};

// List/array assertions - consolidates list checking
export const expectListToContainItems = (items: string[], _itemType = 'listitem') => {
  items.forEach(item => {
    expect(screen.getByText(item)).toBeInTheDocument();
  });
};

export const expectEmptyStateToBeRendered = (emptyMessage: string) => {
  expect(screen.getByText(createSafeTestRegExp(emptyMessage))).toBeInTheDocument();
};