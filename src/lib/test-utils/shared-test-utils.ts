/**
 * Shared Test Utilities
 *
 * Generic testing utilities for React hooks and components.
 * These utilities are not data-specific and can be used across different test suites.
 */

/**
 * Async act helper for testing hook state changes
 * Provides a consistent way to handle asynchronous state updates in React hooks
 */
export async function actAsync(callback: () => Promise<void>) {
  const { act } = await import('@testing-library/react');
  await act(async () => {
    await callback();
  });
}

/**
 * Create mock React form event
 * Provides a consistent mock implementation for form events across tests
 */
export function createMockFormEvent(): React.FormEvent {
  return {
    preventDefault: jest.fn(),
  } as unknown as React.FormEvent;
}