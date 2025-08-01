import { screen, fireEvent, waitFor } from '@testing-library/react';
import { containsTextIgnoreCase } from '../../../../../test-utils/secure-regexp';

/**
 * User interaction utilities for round tracking tests
 */

// Interaction testing utilities
export async function clickRoundButton(buttonName: RegExp | string) {
  const button = screen.getByRole('button', { name: buttonName });
  fireEvent.click(button);
  await waitFor(() => {
    expect(button).toBeInTheDocument();
  });
  return button;
}

export async function setRoundInput(value: string) {
  const input = screen.getByLabelText(/current round/i);
  fireEvent.change(input, { target: { value } });
  await waitFor(() => {
    expect(input).toHaveValue(parseInt(value, 10));
  });
  return input;
}

export async function clickEffectButton(effectName: string, action: 'remove' | 'view' = 'view') {
  const effectElement = screen.getByText(effectName);
  const button = effectElement.closest('[data-testid^="effect"]')?.querySelector(`[data-action="${action}"]`);
  if (button) {
    fireEvent.click(button);
    await waitFor(() => {
      expect(button).toBeInTheDocument();
    });
  }
  return button;
}

export async function activateTrigger(triggerName: string) {
  const activateButton = screen.getByRole('button', {
    name: (content) => containsTextIgnoreCase(content, `activate ${triggerName}`)
  });
  fireEvent.click(activateButton);
  await waitFor(() => {
    expect(activateButton).toBeInTheDocument();
  });
  return activateButton;
}