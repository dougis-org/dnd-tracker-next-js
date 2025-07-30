/**
 * Shared test utilities for form components
 * Reduces code duplication across form test files
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { createSafeTestRegExp } from '../../../test-utils/secure-regexp';

/**
 * Standard form props factory
 */
export function createStandardFormProps(overrides = {}) {
  return {
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    onBlur: jest.fn(),
    onFocus: jest.fn(),
    errors: {},
    touched: {},
    isSubmitting: false,
    isLoading: false,
    ...overrides,
  };
}

/**
 * Standard validation test data factory
 */
export function createValidationTestData(fieldName: string, validValue: any, invalidValue: any, errorMessage: string) {
  return {
    fieldName,
    validValue,
    invalidValue,
    errorMessage,
  };
}

/**
 * Renders form component with standard props
 */
export function renderFormComponent(Component: React.ComponentType<any>, props = {}) {
  const standardProps = createStandardFormProps(props);
  const React = require('react');
  return render(React.createElement(Component, standardProps));
}

/**
 * Tests field rendering with proper attributes
 */
export function testFieldRendering(fieldName: string, labelText: string, fieldType: string = 'input') {
  // Use exact string match instead of RegExp to avoid security scanner warnings
  // getByLabelText supports both string and regex, but string is safer for literal matches
  const field = screen.getByLabelText(labelText, { exact: false });
  expect(field).toBeInTheDocument();
  expect(field).toHaveAttribute('name', fieldName);
  if (fieldType === 'input') {
    expect(field).toHaveAttribute('aria-required', 'true');
  }
  return field;
}

/**
 * Tests validation error display
 */
export function testValidationError(errorMessage: string) {
  expect(screen.getByText(errorMessage)).toBeInTheDocument();
  expect(screen.getByText(errorMessage)).toHaveClass('text-destructive');
}

/**
 * Tests field change interaction
 */
export function testFieldChange(field: HTMLElement, value: string, mockOnChange: jest.Mock) {
  fireEvent.change(field, { target: { value } });
  expect(mockOnChange).toHaveBeenCalled();
}

/**
 * Tests form submission
 */
export function testFormSubmission(formData: any, mockOnSubmit: jest.Mock) {
  const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
  fireEvent.click(submitButton);
  expect(mockOnSubmit).toHaveBeenCalledWith(formData);
}

/**
 * Data-driven field validation test generator
 */
export function createFieldValidationTests(fieldName: string, validationData: Array<{
  label: string;
  value: any;
  shouldBeValid: boolean;
  expectedError?: string;
}>) {
  return validationData.map(({ label, value, shouldBeValid, expectedError }) => ({
    name: `should ${shouldBeValid ? 'accept' : 'reject'} ${label}`,
    test: (Component: React.ComponentType<any>, fieldName: string) => {
      const mockOnChange = jest.fn();
      const props = shouldBeValid
        ? { [fieldName]: value, onChange: mockOnChange }
        : { [fieldName]: value, onChange: mockOnChange, errors: { [fieldName]: expectedError } };

      renderFormComponent(Component, props);

      if (shouldBeValid) {
        expect(screen.queryByText(expectedError || '')).not.toBeInTheDocument();
      } else {
        if (expectedError) {
          testValidationError(expectedError);
        }
      }
    }
  }));
}

/**
 * Character form specific test helpers
 */
export namespace CharacterFormHelpers {
  export function createCharacterFormProps(overrides = {}) {
    return createStandardFormProps({
      character: {
        name: '',
        race: '',
        characterClass: '',
        level: 1,
        hitPoints: 8,
        armorClass: 10,
        abilityScores: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        ...overrides.character,
      },
      ...overrides,
    });
  }

  export function testAbilityScoreField(abilityName: string, value: number, mockOnChange: jest.Mock) {
    // Use secure RegExp helper to prevent ReDoS vulnerabilities
    const field = screen.getByLabelText(createSafeTestRegExp(abilityName));
    fireEvent.change(field, { target: { value: value.toString() } });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        abilityScores: expect.objectContaining({
          [abilityName.toLowerCase()]: value,
        }),
      })
    );
  }

  export function testClassLevelFields(className: string, level: number, mockOnChange: jest.Mock) {
    const classField = screen.getByLabelText(/class/i);
    const levelField = screen.getByLabelText(/level/i);

    fireEvent.change(classField, { target: { value: className } });
    fireEvent.change(levelField, { target: { value: level.toString() } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        characterClass: className,
        level: level,
      })
    );
  }
}

/**
 * Encounter form specific test helpers
 */
export namespace EncounterFormHelpers {
  export function createEncounterFormProps(overrides = {}) {
    return createStandardFormProps({
      encounter: {
        name: '',
        description: '',
        difficulty: 'Medium',
        participants: [],
        ...overrides.encounter,
      },
      ...overrides,
    });
  }

  export function testParticipantField(participantData: any, mockOnChange: jest.Mock) {
    const nameField = screen.getByLabelText(/participant name/i);
    fireEvent.change(nameField, { target: { value: participantData.name } });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        participants: expect.arrayContaining([
          expect.objectContaining(participantData),
        ]),
      })
    );
  }
}

/**
 * UI component test helpers
 */
export namespace UITestHelpers {
  export function testComponentRendering(Component: React.ComponentType<any>, props = {}, expectedText?: string) {
    const React = require('react');
    render(React.createElement(Component, props, expectedText || 'Test Content'));
    if (expectedText) {
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    }
  }

  export function testCSSClasses(Component: React.ComponentType<any>, props = {}, expectedClasses: string[]) {
    const React = require('react');
    const { container } = render(React.createElement(Component, { 'data-testid': 'component', ...props }));
    const element = container.querySelector('[data-testid="component"]');
    expectedClasses.forEach(className => {
      expect(element).toHaveClass(className);
    });
  }

  export function testButtonInteraction(buttonText: string, onClick: jest.Mock) {
    // Use secure RegExp helper to prevent ReDoS vulnerabilities
    const button = screen.getByRole('button', { name: createSafeTestRegExp(buttonText) });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  }
}

/**
 * Service test helpers
 */
export namespace ServiceTestHelpers {
  export function createMockServiceResponse(success: boolean = true, data: any = null, error: string = '') {
    return {
      success,
      data,
      error,
      message: success ? 'Operation successful' : error,
    };
  }

  export function testServiceMethodCall(serviceMethod: jest.Mock, expectedArgs: any[], expectedResponse: any) {
    expect(serviceMethod).toHaveBeenCalledWith(...expectedArgs);
    expect(serviceMethod).toHaveResolvedWith(expectedResponse);
  }

  export function createCRUDTestSuite(serviceName: string, createData: any, updateData: any) {
    return {
      create: {
        name: `should create ${serviceName}`,
        args: [createData],
        expectedResult: createMockServiceResponse(true, { ...createData, id: 'test-id' }),
      },
      read: {
        name: `should read ${serviceName}`,
        args: ['test-id'],
        expectedResult: createMockServiceResponse(true, createData),
      },
      update: {
        name: `should update ${serviceName}`,
        args: ['test-id', updateData],
        expectedResult: createMockServiceResponse(true, { ...createData, ...updateData }),
      },
      delete: {
        name: `should delete ${serviceName}`,
        args: ['test-id'],
        expectedResult: createMockServiceResponse(true),
      },
    };
  }
}