/**
 * Shared interaction helpers to reduce duplication in user interaction tests
 */
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

// Common button click helper
export const clickButton = async (buttonText: string | RegExp) => {
  const user = userEvent.setup();
  // Try to find button first, then menuitem if not found
  let element;
  try {
    // For case-insensitive string matching, convert to RegExp
    const searchPattern = typeof buttonText === 'string' 
      ? new RegExp(buttonText, 'i') 
      : buttonText;
    element = screen.getByRole('button', { name: searchPattern });
  } catch {
    // For case-insensitive string matching, convert to RegExp
    const searchPattern = typeof buttonText === 'string' 
      ? new RegExp(buttonText, 'i') 
      : buttonText;
    element = screen.getByRole('menuitem', { name: searchPattern });
  }
  await user.click(element);
  return element;
};

// Common checkbox interaction helper
export const clickCheckbox = async (testId?: string) => {
  const user = userEvent.setup();
  const checkbox = testId
    ? screen.getByTestId(testId)
    : screen.getByRole('checkbox');
  await user.click(checkbox);
  return checkbox;
};

// Common dropdown interaction helper
export const openDropdown = async (triggerText: string | RegExp) => {
  const user = userEvent.setup();
  const trigger = screen.getByRole('button', { name: triggerText });
  await user.click(trigger);
  return trigger;
};

// Common rapid clicking helper
export const performRapidClicks = async (element: HTMLElement, count: number = 3) => {
  const user = userEvent.setup();
  for (let i = 0; i < count; i++) {
    await user.click(element);
  }
};

// Common text input helper
export const typeInInput = async (placeholder: string | RegExp, text: string) => {
  const user = userEvent.setup();
  const input = screen.getByPlaceholderText(placeholder);
  await user.type(input, text);
  return input;
};

// Common assertion helper for function calls
export const expectFunctionToBeCalled = (mockFn: jest.Mock, times: number = 1, withArgs?: any) => {
  expect(mockFn).toHaveBeenCalledTimes(times);
  if (withArgs !== undefined) {
    expect(mockFn).toHaveBeenCalledWith(withArgs);
  }
};

// Common helper for dialog interaction patterns
export const openDialogAndPerformAction = async (
  openButtonText: string | RegExp,
  actionButtonText: string | RegExp
) => {
  await clickButton(openButtonText);
  await clickButton(actionButtonText);
};