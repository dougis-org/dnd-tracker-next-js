import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { createMockSession as createMockSessionBase } from '@/lib/test-utils/shared-api-test-helpers';

export const TEST_USER_ID = '123';
export const TEST_EMAIL = 'test@example.com';

export const createMockRouter = () => ({
  push: jest.fn(),
});

export const createMockSession = (overrides: any = {}) => ({
  ...createMockSessionBase(overrides.user?.id || TEST_USER_ID),
  user: {
    ...createMockSessionBase(overrides.user?.id || TEST_USER_ID).user,
    name: 'John Doe',
    ...overrides.user,
  },
  ...overrides,
});

export const mockSessionHook = (session: any = null, status: string = 'authenticated') => {
  (useSession as jest.Mock).mockReturnValue({
    data: session,
    status,
  });
};

export const mockRouterHook = (router: any = createMockRouter()) => {
  (useRouter as jest.Mock).mockReturnValue(router);
};

export const createSuccessfulFetchMock = (responseData: any = {}) => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({
      success: true,
      message: 'Profile updated successfully',
      user: { id: TEST_USER_ID, displayName: 'John Doe', ...responseData },
    }),
  });
};

export const createFailedFetchMock = (status: number = 400, errors: any[] = []) => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status,
    json: jest.fn().mockResolvedValue({
      success: false,
      message: 'Profile update failed',
      errors,
    }),
  });
};

export const fillDisplayNameField = async (value: string) => {
  const displayNameInput = document.querySelector('input[type="text"]') as HTMLInputElement;
  if (displayNameInput) {
    await userEvent.clear(displayNameInput);
    await userEvent.type(displayNameInput, value);
  }
};

export const submitForm = async () => {
  const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (submitButton) {
    await userEvent.click(submitButton);
  }
};

export const fillProfileFormField = async (fieldLabel: string | RegExp, value: string) => {
  const fieldInput = screen.getByLabelText(fieldLabel);
  await userEvent.clear(fieldInput);
  await userEvent.type(fieldInput, value);
};

export const clickCompleteSetupButton = async () => {
  await userEvent.click(screen.getByRole('button', { name: /Complete Setup/i }));
};

export const expectProfileApiCall = (userId: string = '123') => {
  expect(global.fetch).toHaveBeenCalledWith(
    `/api/users/${userId}/profile`,
    expect.objectContaining({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    })
  );
};

export const setupMocksForTest = () => {
  const mockRouter = createMockRouter();
  const mockSession = createMockSession();

  mockRouterHook(mockRouter);
  mockSessionHook(mockSession);
  createSuccessfulFetchMock();

  return { mockRouter, mockSession };
};