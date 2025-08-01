/**
 * Comprehensive BatchActions test utilities
 * Eliminates ALL code duplication across BatchActions test files
 */

import { createMockToast } from './mockSetup';
import { COMMON_TEST_ENCOUNTERS } from './batchActionsSharedMocks';
import { expectCallbacksInvoked, expectErrorToast } from './testSetup';

// === SHARED MOCK SETUP ===

export const createBatchTestMocks = () => {
  const mockToast = createMockToast();
  const mockFetch = jest.fn();
  global.fetch = mockFetch;
  return { mockToast, mockFetch };
};

export const createToastMock = (mockToast: jest.Mock) => () => ({
  useToast: () => ({ toast: mockToast }),
});

export const createUtilsMock = () => () => ({
  getEncounterText: jest.fn((count: number) =>
    `${count} encounter${count !== 1 ? 's' : ''}`
  ),
});

export const createErrorUtilsMock = () => () => ({
  createSuccessHandler: jest.fn((toast) => jest.fn((action, target) => {
    toast({
      title: `Encounter ${action}d`,
      description: `"${target}" has been ${action}d successfully.`,
    });
  })),
  createErrorHandler: jest.fn((toast) => jest.fn((action) => {
    toast({
      title: 'Error',
      description: `Failed to ${action} encounter. Please try again.`,
      variant: 'destructive',
    });
  })),
});

// === SHARED API HELPERS ===

export interface BatchApiOptions {
  operation?: string;
  statusCode?: number;
  errorMessage?: string;
  successful?: number;
  failed?: number;
}

const createApiResponse = (operation: string, successful: number, failed: number) => ({
  success: true,
  operation,
  results: Array.from({ length: successful }, (_, i) => ({
    encounterId: `enc${i + 1}`,
    status: 'success',
  })),
  errors: failed > 0 ? Array.from({ length: failed }, (_, i) => ({
    encounterId: `enc${successful + i + 1}`,
    status: 'error',
    error: 'Access denied',
  })) : [],
  summary: { totalProcessed: successful + failed, successful, failed },
});

const mockApiCall = (response: any) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce(response);
};

export const mockSuccessApi = ({ operation = 'duplicate', successful = 3, failed = 0 }: BatchApiOptions = {}) => {
  mockApiCall({
    ok: true,
    json: async () => createApiResponse(operation, successful, failed),
  });
};

export const mockPartialFailureApi = ({ operation = 'duplicate', successful = 2, failed = 1 }: BatchApiOptions = {}) => {
  mockApiCall({
    ok: true,
    json: async () => createApiResponse(operation, successful, failed),
  });
};

export const mockErrorApi = ({ statusCode = 500, errorMessage = 'Server error' }: BatchApiOptions = {}) => {
  mockApiCall({
    ok: false,
    status: statusCode,
    json: async () => ({ error: errorMessage }),
  });
};

export const mockNetworkError = (errorMessage = 'Network error') => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));
};

// === SHARED EXPECTATIONS ===

export const expectApiCall = (operation: string, encounterIds = COMMON_TEST_ENCOUNTERS) => {
  expect(global.fetch).toHaveBeenCalledWith('/api/encounters/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, encounterIds, options: {} }),
  });
};

export const expectSuccessResult = (
  mockToast: jest.Mock,
  operation: string,
  count = 3,
  onClearSelection: jest.Mock,
  onRefetch: jest.Mock
) => {
  if (count === 1) {
    expect(mockToast).toHaveBeenCalledWith({
      title: `Encounter ${operation}d`,
      description: 'Encounter archived successfully.',
    });
  } else {
    expect(mockToast).toHaveBeenCalledWith({
      title: `Encounters ${operation}d`,
      description: `${count} encounters have been ${operation}d successfully.`,
    });
  }
  expectCallbacksInvoked(onClearSelection, onRefetch);
};

export const expectPartialResult = (
  mockToast: jest.Mock,
  operation: string,
  successful = 2,
  failed = 1,
  onClearSelection: jest.Mock,
  onRefetch: jest.Mock
) => {
  expect(mockToast).toHaveBeenCalledWith({
    title: "Partial Success",
    description: `${successful} encounters ${operation}d successfully, ${failed} failed.`,
  });
  expectCallbacksInvoked(onClearSelection, onRefetch);
};

export const expectEmptyError = (mockToast: jest.Mock, operation: string) => {
  expect(global.fetch).not.toHaveBeenCalled();
  expectErrorToast(mockToast, `No encounters selected for ${operation}.`);
};

// === SHARED TEST EXECUTION ===

export const clickOperation = async (
  operation: string,
  clickButtonFn: (_selector: string | RegExp) => Promise<void>,
  isDelete = false
) => {
  if (isDelete) {
    await clickButtonFn(/delete/i);
    await clickButtonFn('Delete');
  } else {
    // Use exact case matching for button text
    const capitalizedOperation = operation.charAt(0).toUpperCase() + operation.slice(1);
    await clickButtonFn(capitalizedOperation);
  }
};

export const runBatchTest = async (
  operation: string,
  setupFn: () => void,
  renderFn: () => any,
  clickButtonFn: (_selector: string | RegExp) => Promise<void>,
  waitForFn: (_callback: () => void) => Promise<void>,
  verifyFn: () => void,
  isDelete = false
) => {
  setupFn();
  renderFn();
  await clickOperation(operation, clickButtonFn, isDelete);
  await waitForFn(verifyFn);
};

export const runSuccessTest = async (
  operation: string,
  setupFn: () => void,
  renderFn: () => any,
  clickButtonFn: (_selector: string | RegExp) => Promise<void>,
  waitForFn: (_callback: () => void) => Promise<void>,
  mockToast: jest.Mock,
  onClearSelection: jest.Mock,
  onRefetch: jest.Mock,
  isDelete = false
) => {
  await runBatchTest(
    operation,
    setupFn,
    renderFn,
    clickButtonFn,
    waitForFn,
    () => expectApiCall(operation),
    isDelete
  );
  await waitForFn(() => expectSuccessResult(mockToast, operation, 3, onClearSelection, onRefetch));
};

export const runErrorTest = async (
  operation: string,
  errorMessage: string,
  setupFn: () => void,
  renderFn: () => any,
  clickButtonFn: (_selector: string | RegExp) => Promise<void>,
  waitForFn: (_callback: () => void) => Promise<void>,
  mockToast: jest.Mock,
  isDelete = false
) => {
  await runBatchTest(
    operation,
    setupFn,
    renderFn,
    clickButtonFn,
    waitForFn,
    () => expectErrorToast(mockToast, errorMessage),
    isDelete
  );
};