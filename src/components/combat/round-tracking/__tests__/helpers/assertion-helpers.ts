import { screen } from '@testing-library/react';
import { MockEffect, MockTrigger, MockSessionSummary } from './test-data';

/**
 * Assertion utilities for round tracking tests
 */

// Assertion utilities
export function expectRoundDisplay(round: number) {
  expect(screen.getByText(`Round ${round}`)).toBeInTheDocument();
}

export function expectEffectDisplay(effect: MockEffect, remainingDuration?: number) {
  expect(screen.getByText(effect.name)).toBeInTheDocument();
  if (remainingDuration !== undefined) {
    expect(screen.getByText(`${remainingDuration} rounds`)).toBeInTheDocument();
  }
}

export function expectTriggerDisplay(trigger: MockTrigger) {
  expect(screen.getByText(trigger.name)).toBeInTheDocument();
  expect(screen.getByText(`Round ${trigger.triggerRound}`)).toBeInTheDocument();
}

export function expectDurationDisplay(formatted: string) {
  expect(screen.getByText(new RegExp(formatted, 'i'))).toBeInTheDocument();
}

export function expectHistoryEntry(round: number, event: string) {
  const historySection = screen.getByText('Round History').closest('[data-testid="history-section"]');
  if (historySection) {
    expect(historySection).toHaveTextContent(`Round ${round}`);
    expect(historySection).toHaveTextContent(event);
  } else {
    expect(screen.getByText(`Round ${round}`)).toBeInTheDocument();
    expect(screen.getByText(event)).toBeInTheDocument();
  }
}

export function expectSessionSummary(summary: MockSessionSummary) {
  expect(screen.getByText(`${summary.totalRounds} rounds`)).toBeInTheDocument();

  if (summary.totalDuration) {
    const minutes = Math.floor(summary.totalDuration / 60);
    expect(screen.getByText(`${minutes}m total`)).toBeInTheDocument();
  }

  if (summary.totalActions) {
    expect(screen.getByText(`${summary.totalActions} actions`)).toBeInTheDocument();
  }
}

// Error testing utilities
export function expectErrorMessage(message: string) {
  expect(screen.getByText(message)).toBeInTheDocument();
}

export function expectNoError() {
  const errorElements = screen.queryAllByRole('alert');
  const errorTexts = errorElements.map(el => el.textContent);
  expect(errorTexts.filter(text => text && text.includes('error'))).toHaveLength(0);
}

// Accessibility testing utilities
export function expectAccessibleRoundControls() {
  expect(screen.getByRole('button', { name: /next round/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /previous round/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /edit round/i })).toBeInTheDocument();
}

export function expectAccessibleEffectLabels(effects: MockEffect[]) {
  effects.forEach(effect => {
    const labelRegex = new RegExp(`${effect.name} effect`, 'i');
    expect(screen.getByLabelText(labelRegex)).toBeInTheDocument();
  });
}

export function expectAccessibleTriggerLabels(triggers: MockTrigger[]) {
  triggers.forEach(trigger => {
    if (trigger.isActive) {
      const buttonRegex = new RegExp(`activate ${trigger.name}`, 'i');
      expect(screen.getByRole('button', { name: buttonRegex })).toBeInTheDocument();
    }
  });
}

// Data validation utilities
export function validateRoundNumber(round: number): boolean {
  return Number.isInteger(round) && round >= 1;
}