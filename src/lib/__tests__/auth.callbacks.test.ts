
import { UserService } from '../services/UserService';
import {
  enhanceSessionUserData,
  validateUserSignIn,
} from '../../auth'; // Assuming these are exported for testing

// Mock UserService
jest.mock('../../services/UserService');

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('Auth Callbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================================
  // session Callback Tests
  // ================================
  describe('session callback (via enhanceSessionUserData)', () => {
    it('should add user id and subscription tier to the session', async () => {
      const session = { user: { email: 'test@example.com' } };
      const user = { id: 'user-123', subscriptionTier: 'pro' };

      const newSession = await enhanceSessionUserData(session, user);

      expect(newSession.user.id).toBe('user-123');
      expect(newSession.user.subscriptionTier).toBe('pro');
    });

    it('should fetch additional user data if not present in session', async () => {
        const session = { user: { email: 'test@example.com' } };
        const user = { id: 'user-123', email: 'test@example.com' }; // No subscriptionTier
        const dbUser = {
            id: 'user-123',
            firstName: 'Test',
            lastName: 'User',
            subscriptionTier: 'expert',
        };

        mockUserService.getUserByEmail.mockResolvedValue({ success: true, data: dbUser as any });

        const newSession = await enhanceSessionUserData(session, user);

        expect(newSession.user.name).toBe('Test User');
        expect(newSession.user.subscriptionTier).toBe('expert');
        expect(mockUserService.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle cases where user fetch fails', async () => {
        const session = { user: { email: 'test@example.com' } };
        const user = { id: 'user-123', email: 'test@example.com' };

        mockUserService.getUserByEmail.mockResolvedValue({ success: false, error: { message: 'Not found' } as any });

        const newSession = await enhanceSessionUserData(session, user);

        // Should not throw, but log a warning (can't test console output easily here)
        // Session should be returned without the extra data
        expect(newSession.user.name).toBeUndefined();
        expect(newSession.user.subscriptionTier).toBe('free'); // Default
    });
  });

  // ================================
  // signIn Callback Tests
  // ================================
  describe('signIn callback (via validateUserSignIn)', () => {
    it('should return true for credentials provider', async () => {
      const user = { email: 'test@example.com' };
      const account = { provider: 'credentials' };

      const canSignIn = await validateUserSignIn(user, account);

      expect(canSignIn).toBe(true);
      expect(mockUserService.getUserByEmail).not.toHaveBeenCalled();
    });

    it('should return true for other providers if user exists in DB', async () => {
        const user = { email: 'test@example.com' };
        const account = { provider: 'google' };

        mockUserService.getUserByEmail.mockResolvedValue({ success: true, data: {} as any });

        const canSignIn = await validateUserSignIn(user, account);

        expect(canSignIn).toBe(true);
        expect(mockUserService.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return false for other providers if user does not exist in DB', async () => {
        const user = { email: 'test@example.com' };
        const account = { provider: 'google' };

        mockUserService.getUserByEmail.mockResolvedValue({ success: false, error: { message: 'Not found' } as any });

        const canSignIn = await validateUserSignIn(user, account);

        expect(canSignIn).toBe(false);
    });

    it('should return false if user email is missing', async () => {
        const user = {};
        const account = { provider: 'credentials' };

        const canSignIn = await validateUserSignIn(user, account);

        expect(canSignIn).toBe(false);
    });
  });

  // Note: The `redirect` callback is harder to test in isolation as it depends on Next.js context (baseUrl).
  // Its logic is primarily about URL parsing and comparison, which is straightforward.
  // We will rely on E2E tests for full validation of the redirect flow.
});
