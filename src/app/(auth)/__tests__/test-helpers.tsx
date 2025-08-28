import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { createMockSession as createMockSessionBase } from '@/lib/test-utils/shared-api-test-helpers';
import { jest } from '@jest/globals';

/**
 * Common test helpers for Clerk authentication tests
 */

// Common mock values for Clerk auth states
export const createMockAuthState = (overrides: Partial<ReturnType<typeof import('@clerk/nextjs').useAuth>> = {}) => ({
  isSignedIn: false,
  isLoaded: true,
  userId: null,
  user: null,
  sessionId: null,
  actor: null,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  organization: null,
  getToken: jest.fn(),
  has: jest.fn(),
  signOut: jest.fn(),
  ...overrides,
});

// Standard auth states for testing
export const authStates = {
  notSignedIn: createMockAuthState({
    isSignedIn: false,
    isLoaded: true,
  }),
  loading: createMockAuthState({
    isSignedIn: false,
    isLoaded: false,
  }),
  signedIn: createMockAuthState({
    isSignedIn: true,
    isLoaded: true,
    userId: 'user123',
    user: {} as any,
    sessionId: 'session123',
  }),
};

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

export const setupCommonMocks = () => {
  const mockRouter = createMockRouter();
  mockRouterHook(mockRouter);
  return { mockRouter };
};

export const mockUseSession = (status: 'authenticated' | 'loading' | 'unauthenticated', sessionData: any = null) => {
  (useSession as jest.Mock).mockReturnValue({
    data: sessionData,
    status,
  });
};

export const mockUseRouter = () => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  return mockRouter;
};

export const mockFetch = (success: boolean, responseData: any = {}) => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: success,
    json: jest.fn().mockResolvedValue(responseData),
  });
};

export const fillAndSubmitForm = async (fields: { label: string | RegExp; value: string }[], submitButtonName: string | RegExp) => {
  for (const field of fields) {
    await fillProfileFormField(field.label, field.value);
  }
  await userEvent.click(screen.getByRole('button', { name: submitButtonName }));
};

export const mockAll = () => {
  const mockRouter = mockUseRouter();
  mockUseSession('authenticated', createMockSession());
  mockFetch(true);
  return { mockRouter };
};

export const mockAuthenticatedSession = () => {
  mockUseSession('authenticated', createMockSession());
};

export const mockUnauthenticatedSession = () => {
  mockUseSession('unauthenticated');
};

export const mockLoadingSession = () => {
  mockUseSession('loading');
};

export const mockSuccessfulProfileUpdate = () => {
  mockFetch(true, {
    success: true,
    message: 'Profile updated successfully',
    user: { id: TEST_USER_ID, displayName: 'NewDisplayName' },
  });
};

export const mockFailedProfileUpdate = (errors: any[] = []) => {
  mockFetch(false, {
    success: false,
    message: 'Profile update failed',
    errors,
  });
};

export const mockPasswordMismatch = () => {
  mockFetch(false, {
    success: false,
    message: 'Passwords do not match',
    errors: [{ path: 'confirmPassword', message: 'Passwords do not match' }],
  });
};

export const mockEmailInUse = () => {
  mockFetch(false, {
    success: false,
    message: 'Email already in use',
    errors: [{ path: 'email', message: 'Email already in use' }],
  });
};

export const mockInvalidCredentials = () => {
  mockFetch(false, {
    success: false,
    message: 'Invalid credentials',
    errors: [{ path: 'email', message: 'Invalid credentials' }],
  });
};

export const mockPasswordTooShort = () => {
  mockFetch(false, {
    success: false,
    message: 'Password too short',
    errors: [{ path: 'password', message: 'Password must be at least 8 characters' }],
  });
};

export const mockSuccessfulLogin = () => {
  mockFetch(true, {
    success: true,
    message: 'Login successful',
    user: { id: TEST_USER_ID, email: TEST_EMAIL },
  });
};

export const mockSuccessfulRegistration = () => {
  mockFetch(true, {
    success: true,
    message: 'Registration successful',
    user: { id: TEST_USER_ID, email: TEST_EMAIL },
  });
};

export const mockPasswordResetRequest = () => {
  mockFetch(true, {
    success: true,
    message: 'Password reset email sent',
  });
};

export const mockPasswordReset = () => {
  mockFetch(true, {
    success: true,
    message: 'Password reset successful',
  });
};

export const mockEmailVerification = () => {
  mockFetch(true, {
    success: true,
    message: 'Email verified successfully',
  });
};

export const mockUserNotFound = () => {
  mockFetch(false, {
    success: false,
    message: 'User not found',
    errors: [{ path: 'email', message: 'User not found' }],
  });
};

export const mockInvalidToken = () => {
  mockFetch(false, {
    success: false,
    message: 'Invalid or expired token',
    errors: [{ path: 'token', message: 'Invalid or expired token' }],
  });
};

export const mockMissingFields = () => {
  mockFetch(false, {
    success: false,
    message: 'Missing required fields',
    errors: [
      { path: 'email', message: 'Email is required' },
      { path: 'password', message: 'Password is required' },
    ],
  });
};

export const mockGenericError = () => {
  mockFetch(false, {
    success: false,
    message: 'An unexpected error occurred',
    errors: [{ path: 'general', message: 'An unexpected error occurred' }],
  });
};

export const mockNetworkError = () => {
  (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
};

export const mockApiResponse = (success: boolean, data: any = {}) => {
  mockFetch(success, data);
};

export const mockApiError = (message: string, path: string = 'general') => {
  mockFetch(false, {
    success: false,
    message,
    errors: [{ path, message }],
  });
};

export const mockSuccessfulAuth = (user: any = {}) => {
  mockUseSession('authenticated', createMockSession({ user }));
};

export const mockAuthLoading = () => {
  mockUseSession('loading');
};

export const mockNoAuth = () => {
  mockUseSession('unauthenticated');
};

export const mockRouterPush = () => {
  const mockRouter = mockUseRouter();
  return mockRouter.push;
};

export const mockRouterReplace = () => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  return mockRouter.push;
};

export const mockRouterBack = () => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  return mockRouter.push;
};

export const mockRouterPrefetch = () => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  return mockRouter.push;
};

export const mockRouterReload = () => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  return mockRouter.push;
};

export const mockRouterEvents = () => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  return mockRouter;
};

export const mockRouterIsReady = () => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, isReady: true });
  return mockRouter;
};

export const mockRouterPathname = (pathname: string) => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, pathname });
  return mockRouter;
};

export const mockRouterQuery = (query: any) => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, query });
  return mockRouter;
};

export const mockRouterAsPath = (asPath: string) => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, asPath });
  return mockRouter;
};

export const mockRouterLocale = (locale: string) => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, locale });
  return mockRouter;
};

export const mockRouterDefaultLocale = (defaultLocale: string) => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, defaultLocale });
  return mockRouter;
};

export const mockRouterIsFallback = (isFallback: boolean) => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, isFallback });
  return mockRouter;
};

export const mockRouterIsPreview = (isPreview: boolean) => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, isPreview });
  return mockRouter;
};

export const mockRouterIsLocaleDomain = (isLocaleDomain: boolean) => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, isLocaleDomain });
  return mockRouter;
};

export const mockRouterDomainLocales = (domainLocales: any[]) => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, domainLocales });
  return mockRouter;
};

export const mockRouterBasepath = (basepath: string) => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, basepath });
  return mockRouter;
};

export const mockRouterWithParams = (params: any) => {
  const mockRouter = createMockRouter();
  (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, query: params });
  return mockRouter;
};

export const mockRouterWithPush = () => {
  const push = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ push });
  return push;
};

export const mockRouterWithReplace = () => {
  const replace = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ replace });
  return replace;
};

export const mockRouterWithBack = () => {
  const back = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ back });
  return back;
};

export const mockRouterWithPrefetch = () => {
  const prefetch = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ prefetch });
  return prefetch;
};

export const mockRouterWithReload = () => {
  const reload = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ reload });
  return reload;
};

export const mockRouterWithEvents = () => {
  const events = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  };
  (useRouter as jest.Mock).mockReturnValue({ events });
  return events;
};

export const mockRouterWithIsReady = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true });
};

export const mockRouterWithIsFallback = () => {
  (useRouter as jest.Mock).mockReturnValue({ isFallback: true });
};

export const mockRouterWithIsPreview = () => {
  (useRouter as jest.Mock).mockReturnValue({ isPreview: true });
};

export const mockRouterWithIsLocaleDomain = () => {
  (useRouter as jest.Mock).mockReturnValue({ isLocaleDomain: true });
};

export const mockRouterWithDomainLocales = () => {
  (useRouter as jest.Mock).mockReturnValue({ domainLocales: [] });
};

export const mockRouterWithDefaultLocale = () => {
  (useRouter as jest.Mock).mockReturnValue({ defaultLocale: 'en' });
};

export const mockRouterWithLocale = () => {
  (useRouter as jest.Mock).mockReturnValue({ locale: 'en' });
};

export const mockRouterWithLocales = () => {
  (useRouter as jest.Mock).mockReturnValue({ locales: ['en', 'fr'] });
};

export const mockRouterWithAsPath = () => {
  (useRouter as jest.Mock).mockReturnValue({ asPath: '/' });
};

export const mockRouterWithQuery = () => {
  (useRouter as jest.Mock).mockReturnValue({ query: {} });
};

export const mockRouterWithParams = () => {
  (useRouter as jest.Mock).mockReturnValue({ query: {} });
};

export const mockRouterWithRoute = () => {
  (useRouter as jest.Mock).mockReturnValue({ route: '/' });
};

export const mockRouterWithBasepath = () => {
  (useRouter as jest.Mock).mockReturnValue({ basepath: '' });
};

export const mockRouterWithDir = () => {
  (useRouter as jest.Mock).mockReturnValue({ dir: 'ltr' });
};

export const mockRouterWithIsSsr = () => {
  (useRouter as jest.Mock).mockReturnValue({ isSsr: false });
};

export const mockRouterWithIsClient = () => {
  (useRouter as jest.Mock).mockReturnValue({ isClient: true });
};

export const mockRouterWithIsServer = () => {
  (useRouter as jest.Mock).mockReturnValue({ isServer: false });
};

export const mockRouterWithIsStatic = () => {
  (useRouter as jest.Mock).mockReturnValue({ isStatic: false });
};

export const mockRouterWithIsDynamic = () => {
  (useRouter as jest.Mock).mockReturnValue({ isDynamic: false });
};

export const mockRouterWithIsCatchAll = () => {
  (useRouter as jest.Mock).mockReturnValue({ isCatchAll: false });
};

export const mockRouterWithIsOptionalCatchAll = () => {
  (useRouter as jest.Mock).mockReturnValue({ isOptionalCatchAll: false });
};

export const mockRouterWithIsShallow = () => {
  (useRouter as jest.Mock).mockReturnValue({ isShallow: false });
};

export const mockRouterWithIsReadyAndPush = () => {
  const push = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, push });
  return push;
};

export const mockRouterWithIsReadyAndReplace = () => {
  const replace = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, replace });
  return replace;
};

export const mockRouterWithIsReadyAndBack = () => {
  const back = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, back });
  return back;
};

export const mockRouterWithIsReadyAndPrefetch = () => {
  const prefetch = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, prefetch });
  return prefetch;
};

export const mockRouterWithIsReadyAndReload = () => {
  const reload = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, reload });
  return reload;
};

export const mockRouterWithIsReadyAndEvents = () => {
  const events = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  };
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, events });
  return events;
};

export const mockRouterWithIsReadyAndIsFallback = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, isFallback: true });
};

export const mockRouterWithIsReadyAndIsPreview = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, isPreview: true });
};

export const mockRouterWithIsReadyAndIsLocaleDomain = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, isLocaleDomain: true });
};

export const mockRouterWithIsReadyAndDomainLocales = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, domainLocales: [] });
};

export const mockRouterWithIsReadyAndDefaultLocale = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, defaultLocale: 'en' });
};

export const mockRouterWithIsReadyAndLocale = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, locale: 'en' });
};

export const mockRouterWithIsReadyAndLocales = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, locales: ['en', 'fr'] });
};

export const mockRouterWithIsReadyAndAsPath = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, asPath: '/' });
};

export const mockRouterWithIsReadyAndQuery = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, query: {} });
};

export const mockRouterWithIsReadyAndParams = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, query: {} });
};

export const mockRouterWithIsReadyAndRoute = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, route: '/' });
};

export const mockRouterWithIsReadyAndBasepath = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, basepath: '' });
};

export const mockRouterWithIsReadyAndDir = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, dir: 'ltr' });
};

export const mockRouterWithIsReadyAndIsSsr = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, isSsr: false });
};

export const mockRouterWithIsReadyAndIsClient = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, isClient: true });
};

export const mockRouterWithIsReadyAndIsServer = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, isServer: false });
};

export const mockRouterWithIsReadyAndIsStatic = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, isStatic: false });
};

export const mockRouterWithIsReadyAndIsDynamic = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, isDynamic: false });
};

export const mockRouterWithIsReadyAndIsCatchAll = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, isCatchAll: false });
};

export const mockRouterWithIsReadyAndIsOptionalCatchAll = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, isOptionalCatchAll: false });
};

export const mockRouterWithIsReadyAndIsShallow = () => {
  (useRouter as jest.Mock).mockReturnValue({ isReady: true, isShallow: false });
};
