/**
 * Universal test utilities
 * Reduces code duplication across all test files in the project
 */

import { jest } from '@jest/globals';
import { containsTextIgnoreCase } from '../test-utils/secure-regexp';

/**
 * Standard mock factory functions
 */
export namespace MockFactory {
  export function createStandardMocks() {
    return {
      onChange: jest.fn(),
      onSubmit: jest.fn(),
      onClick: jest.fn(),
      onBlur: jest.fn(),
      onFocus: jest.fn(),
      onCancel: jest.fn(),
      onSave: jest.fn(),
      onDelete: jest.fn(),
      onEdit: jest.fn(),
      onUpdate: jest.fn(),
    };
  }

  export function createAsyncMocks(resolveValue: any = 'success') {
    return {
      onAsyncAction: jest.fn().mockResolvedValue(resolveValue),
      onAsyncSubmit: jest.fn().mockResolvedValue(resolveValue),
      onAsyncSave: jest.fn().mockResolvedValue(resolveValue),
      onAsyncLoad: jest.fn().mockResolvedValue(resolveValue),
    };
  }

  export function createErrorMocks(errorMessage: string = 'Test error') {
    return {
      onError: jest.fn().mockRejectedValue(new Error(errorMessage)),
      onAsyncError: jest.fn().mockRejectedValue(new Error(errorMessage)),
    };
  }
}

/**
 * Common test setup patterns
 */
export namespace TestSetup {
  export function standardBeforeEach() {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  }

  export function domBeforeEach() {
    beforeEach(() => {
      jest.clearAllMocks();
      document.body.innerHTML = '';
    });
  }

  export function fetchBeforeEach() {
    beforeEach(() => {
      jest.clearAllMocks();
      (global.fetch as jest.Mock)?.mockClear();
    });
  }

  export function consoleBeforeEach() {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
  }

  export function fullSetup() {
    beforeEach(() => {
      jest.clearAllMocks();
      document.body.innerHTML = '';
      (global.fetch as jest.Mock)?.mockClear();
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });
  }
}

/**
 * Data-driven testing utilities
 */
export namespace DataDrivenTesting {
  export interface TestCase<T = any> {
    name: string;
    input: T;
    expected: any;
    setup?: () => void;
    teardown?: () => void;
  }

  export function runTestCases<T>(
    testCases: TestCase<T>[],
    testFunction: (_input: T, _expected: any) => void | Promise<void>
  ) {
    testCases.forEach(({ name, input, expected, setup, teardown }) => {
      it(name, async () => {
        setup?.();
        await testFunction(input, expected);
        teardown?.();
      });
    });
  }

  export function createSuccessTestCases<T>(
    baseName: string,
    inputs: T[],
    expectedOutputs: any[]
  ): TestCase<T>[] {
    return inputs.map((input, index) => ({
      name: `${baseName} case ${index + 1}`,
      input,
      expected: expectedOutputs[index],
    }));
  }

  export function createErrorTestCases<T>(
    baseName: string,
    inputs: T[],
    expectedErrors: string[]
  ): TestCase<T>[] {
    return inputs.map((input, index) => ({
      name: `${baseName} error case ${index + 1}`,
      input,
      expected: expectedErrors[index],
    }));
  }
}

/**
 * Assertion helpers
 */
export namespace AssertionHelpers {
  export function expectElementInDocument(selector: string) {
    const element = document.querySelector(selector);
    expect(element).toBeInTheDocument();
    return element;
  }

  export function expectElementNotInDocument(selector: string) {
    const element = document.querySelector(selector);
    expect(element).not.toBeInTheDocument();
  }

  export function expectMockCalledWith(mock: jest.Mock, ...args: any[]) {
    expect(mock).toHaveBeenCalledWith(...args);
  }

  export function expectMockCalledTimes(mock: jest.Mock, times: number) {
    expect(mock).toHaveBeenCalledTimes(times);
  }

  export function expectAsyncSuccess(promise: Promise<any>, expectedValue?: any) {
    return expect(promise).resolves.toBe(expectedValue || expect.anything());
  }

  export function expectAsyncError(promise: Promise<any>, expectedError?: string) {
    if (expectedError) {
      return expect(promise).rejects.toThrow(expectedError);
    }
    return expect(promise).rejects.toThrow();
  }
}

/**
 * Common test patterns as higher-order functions
 */
export namespace TestPatterns {
  export function testComponentRendering(Component: React.ComponentType<any>, props = {}) {
    return () => {
      it('renders without crashing', () => {
        expect(() => {
          const { render } = require('@testing-library/react');
          const React = require('react');
          render(React.createElement(Component, props));
        }).not.toThrow();
      });
    };
  }

  export function testPropValidation(Component: React.ComponentType<any>, requiredProps: string[]) {
    return () => {
      requiredProps.forEach(prop => {
        it(`requires ${prop} prop`, () => {
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
          const { render } = require('@testing-library/react');
          const React = require('react');
          const invalidProps = { ...requiredProps.reduce((acc, p) => ({ ...acc, [p]: 'test' }), {}), [prop]: undefined };

          render(React.createElement(Component, invalidProps));

          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining(`Warning: Failed prop type`)
          );

          consoleSpy.mockRestore();
        });
      });
    };
  }

  export function testEventHandlers(Component: React.ComponentType<any>, eventTests: Array<{
    eventName: string;
    trigger: string;
    mockProp: string;
  }>) {
    return () => {
      eventTests.forEach(({ eventName, trigger, mockProp }) => {
        it(`handles ${eventName} event`, () => {
          const { render, fireEvent, screen } = require('@testing-library/react');
          const React = require('react');
          const mockHandler = jest.fn();
          const props = { [mockProp]: mockHandler };

          render(React.createElement(Component, props));

          const element = screen.getByRole(trigger) || screen.getByTestId(trigger);
          fireEvent[eventName](element);

          expect(mockHandler).toHaveBeenCalled();
        });
      });
    };
  }

  export function testLoadingStates(Component: React.ComponentType<any>, loadingProp: string = 'isLoading') {
    return () => {
      it('shows loading state when loading', () => {
        const { render, screen } = require('@testing-library/react');
        const React = require('react');
        render(React.createElement(Component, { [loadingProp]: true }));
        expect(screen.getByTestId('loading') || screen.getByText(/loading/i)).toBeInTheDocument();
      });

      it('hides loading state when not loading', () => {
        const { render, screen } = require('@testing-library/react');
        const React = require('react');
        render(React.createElement(Component, { [loadingProp]: false }));
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
    };
  }

  export function testErrorStates(Component: React.ComponentType<any>, errorProp: string = 'error') {
    return () => {
      it('shows error message when error exists', () => {
        const { render, screen } = require('@testing-library/react');
        const React = require('react');
        const errorMessage = 'Test error message';
        render(React.createElement(Component, { [errorProp]: errorMessage }));
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      it('hides error message when no error', () => {
        const { render, screen } = require('@testing-library/react');
        const React = require('react');
        render(React.createElement(Component, { [errorProp]: null }));
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      });
    };
  }
}

/**
 * Service testing utilities
 */
export namespace ServiceTesting {
  export function createMockResponse(data: any, success: boolean = true) {
    return {
      success,
      data: success ? data : null,
      error: success ? null : data,
      message: success ? 'Success' : 'Error',
    };
  }

  export function testServiceMethod(
    service: any,
    methodName: string,
    args: any[],
    expectedResponse: any
  ) {
    return async () => {
      const result = await service[methodName](...args);
      expect(result).toEqual(expectedResponse);
    };
  }

  export function testServiceError(
    service: any,
    methodName: string,
    args: any[],
    expectedError: string
  ) {
    return async () => {
      await expect(service[methodName](...args)).rejects.toThrow(expectedError);
    };
  }
}

/**
 * Component interaction testing utilities
 */
export namespace InteractionTesting {
  export function clickElement(selector: string) {
    const { fireEvent, screen } = require('@testing-library/react');
    // Use secure RegExp helper to prevent ReDoS vulnerabilities
    const element = screen.getByRole('button', { name: (content) => containsTextIgnoreCase(content, selector) }) ||
                   screen.getByTestId(selector) ||
                   screen.getByText((content) => containsTextIgnoreCase(content, selector));
    fireEvent.click(element);
    return element;
  }

  export function typeInInput(labelText: string, value: string) {
    const { fireEvent, screen } = require('@testing-library/react');
    // Use secure RegExp helper to prevent ReDoS vulnerabilities
    const input = screen.getByLabelText((content) => containsTextIgnoreCase(content, labelText));
    fireEvent.change(input, { target: { value } });
    return input;
  }

  export function selectOption(labelText: string, optionText: string) {
    const { fireEvent, screen } = require('@testing-library/react');
    // Use secure RegExp helper to prevent ReDoS vulnerabilities
    const select = screen.getByLabelText((content) => containsTextIgnoreCase(content, labelText));
    fireEvent.change(select, { target: { value: optionText } });
    return select;
  }

  export function submitForm(formSelector: string = 'form') {
    const { fireEvent } = require('@testing-library/react');
    const form = document.querySelector(formSelector);
    if (form) {
      fireEvent.submit(form);
    }
    return form;
  }
}

/**
 * API testing utilities
 */
export namespace APITesting {
  export function mockFetchSuccess(responseData: any) {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseData),
    });
  }

  export function mockFetchError(errorMessage: string, status: number = 500) {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ message: errorMessage }),
    });
  }

  export function expectFetchCalledWith(url: string, options?: any) {
    expect(global.fetch).toHaveBeenCalledWith(url, options);
  }
}