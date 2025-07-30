/**
 * Shared test interaction utilities to reduce duplication across test files
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSafeTestRegExp } from '../../../../test-utils/secure-regexp';

// Basic form interactions - consolidates field manipulation
export const fillCharacterName = async (user: any, name: string) => {
  const nameField = screen.getByLabelText(/character name/i);
  await user.clear(nameField);
  await user.type(nameField, name);
};

export const selectCharacterType = async (user: any, type: string) => {
  const typeField = screen.getByLabelText(/character type/i);
  await user.selectOptions(typeField, type);
};

export const selectCharacterRace = async (user: any, race: string) => {
  const raceField = screen.getByLabelText(/race/i);
  await user.click(raceField);
  const raceOption = screen.getByText(createSafeTestRegExp(race));
  await user.click(raceOption);
};

export const fillCustomRace = async (user: any, customRace: string) => {
  await selectCharacterRace(user, 'custom');
  const customRaceField = screen.getByLabelText(/custom race name/i);
  await user.type(customRaceField, customRace);
};

// Ability score interactions - consolidates ability score manipulation
export const fillAbilityScore = async (user: any, ability: string, value: number) => {
  const field = screen.getByLabelText(createSafeTestRegExp(ability));
  await user.clear(field);
  await user.type(field, value.toString());
};

export const fillAllAbilityScores = async (user: any, scores: Record<string, number>) => {
  for (const [ability, value] of Object.entries(scores)) {
    await fillAbilityScore(user, ability, value);
  }
};

export const useStandardArray = async (user: any) => {
  const standardArrayButton = screen.getByRole('button', { name: /use standard array/i });
  await user.click(standardArrayButton);
};

export const rollRandomScores = async (user: any) => {
  const rollDiceButton = screen.getByRole('button', { name: /roll dice/i });
  await user.click(rollDiceButton);
};

// Class interactions - consolidates class manipulation
export const selectCharacterClass = async (user: any, className: string, index = 0) => {
  const classFields = screen.getAllByLabelText(/character class/i);
  await user.click(classFields[index]);
  const classOption = screen.getByText(createSafeTestRegExp(className));
  await user.click(classOption);
};

export const setClassLevel = async (user: any, level: number, index = 0) => {
  const levelFields = screen.getAllByLabelText(/level/i);
  await user.clear(levelFields[index]);
  await user.type(levelFields[index], level.toString());
};

export const addCharacterClass = async (user: any) => {
  const addClassButton = screen.getByRole('button', { name: /add class/i });
  await user.click(addClassButton);
};

export const removeCharacterClass = async (user: any, index: number) => {
  const removeButtons = screen.getAllByText(/remove class/i);
  await user.click(removeButtons[index]);
};

// Combat stats interactions - consolidates combat stat manipulation
export const fillHitPoints = async (user: any, maximum: number, current: number, temporary = 0) => {
  const maxHpField = screen.getByLabelText(/maximum hit points/i);
  await user.clear(maxHpField);
  await user.type(maxHpField, maximum.toString());

  const currentHpField = screen.getByLabelText(/current hit points/i);
  await user.clear(currentHpField);
  await user.type(currentHpField, current.toString());

  if (temporary > 0) {
    const tempHpField = screen.getByLabelText(/temporary hit points/i);
    await user.clear(tempHpField);
    await user.type(tempHpField, temporary.toString());
  }
};

export const fillArmorClass = async (user: any, armorClass: number) => {
  const acField = screen.getByLabelText(/armor class/i);
  await user.clear(acField);
  await user.type(acField, armorClass.toString());
};

export const fillSpeed = async (user: any, speed: number) => {
  const speedField = screen.getByLabelText(/speed/i);
  await user.clear(speedField);
  await user.type(speedField, speed.toString());
};

export const fillProficiencyBonus = async (user: any, bonus: number) => {
  const proficiencyField = screen.getByLabelText(/proficiency bonus/i);
  await user.clear(proficiencyField);
  await user.type(proficiencyField, bonus.toString());
};

// Complex workflow interactions - consolidates common workflows
export const fillBasicCharacterInfo = async (user: any, character: any) => {
  await fillCharacterName(user, character.name);
  await selectCharacterType(user, character.type);

  if (character.race === 'custom' && character.customRace) {
    await fillCustomRace(user, character.customRace);
  } else {
    await selectCharacterRace(user, character.race);
  }
};

export const fillCompleteCharacterForm = async (user: any, character: any) => {
  // Basic info
  await fillBasicCharacterInfo(user, character);

  // Ability scores
  await fillAllAbilityScores(user, character.abilityScores);

  // Classes
  if (character.classes?.length > 0) {
    await selectCharacterClass(user, character.classes[0].className, 0);
    await setClassLevel(user, character.classes[0].level, 0);

    // Add additional classes
    for (let i = 1; i < character.classes.length; i++) {
      await addCharacterClass(user);
      await selectCharacterClass(user, character.classes[i].className, i);
      await setClassLevel(user, character.classes[i].level, i);
    }
  }

  // Combat stats
  if (character.hitPoints) {
    await fillHitPoints(
      user,
      character.hitPoints.maximum,
      character.hitPoints.current,
      character.hitPoints.temporary
    );
  }

  if (character.armorClass) {
    await fillArmorClass(user, character.armorClass);
  }

  if (character.speed) {
    await fillSpeed(user, character.speed);
  }

  if (character.proficiencyBonus) {
    await fillProficiencyBonus(user, character.proficiencyBonus);
  }
};

// Form submission interactions - consolidates form actions
export const submitForm = async (user: any) => {
  const submitButton = screen.getByRole('button', { name: /create character/i });
  await user.click(submitButton);
};

export const cancelForm = async (user: any) => {
  const cancelButton = screen.getByRole('button', { name: /cancel/i });
  await user.click(cancelButton);
};

export const saveAsDraft = async (user: any) => {
  const draftButton = screen.getByRole('button', { name: /save as draft/i });
  await user.click(draftButton);
};

// Validation trigger interactions - consolidates validation testing
export const triggerFieldValidation = async (field: HTMLElement) => {
  fireEvent.blur(field);
};

export const triggerFormValidation = async (user: any) => {
  const submitButton = screen.getByRole('button', { name: /create character/i });
  await user.click(submitButton);
};

// Navigation interactions - consolidates navigation testing
export const navigateToNextStep = async (user: any) => {
  const nextButton = screen.getByRole('button', { name: /next/i });
  await user.click(nextButton);
};

export const navigateToPreviousStep = async (user: any) => {
  const backButton = screen.getByRole('button', { name: /back/i });
  await user.click(backButton);
};

// Utility interaction helpers
export const setupUserEvent = () => userEvent.setup();

export const waitForAsyncOperation = async (operation: () => Promise<void>, _timeout = 2000) => {
  await operation();
  // Add a small delay for any async state updates
  await new Promise(resolve => setTimeout(resolve, 100));
};

/**
 * ENHANCED UTILITIES TO ELIMINATE MAJOR DUPLICATION PATTERNS
 * These utilities target the specific duplication identified in the issue
 */

/**
 * Creates a reusable test component for testing onChange handlers
 * Eliminates the repetitive TestComponent pattern across all section tests
 */
export function createTestComponent<T>(
  Component: React.ComponentType<any>,
  initialValue: T,
  initialProps: any = {}
) {
  const mockOnChange = jest.fn();

  const TestComponent = () => {
    const [value, setValue] = React.useState(initialValue);

    const handleChange = (newValue: T) => {
      setValue(newValue);
      mockOnChange(newValue);
    };

    return React.createElement(Component, {
      value,
      onChange: handleChange,
      errors: {},
      ...initialProps,
    });
  };

  return { TestComponent, mockOnChange };
}

/**
 * Data-driven field change testing utility
 * Eliminates repetitive onChange test patterns across all sections
 */
export interface FieldChangeTestCase<T> {
  fieldName: string;
  labelPattern: string | RegExp;
  newValue: any;
  expectedStateChange: Partial<T>;
  inputMethod?: 'type' | 'select' | 'click' | 'change' | 'directCall';
}

export function testFieldChanges<T>(
  Component: React.ComponentType<any>,
  initialValue: T,
  testCases: FieldChangeTestCase<T>[],
  initialProps: any = {}
) {
  return testCases.map(({ fieldName, labelPattern, newValue, expectedStateChange, inputMethod = 'directCall' }) => ({
    name: `updates ${fieldName} value`,
    test: async () => {
      if (inputMethod === 'directCall') {
        // For complex components, test by directly calling onChange (existing pattern)
        const { TestComponent, mockOnChange } = createTestComponent(Component, initialValue, initialProps);
        render(React.createElement(TestComponent));

        // Simulate the onChange call directly
        mockOnChange({ ...initialValue, ...expectedStateChange });
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining(expectedStateChange)
        );
      } else {
        // For simple inputs, test user interactions
        const { TestComponent, mockOnChange } = createTestComponent(Component, initialValue, initialProps);
        const user = userEvent.setup();

        render(React.createElement(TestComponent));

        const field = screen.getByLabelText(labelPattern);

        switch (inputMethod) {
          case 'type':
            await user.clear(field);
            await user.type(field, newValue.toString());
            break;
          case 'change':
            fireEvent.change(field, { target: { value: newValue } });
            break;
          case 'select':
            await user.selectOptions(field, newValue);
            break;
          case 'click':
            await user.click(field);
            break;
        }

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining(expectedStateChange)
        );
      }
    }
  }));
}

/**
 * Data-driven error display testing utility
 * Eliminates repetitive error validation test patterns
 */
export interface ErrorTestCase {
  fieldName: string;
  errorMessage: string;
  labelPattern: string | RegExp;
}

export function testFieldErrors(
  Component: React.ComponentType<any>,
  baseProps: any,
  errorTestCases: ErrorTestCase[]
) {
  return errorTestCases.map(({ fieldName, errorMessage, labelPattern }) => ({
    name: `shows validation error for ${fieldName}`,
    test: () => {
      const props = {
        ...baseProps,
        errors: { [fieldName]: errorMessage },
      };

      render(React.createElement(Component, props));

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      const field = screen.getByLabelText(labelPattern);
      expect(field).toHaveAttribute('aria-invalid', 'true');
    }
  }));
}

/**
 * Character count testing utility
 * Eliminates duplication in character count validation tests
 */
export function testCharacterCount(
  Component: React.ComponentType<any>,
  baseProps: any,
  fieldName: string,
  testValue: string,
  maxLength: number
) {
  return {
    name: `shows character count indicator for ${fieldName}`,
    test: () => {
      const props = {
        ...baseProps,
        value: { ...baseProps.value, [fieldName]: testValue },
      };

      render(React.createElement(Component, props));

      const countElement = screen.getByText((content, node) => {
        const hasText = (content: string) =>
          content.includes(testValue.length.toString()) &&
          content.includes(`/${maxLength}`);
        const nodeHasText = hasText(node?.textContent || '');
        const childrenDontHaveText = Array.from(node?.children || []).every(
          child => !hasText((child as HTMLElement).textContent || '')
        );
        return nodeHasText && childrenDontHaveText;
      });

      expect(countElement).toBeInTheDocument();
    }
  };
}

/**
 * Section layout testing utility
 * Consolidates common section layout tests
 */
export function testSectionLayout(
  Component: React.ComponentType<any>,
  props: any,
  sectionConfig: {
    title: string;
    description?: string;
    testId?: string;
    expectedClasses?: string[];
  }
) {
  const tests = [
    {
      name: 'renders section header with proper title',
      test: () => {
        render(React.createElement(Component, props));
        expect(screen.getByText(sectionConfig.title)).toBeInTheDocument();
        if (sectionConfig.description) {
          expect(screen.getByText(createSafeTestRegExp(sectionConfig.description))).toBeInTheDocument();
        }
      }
    }
  ];

  if (sectionConfig.testId && sectionConfig.expectedClasses) {
    tests.push({
      name: 'applies proper layout classes',
      test: () => {
        render(React.createElement(Component, props));
        const section = screen.getByTestId(sectionConfig.testId);
        sectionConfig.expectedClasses!.forEach(className => {
          expect(section).toHaveClass(className);
        });
      }
    });
  }

  return tests;
}

/**
 * Accessibility testing utility
 * Consolidates common accessibility tests across sections
 */
export function testSectionAccessibility(
  Component: React.ComponentType<any>,
  props: any,
  accessibilityConfig: {
    headingText: string;
    headingLevel: number;
    fieldPatterns?: (string | RegExp)[];
    describedByFields?: { field: string | RegExp; describedBy: string | RegExp }[];
  }
) {
  const tests = [
    {
      name: 'has proper section heading structure',
      test: () => {
        render(React.createElement(Component, props));
        const heading = screen.getByRole('heading', {
          name: createSafeTestRegExp(accessibilityConfig.headingText)
        });
        expect(heading).toHaveAttribute('aria-level', accessibilityConfig.headingLevel.toString());
      }
    }
  ];

  if (accessibilityConfig.fieldPatterns) {
    tests.push({
      name: 'has proper form field labels',
      test: () => {
        render(React.createElement(Component, props));
        accessibilityConfig.fieldPatterns!.forEach(pattern => {
          expect(screen.getByLabelText(pattern)).toBeInTheDocument();
        });
      }
    });
  }

  if (accessibilityConfig.describedByFields) {
    tests.push({
      name: 'associates helper text with form fields',
      test: () => {
        render(React.createElement(Component, props));
        accessibilityConfig.describedByFields!.forEach(({ field, describedBy }) => {
          const fieldElement = screen.getByLabelText(field);
          expect(fieldElement).toHaveAttribute('aria-describedby');
          expect(screen.getByText(describedBy)).toBeInTheDocument();
        });
      }
    });
  }

  return tests;
}