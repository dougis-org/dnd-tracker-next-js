/**
 * Common test assertion utilities to reduce code duplication
 */

import { screen, waitFor } from '@testing-library/react';
import { createSafeTestRegExp } from '../../../../../test-utils/secure-regexp';

// Common field validation assertions
export const expectFieldToBeRendered = (labelText: string | RegExp) => {
  const field = screen.getByLabelText(labelText);
  expect(field).toBeInTheDocument();
  return field;
};

export const expectFieldToBeRequired = (labelText: string | RegExp) => {
  const field = expectFieldToBeRendered(labelText);
  expect(field).toHaveAttribute('aria-required', 'true');
  return field;
};

export const expectFieldToHaveValue = (labelText: string | RegExp, value: string | number) => {
  const field = expectFieldToBeRendered(labelText);
  expect(field).toHaveValue(value);
  return field;
};

export const expectFieldToHaveError = (labelText: string | RegExp, errorMessage: string) => {
  const field = expectFieldToBeRendered(labelText);
  expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText(errorMessage)).toBeInTheDocument();
  return field;
};

export const expectFieldToHaveErrorRole = (errorMessage: string) => {
  const errorElement = screen.getByText(errorMessage);
  expect(errorElement).toHaveAttribute('role', 'alert');
  return errorElement;
};

// Form state assertions
export const expectFormToBeInLoadingState = (buttonText: string = /create character/i) => {
  const submitButton = screen.getByRole('button', { name: buttonText });
  expect(submitButton).toBeDisabled();
  expect(screen.getByText(/creating/i)).toBeInTheDocument();
};

export const expectFormToShowError = (errorMessage: string | RegExp) => {
  expect(screen.getByText(errorMessage)).toBeInTheDocument();
};

export const expectFormToBeSubmittable = (buttonText: string = /create character/i) => {
  const submitButton = screen.getByRole('button', { name: buttonText });
  expect(submitButton).toBeEnabled();
  return submitButton;
};

// Section rendering assertions
export const expectSectionToBeRendered = (sectionTitle: string) => {
  expect(screen.getByText(sectionTitle)).toBeInTheDocument();
};

export const expectSectionToHaveHeading = (headingText: string, level: string = '3') => {
  const heading = screen.getByRole('heading', { name: createSafeTestRegExp(headingText) });
  expect(heading).toHaveAttribute('aria-level', level);
  return heading;
};

// Ability score specific assertions
export const expectAbilityScoreFieldsToBeRendered = () => {
  const abilities = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
  const fields = abilities.map(ability =>
    expectFieldToBeRendered(createSafeTestRegExp(ability))
  );
  return fields;
};

export const expectAbilityScoreModifiersToBeDisplayed = (modifiers: Record<string, string>) => {
  Object.entries(modifiers).forEach(([_ability, modifier]) => {
    expect(screen.getByText(modifier)).toBeInTheDocument();
  });
};

export const expectAbilityScoreFieldsToHaveNumberAttributes = () => {
  const abilities = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
  abilities.forEach(ability => {
    const field = screen.getByLabelText(createSafeTestRegExp(ability));
    expect(field).toHaveAttribute('type', 'number');
    expect(field).toHaveAttribute('min', '1');
    expect(field).toHaveAttribute('max', '30');
    expect(field).toHaveAttribute('aria-required', 'true');
  });
};

// Class-related assertions
export const expectClassFieldsToBeRendered = () => {
  expect(screen.getByLabelText(/character class/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/level/i)).toBeInTheDocument();
};

export const expectTotalLevelToBeDisplayed = (totalLevel: number, classCount: number) => {
  expect(screen.getByText(`Total Level: ${totalLevel}`)).toBeInTheDocument();
  if (classCount === 1) {
    expect(screen.getByText('Single class')).toBeInTheDocument();
  } else {
    expect(screen.getByText(`${classCount} classes`)).toBeInTheDocument();
  }
};

export const expectClassToBeDisplayed = (className: string, level: number, index: number = 0) => {
  if (index === 0) {
    expect(screen.getByText('Class 1 (Primary)')).toBeInTheDocument();
  } else {
    expect(screen.getByText(`Class ${index + 1}`)).toBeInTheDocument();
  }
  expect(screen.getByText(className)).toBeInTheDocument();
  const levelFields = screen.getAllByLabelText(/level/i);
  expect(levelFields[index]).toHaveValue(level);
};

// Combat stats assertions
export const expectCombatStatsFieldsToBeRendered = () => {
  expect(screen.getByLabelText(/maximum hit points/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/current hit points/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/temporary hit points/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/armor class/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/speed/i)).toBeInTheDocument();
};

export const expectCombatStatsToHaveValues = (stats: {
  maxHp: number;
  currentHp: number;
  tempHp: number;
  ac: number;
  speed: number;
}) => {
  expect(screen.getByLabelText(/maximum hit points/i)).toHaveValue(stats.maxHp);
  expect(screen.getByLabelText(/current hit points/i)).toHaveValue(stats.currentHp);
  expect(screen.getByLabelText(/temporary hit points/i)).toHaveValue(stats.tempHp);
  expect(screen.getByLabelText(/armor class/i)).toHaveValue(stats.ac);
  expect(screen.getByLabelText(/speed/i)).toHaveValue(stats.speed);
};

// Character preview assertions
export const expectCharacterPreviewToBeRendered = () => {
  expect(screen.getByText('Character Preview')).toBeInTheDocument();
};

export const expectCharacterPreviewToShowValidState = () => {
  expect(screen.getByText('✓ Ready to create character')).toBeInTheDocument();
};

export const expectCharacterPreviewToShowInvalidState = () => {
  expect(screen.getByText('Complete all sections to enable creation')).toBeInTheDocument();
};

export const expectCharacterPreviewToShowSectionStatus = (section: string, isValid: boolean) => {
  const status = isValid ? '✓' : '⚠';
  expect(screen.getByText(`${status} ${section}`)).toBeInTheDocument();
};

// Service call assertions
export const expectCharacterServiceToBeCalledWith = (mockService: any, ownerId: string, expectedData: any) => {
  expect(mockService.createCharacter).toHaveBeenCalledWith(ownerId, expect.objectContaining(expectedData));
};

export const expectSuccessCallbackToBeCalled = (mockCallback: any, expectedData?: any) => {
  if (expectedData) {
    expect(mockCallback).toHaveBeenCalledWith(expectedData);
  } else {
    expect(mockCallback).toHaveBeenCalled();
  }
};

export const expectErrorCallbackToBeCalled = (mockCallback: any, expectedError?: any) => {
  if (expectedError) {
    expect(mockCallback).toHaveBeenCalledWith(expectedError);
  } else {
    expect(mockCallback).toHaveBeenCalled();
  }
};

// Async assertion helpers
export const waitForFormSubmission = async (mockService: any, timeout: number = 3000) => {
  await waitFor(() => {
    expect(mockService.createCharacter).toHaveBeenCalled();
  }, { timeout });
};

export const waitForLoadingState = async (timeout: number = 3000) => {
  await waitFor(() => {
    expect(screen.getByText(/creating/i)).toBeInTheDocument();
  }, { timeout });
};

export const waitForValidationError = async (errorMessage: string, timeout: number = 3000) => {
  await waitFor(() => {
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  }, { timeout });
};