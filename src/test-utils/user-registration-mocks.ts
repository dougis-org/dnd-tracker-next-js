/**
 * Shared mock data and utilities for user registration tests
 * Eliminates duplication across test files
 */

import { ClerkUserData } from '@/lib/models/User';

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