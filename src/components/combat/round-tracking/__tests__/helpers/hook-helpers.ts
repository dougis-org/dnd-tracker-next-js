import { renderHook, act } from '@testing-library/react';
import { IEncounter } from '@/lib/models/encounter/interfaces';
import { createTestEncounter, makeEncounterActive } from '@/lib/models/encounter/__tests__/combat-test-helpers';
import { useRoundTracking } from '../../useRoundTracking';

/**
 * useRoundTracking specific test helpers to reduce duplication
 */

// useRoundTracking specific test helpers to reduce duplication
export function setupRoundTrackingTest(
  encounter?: IEncounter,
  onUpdate?: jest.Mock,
  options: any = {}
) {
  const mockEncounter = encounter || (() => {
    const enc = createTestEncounter();
    makeEncounterActive(enc);
    return enc;
  })();
  const mockOnUpdate = onUpdate || jest.fn();

  const useRoundTrackingWithDefaults = () =>
    useRoundTracking(mockEncounter, mockOnUpdate, { enableDebouncing: false, ...options });

  return {
    ...renderHook(() => useRoundTrackingWithDefaults()),
    mockEncounter,
    mockOnUpdate
  };
}

export function performRoundAction(result: any, action: string, ...args: any[]) {
  const { SecureActionDispatcher } = require('../../../../../test-utils/secure-method-calls');
  act(() => {
    SecureActionDispatcher.dispatchAction(result.current, action, ...args);
  });
}

export function assertRoundState(result: any, expectedRound: number, mockOnUpdate?: jest.Mock) {
  expect(result.current.currentRound).toBe(expectedRound);
  if (mockOnUpdate) {
    expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({
      currentRound: expectedRound,
    }));
  }
}

export function assertNoUpdate(mockOnUpdate: jest.Mock) {
  expect(mockOnUpdate).not.toHaveBeenCalled();
}

export function assertError(result: any, expectedError: string) {
  expect(result.current.error).toBe(expectedError);
}

export function assertNoError(result: any) {
  expect(result.current.error).toBeNull();
}