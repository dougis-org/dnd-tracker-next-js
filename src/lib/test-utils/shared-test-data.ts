/**
 * Shared Test Data Generation Utilities
 *
 * Centralized test data generation following the patterns established in webhook integration tests.
 * This ensures consistency across all test suites and prevents data mismatches between
 * mock objects and expected test values.
 *
 * Based on patterns from:
 * - webhook-test-utils.ts (database integration testing)
 * - database-unmocking.ts (reusable patterns)
 * - shared-test-constants.ts (centralized constants)
 */

import { SHARED_API_TEST_CONSTANTS } from './shared-test-constants';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/components/settings/constants';

// Extended test constants specifically for form/component testing
export const SHARED_TEST_DATA_CONSTANTS = {
  ...SHARED_API_TEST_CONSTANTS,
  TEST_FIRST_NAME: 'Test',
  TEST_LAST_NAME: 'User',
  TEST_FULL_NAME: 'Test User',
  TEST_USERNAME: 'testuser',
  TEST_IMAGE_URL: 'https://example.com/avatar.jpg',
  TEST_EMAIL_ID: 'email_123',
} as const;

/**
 * Create consistent mock Clerk user data
 * This matches the structure expected by Clerk and used throughout the application
 */
export function createMockClerkUser(overrides: Partial<{
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  imageUrl: string;
  primaryEmailAddressId: string;
  emailAddress: string;
}> = {}) {
  const emailAddress = overrides.emailAddress || SHARED_TEST_DATA_CONSTANTS.TEST_EMAIL;
  const firstName = overrides.firstName || SHARED_TEST_DATA_CONSTANTS.TEST_FIRST_NAME;
  const lastName = overrides.lastName || SHARED_TEST_DATA_CONSTANTS.TEST_LAST_NAME;

  return {
    id: overrides.id || SHARED_TEST_DATA_CONSTANTS.TEST_USER_ID,
    emailAddresses: [
      {
        id: SHARED_TEST_DATA_CONSTANTS.TEST_EMAIL_ID,
        emailAddress,
        verification: { status: 'verified' },
      }
    ],
    primaryEmailAddress: { emailAddress },
    primaryEmailAddressId: SHARED_TEST_DATA_CONSTANTS.TEST_EMAIL_ID,
    firstName,
    lastName,
    fullName: overrides.fullName || `${firstName} ${lastName}`,
    username: overrides.username || SHARED_TEST_DATA_CONSTANTS.TEST_USERNAME,
    imageUrl: overrides.imageUrl || SHARED_TEST_DATA_CONSTANTS.TEST_IMAGE_URL,
  };
}

/**
 * Create mock Clerk useUser return value
 * This ensures consistency with what the useUser hook actually returns
 */
export function createMockClerkUserReturn(userOverrides?: Parameters<typeof createMockClerkUser>[0]) {
  return {
    user: createMockClerkUser(userOverrides),
    isLoaded: true,
    isSignedIn: true,
  };
}

/**
 * Create profile data that matches what useSettingsForm extracts from Clerk user
 * This ensures tests match the actual hook behavior: firstName || fullName for name
 */
export function createProfileData(overrides: Partial<{
  name: string;
  email: string;
}> = {}) {
  // Match the actual hook logic: user?.firstName || user?.fullName || ''
  const defaultName = SHARED_TEST_DATA_CONSTANTS.TEST_FIRST_NAME; // This matches user?.firstName

  return {
    name: overrides.name ?? defaultName,
    email: overrides.email ?? SHARED_TEST_DATA_CONSTANTS.TEST_EMAIL,
  };
}

/**
 * Create notification preferences that match the actual DEFAULT_NOTIFICATION_PREFERENCES
 * This ensures tests use the same values as the application
 */
export function createNotificationPreferences(overrides: Partial<typeof DEFAULT_NOTIFICATION_PREFERENCES> = {}) {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...overrides,
  };
}

/**
 * Create form validation errors structure
 */
export function createValidationErrors(errors: { name?: string; email?: string }) {
  return errors;
}

/**
 * Create mock React form event
 */
export function createMockFormEvent(): React.FormEvent {
  return {
    preventDefault: jest.fn(),
  } as unknown as React.FormEvent;
}

/**
 * Async act helper for testing hook state changes
 */
export async function actAsync(callback: () => Promise<void>) {
  const { act } = await import('@testing-library/react');
  await act(async () => {
    await callback();
  });
}

// Variant data for testing different scenarios (following webhook test patterns)
export const MOCK_CLERK_USER_VARIANTS = {
  withoutUsername: () => createMockClerkUser({
    username: null as any,
    emailAddress: 'jane.smith@example.com',
  }),

  withoutEmail: () => createMockClerkUser({
    emailAddress: '',
  }),

  withLongName: () => createMockClerkUser({
    firstName: 'Very Long First Name That Exceeds Normal Length',
    lastName: 'Very Long Last Name That Exceeds Normal Length',
  }),

  withMinimalData: () => createMockClerkUser({
    firstName: 'A',
    lastName: 'B',
    fullName: 'A B',
  }),
} as const;

// Profile data variants for testing edge cases
export const PROFILE_DATA_VARIANTS = {
  empty: () => createProfileData({ name: '', email: '' }),
  invalidEmail: () => createProfileData({ email: 'invalid-email' }),
  shortName: () => createProfileData({ name: 'A' }),
  longName: () => createProfileData({ name: 'A'.repeat(100) }),
} as const;

// Notification preference variants
export const NOTIFICATION_VARIANTS = {
  allDisabled: () => createNotificationPreferences({
    email: false,
    combat: false,
    encounters: false,
    weeklyDigest: false,
    productUpdates: false,
    securityAlerts: false,
  }),

  onlyRequired: () => createNotificationPreferences({
    email: true,
    combat: false,
    encounters: false,
    weeklyDigest: false,
    productUpdates: false,
    securityAlerts: true, // Security alerts typically required
  }),
} as const;