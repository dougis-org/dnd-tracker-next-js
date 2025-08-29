/**
 * Shared mock data and utilities for user registration tests
 * Eliminates duplication across test files
 */

import User, { ClerkUserData } from '@/lib/models/User';

/**
 * Standard mock user object used across registration tests
 */
export const createMockUser = (overrides: Partial<any> = {}) => ({
  _id: 'user123',
  clerkId: 'clerk_123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  subscriptionTier: 'free',
  profileSetupCompleted: false,
  authProvider: 'clerk',
  syncStatus: 'active',
  preferences: {
    theme: 'system',
    emailNotifications: true,
    browserNotifications: false,
    timezone: 'UTC',
    language: 'en',
    diceRollAnimations: true,
    autoSaveEncounters: true,
  },
  isSubscriptionActive: jest.fn(() => true),
  canAccessFeature: jest.fn((_feature: string, _quantity: number) => true),
  toPublicJSON: jest.fn(() => ({
    id: 'user123',
    email: 'test@example.com',
    subscriptionTier: 'free',
  })),
  save: jest.fn(),
  updateLastLogin: jest.fn(),
  ...overrides,
});

/**
 * Standard Clerk user data for testing
 */
export const createMockClerkUserData = (overrides: Partial<ClerkUserData> = {}): ClerkUserData => ({
  clerkId: 'clerk_123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  username: 'johndoe',
  imageUrl: 'https://example.com/avatar.jpg',
  emailVerified: true,
  ...overrides,
});

/**
 * Minimal Clerk user data for testing edge cases
 */
export const createMinimalClerkUserData = (overrides: Partial<ClerkUserData> = {}): ClerkUserData => ({
  clerkId: 'clerk_minimal',
  email: 'minimal@example.com',
  ...overrides,
});

/**
 * Mock user with feature access checking
 */
export const createMockUserWithFeatureCheck = (limits: Record<string, number> = {}) => {
  const defaultLimits = {
    parties: 1,
    encounters: 3,
    characters: 10,
    ...limits,
  };

  return createMockUser({
    canAccessFeature: jest.fn((feature: string, quantity: number) => {
      return quantity <= defaultLimits[feature as keyof typeof defaultLimits];
    }),
  });
};

/**
 * Mock user with subscription tier upgrade
 */
export const createUpgradedMockUser = (tier: string, limits: Record<string, number>) => {
  return createMockUser({
    subscriptionTier: tier,
    canAccessFeature: jest.fn((feature: string, quantity: number) => {
      return quantity <= limits[feature as keyof typeof limits];
    }),
  });
};

/**
 * Standard mock setup for User model methods
 */
export const setupUserMocks = () => {
  jest.mock('@/lib/models/User', () => ({
    __esModule: true,
    default: {
      createClerkUser: jest.fn(),
      findByClerkId: jest.fn(),
      updateFromClerkData: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      deleteMany: jest.fn(),
    }
  }));
};

/**
 * Standard mock setup for database connection
 */
export const setupDatabaseMocks = () => {
  jest.mock('@/lib/db', () => ({
    connectToDatabase: jest.fn().mockResolvedValue(undefined),
  }));
};

/**
 * Standard beforeEach setup for clearing mocks
 */
export const setupTestCleanup = () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
};

/**
 * Standard User model mock configuration
 */
export const USER_MODEL_MOCK = {
  __esModule: true,
  default: {
    createClerkUser: jest.fn(),
    findByClerkId: jest.fn(),
    updateFromClerkData: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteMany: jest.fn(),
  }
} as const;

/**
 * Standard database mock configuration
 */
export const DATABASE_MOCK = {
  connectToDatabase: jest.fn().mockResolvedValue(undefined),
} as const;

/**
 * Mock User.createClerkUser method with a specific user
 */
export const mockUserCreateClerkUser = (user: any) => {
  const User = require('@/lib/models/User').default;
  (User.createClerkUser as jest.Mock).mockResolvedValue(user);
};

/**
 * Mock User.findByClerkId method with a specific user
 */
export const mockUserFindByClerkId = (user: any) => {
  const User = require('@/lib/models/User').default;
  (User.findByClerkId as jest.Mock).mockResolvedValue(user);
};

/**
 * Mock User.updateFromClerkData method with a specific user
 */
export const mockUserUpdateFromClerkData = (user: any) => {
  const User = require('@/lib/models/User').default;
  (User.updateFromClerkData as jest.Mock).mockResolvedValue(user);
};

/**
 * Common test helper that sets up a user mock and returns it
 */
export const setupMockUserForTest = (overrides: Partial<any> = {}) => {
  const mockUser = createMockUser(overrides);
  mockUserCreateClerkUser(mockUser);
  return mockUser;
};

/**
 * Helper function to create user with minimal data and run basic assertions
 */
export const createUserWithMinimalDataAndAssert = async (_overrides: Partial<any> = {}) => {
  const clerkUserData = createMinimalClerkUserData();
  const user = await User.createClerkUser(clerkUserData);

  // Basic assertions that are common across tests
  expect(user.subscriptionTier).toBe('free');
  expect(user.profileSetupCompleted).toBe(false);
  expect(user.syncStatus).toBe('active');
  expect(user.authProvider).toBe('clerk');

  return user;
};

/**
 * Helper function for testing subscription tier assignment
 */
export const testDefaultSubscriptionTier = async () => {
  const clerkUserData = createMinimalClerkUserData();
  const user = await User.createClerkUser(clerkUserData);

  expect(user.subscriptionTier).toBe('free');
  expect(user.isSubscriptionActive()).toBe(true);

  return user;
};

/**
 * Helper function for testing feature access limits
 */
export const testFeatureAccessLimits = async () => {
  const clerkUserData = createMinimalClerkUserData();
  const user = await User.createClerkUser(clerkUserData);

  // Free tier limits - these are the same across multiple tests
  expect(user.canAccessFeature('parties', 1)).toBe(true);
  expect(user.canAccessFeature('parties', 2)).toBe(false);
  expect(user.canAccessFeature('encounters', 3)).toBe(true);
  expect(user.canAccessFeature('encounters', 4)).toBe(false);
  expect(user.canAccessFeature('characters', 10)).toBe(true);
  expect(user.canAccessFeature('characters', 11)).toBe(false);

  return user;
};

/**
 * Helper for testing feature access on a mocked user object
 */
export const testFeatureAccessOnUser = (user: any) => {
  expect(user.canAccessFeature('parties', 1)).toBe(true);
  expect(user.canAccessFeature('parties', 2)).toBe(false);
  expect(user.canAccessFeature('encounters', 3)).toBe(true);
  expect(user.canAccessFeature('encounters', 4)).toBe(false);
};

/**
 * Helper for asserting User.createClerkUser was called with expected data
 */
export const expectUserCreatedWithData = (expectedData: ClerkUserData) => {
  const User = require('@/lib/models/User').default;
  expect(User.createClerkUser).toHaveBeenCalledWith(expectedData);
};

/**
 * Standard assertions for successful webhook processing
 */
export const expectSuccessfulWebhookResponse = async (response: Response) => {
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data.message).toBe('Webhook processed successfully');
};