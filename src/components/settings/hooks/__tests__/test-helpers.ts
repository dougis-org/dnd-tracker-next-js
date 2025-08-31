import { act, renderHook } from '@testing-library/react';
import { useSettingsForm } from '../useSettingsForm';

export const createMockEvent = (): React.FormEvent => ({
  preventDefault: jest.fn(),
} as unknown as React.FormEvent);

export const createMockUser = () => ({
  id: '1',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
  primaryEmailAddress: { emailAddress: 'test@example.com' },
  firstName: 'Test',
  lastName: 'User',
  fullName: 'Test User',
});

export const createMockUserReturn = (user: any = createMockUser()) => ({
  user,
  isLoaded: true,
  isSignedIn: true,
});

export const createAsyncPromise = () => {
  let resolvePromise: (_value: any) => void;
  const promise = new Promise(resolve => {
    resolvePromise = resolve;
  });
  return { promise, resolvePromise: resolvePromise! };
};

export const expectSuccessMessage = (result: any) => {
  expect(result.current.message).toEqual({
    type: 'success',
    text: 'Settings saved successfully',
  });
};

export const expectErrorMessage = (result: any) => {
  expect(result.current.message).toEqual({
    type: 'error',
    text: 'Failed to save settings. Please try again.',
  });
};

export const expectValidationErrors = (result: any, errors: { name?: string; email?: string }) => {
  expect(result.current.formErrors).toEqual(errors);
};

export const actAsync = async (callback: () => Promise<void>) => {
  await act(async () => {
    await callback();
  });
};

// Test setup helpers
export const setupUseSettingsFormTest = () => {
  const mockEvent = createMockEvent();
  const mockUser = createMockUserReturn();
  return { mockEvent, mockUser };
};

// Common test data patterns
export const createProfileDataWith = (overrides: Partial<{ name: string; email: string }> = {}) => ({
  name: 'Test User',
  email: 'test@example.com',
  ...overrides,
});

export const createValidationErrors = (errors: { name?: string; email?: string }) => errors;

// Common assertion helpers
export const expectNoApiCall = (mockFn: jest.MockedFunction<any>) => {
  expect(mockFn).not.toHaveBeenCalled();
};

export const expectApiCallWith = (mockFn: jest.MockedFunction<any>, userId: string, data: any) => {
  expect(mockFn).toHaveBeenCalledWith(userId, data);
};

export const expectLoadingState = (result: any, field: 'profile' | 'notifications', isLoading: boolean) => {
  const loadingField = field === 'profile' ? 'isLoadingProfile' : 'isLoadingNotifications';
  expect(result.current[loadingField]).toBe(isLoading);
};

// Helper for testing form submission patterns
export const testFormSubmission = async (
  submissionType: 'profile' | 'notifications',
  mockUpdateUser: jest.MockedFunction<any>,
  expectSuccess = true
) => {
  if (expectSuccess) {
    mockUpdateUser.mockResolvedValue({ success: true });
  } else {
    mockUpdateUser.mockRejectedValue(new Error('API Error'));
  }

  const { result } = renderHook(() => useSettingsForm());
  const { mockEvent } = setupUseSettingsFormTest();

  const submitHandler = submissionType === 'profile'
    ? result.current.handleProfileSubmit
    : result.current.handleNotificationsSubmit;

  await actAsync(async () => {
    await submitHandler(mockEvent);
  });

  expect(mockEvent.preventDefault).toHaveBeenCalled();

  if (expectSuccess) {
    expectSuccessMessage(result);
  } else {
    expectErrorMessage(result);
  }

  return { result, mockEvent };
};

// Helper for testing loading states during submission
export const testLoadingDuringSubmission = async (
  submissionType: 'profile' | 'notifications',
  mockUpdateUser: jest.MockedFunction<any>
) => {
  const { promise, resolvePromise } = createAsyncPromise();
  mockUpdateUser.mockReturnValue(promise);

  const { result } = renderHook(() => useSettingsForm());
  const { mockEvent } = setupUseSettingsFormTest();

  const submitHandler = submissionType === 'profile'
    ? result.current.handleProfileSubmit
    : result.current.handleNotificationsSubmit;

  act(() => {
    submitHandler(mockEvent);
  });

  expectLoadingState(result, submissionType, true);

  await act(async () => {
    resolvePromise({ success: true });
    await promise;
  });

  expectLoadingState(result, submissionType, false);
  return result;
};

// Helper for validation testing
export const testValidationError = async (
  profileData: { name: string; email: string },
  expectedField: 'name' | 'email',
  expectedError: string
) => {
  const { result } = renderHook(() => useSettingsForm());

  act(() => {
    result.current.setProfileData(profileData);
  });

  const { mockEvent } = setupUseSettingsFormTest();

  await actAsync(async () => {
    await result.current.handleProfileSubmit(mockEvent);
  });

  expect(result.current.formErrors[expectedField]).toBe(expectedError);
  return result;
};