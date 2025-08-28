import { SessionUser } from '@/types/auth';

// Re-export shared test utilities to eliminate duplication
export {
  createMockUser,
  createMockSession,
  createMockRequest,
  createRequestBody,
  expectSuccessResponse,
  expectErrorResponse,
  SHARED_API_TEST_CONSTANTS,
} from '@/lib/test-utils/shared-api-test-helpers';

export const TEST_USER_ID = '507f1f77bcf86cd799439011';

export const createMockSessionUser = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: TEST_USER_ID,
  name: 'Test User',
  email: 'test@example.com',
  subscriptionTier: 'free',
  ...overrides,
});

/**
 * Predefined mock users for different subscription tiers
 */
export const mockUsers = {
  freeUser: createMockSessionUser({
    id: '1',
    name: 'Free User',
    email: 'free@example.com',
    subscriptionTier: 'free',
  }),

  paidUser: createMockSessionUser({
    id: '2',
    name: 'Paid User',
    email: 'paid@example.com',
    subscriptionTier: 'seasoned',
  }),

  premiumUser: createMockSessionUser({
    id: '3',
    name: 'Premium User',
    email: 'premium@example.com',
    subscriptionTier: 'master',
  }),
};

export const mockSessions = {
  free: {
    user: mockUsers.freeUser,
    expires: '2024-12-31',
  },
  paid: {
    user: mockUsers.paidUser,
    expires: '2024-12-31',
  },
  premium: {
    user: mockUsers.premiumUser,
    expires: '2024-12-31',
  },
};

/**
 * API request and parameter utilities
 */
export const createMockParams = (id: string = TEST_USER_ID) =>
  Promise.resolve({ id });

/**
 * Form event utilities for UI testing
 */
export const createMockFormEvent = (name: string, value: string | boolean) => ({
  target: {
    name,
    value,
    type: typeof value === 'boolean' ? 'checkbox' : 'text',
    checked: typeof value === 'boolean' ? value : undefined,
  },
});

export const waitForFormSubmission = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Mock API responses
 */
export const mockApiResponses = {
  updateUserSuccess: () => Promise.resolve({ success: true }),
  updateUserError: () => Promise.reject(new Error('API Error')),
  updateUserValidationError: () => Promise.reject(new Error('Validation failed')),
};

/**
 * Subscription tier data for testing
 */
export const subscriptionTiers = {
  free: {
    name: 'Free Adventurer',
    price: '$0/month',
    features: ['1 party', '3 encounters', '10 creatures'],
  },
  seasoned: {
    name: 'Seasoned Adventurer',
    price: '$4.99/month',
    features: ['3 parties', '15 encounters', '50 creatures'],
  },
  expert: {
    name: 'Expert Dungeon Master',
    price: '$9.99/month',
    features: ['10 parties', '50 encounters', '200 creatures'],
  },
  master: {
    name: 'Master of Dungeons',
    price: '$19.99/month',
    features: ['25 parties', '100 encounters', '500 creatures'],
  },
  guild: {
    name: 'Guild Master',
    price: '$39.99/month',
    features: ['Unlimited parties', 'Unlimited encounters', 'Unlimited creatures', 'Organization features'],
  },
};