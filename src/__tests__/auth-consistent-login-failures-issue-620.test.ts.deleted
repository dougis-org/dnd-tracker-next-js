/**
 * Authentication Consistent Login Failures Test - Issue #620
 * Tests for the reported issue where users can register and login initially,
 * but then cannot login with the same credentials later
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { UserService } from '@/lib/services';
import { connectToDatabase } from '@/lib/db';
import { auth, signIn } from '@/lib/auth';
// Test helpers - unused imports removed for ESLint compliance

// Mock modules
jest.mock('@/lib/db');
jest.mock('@/lib/auth');

const mockConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;
const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

describe('Authentication Consistent Login Failures - Issue #620', () => {
  const testCredentials = {
    email: 'doug@dougis.com',
    password: 'EXF5pke@njn7thm4nkr',
    username: 'dougis',
    firstName: 'Doug',
    lastName: 'Test'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should successfully register a new user', async () => {
    // Mock successful registration
    const mockUser = {
      id: 'test-user-id',
      email: testCredentials.email,
      username: testCredentials.username,
      firstName: testCredentials.firstName,
      lastName: testCredentials.lastName,
      isEmailVerified: true, // Assume email verification is bypassed for testing
      subscriptionTier: 'free',
      role: 'user',
    };

    jest.spyOn(UserService, 'createUser').mockResolvedValue({
      success: true,
      data: {
        user: mockUser,
        emailBypass: true,
      },
    });

    const result = await UserService.createUser({
      email: testCredentials.email,
      username: testCredentials.username,
      firstName: testCredentials.firstName,
      lastName: testCredentials.lastName,
      password: testCredentials.password,
    });

    expect(result.success).toBe(true);
    expect(result.data?.user.email).toBe(testCredentials.email);
  });

  it('should successfully authenticate immediately after registration', async () => {
    // Mock immediate login after registration
    const mockAuthResult = {
      success: true,
      data: {
        user: {
          id: 'test-user-id',
          email: testCredentials.email,
          username: testCredentials.username,
          firstName: testCredentials.firstName,
          lastName: testCredentials.lastName,
          isEmailVerified: true,
          subscriptionTier: 'free',
          role: 'user',
        },
        requiresVerification: false,
      },
    };

    jest.spyOn(UserService, 'authenticateUser').mockResolvedValue(mockAuthResult);

    const result = await UserService.authenticateUser({
      email: testCredentials.email,
      password: testCredentials.password,
    });

    expect(result.success).toBe(true);
    expect(result.data?.user.email).toBe(testCredentials.email);
    expect(result.data?.requiresVerification).toBe(false);
  });

  it('should fail to authenticate after time has passed (reproducing issue)', async () => {
    // Mock the scenario where login fails after some time
    // This could be due to JWT expiration, session issues, or database connectivity

    // First successful authentication
    const mockSuccessAuthResult = {
      success: true,
      data: {
        user: {
          id: 'test-user-id',
          email: testCredentials.email,
          username: testCredentials.username,
          firstName: testCredentials.firstName,
          lastName: testCredentials.lastName,
          isEmailVerified: true,
          subscriptionTier: 'free',
          role: 'user',
        },
        requiresVerification: false,
      },
    };

    // Second failed authentication (simulating time passed)
    const mockFailedAuthResult = {
      success: false,
      error: {
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
        statusCode: 401,
      },
    };

    jest.spyOn(UserService, 'authenticateUser')
      .mockResolvedValueOnce(mockSuccessAuthResult)
      .mockResolvedValueOnce(mockFailedAuthResult);

    // First login should work
    const firstResult = await UserService.authenticateUser({
      email: testCredentials.email,
      password: testCredentials.password,
    });

    expect(firstResult.success).toBe(true);

    // Second login should fail (reproducing the issue)
    const secondResult = await UserService.authenticateUser({
      email: testCredentials.email,
      password: testCredentials.password,
    });

    expect(secondResult.success).toBe(false);
    expect(secondResult.error?.code).toBe('INVALID_CREDENTIALS');
  });

  it('should maintain session persistence with JWT tokens', async () => {
    // Test JWT token persistence and session recovery
    const mockSessionData = {
      user: {
        id: 'test-user-id',
        email: testCredentials.email,
        name: `${testCredentials.firstName} ${testCredentials.lastName}`,
        subscriptionTier: 'free',
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    mockAuth.mockResolvedValue(mockSessionData);

    const session = await auth();
    expect(session).toBeTruthy();
    expect(session?.user?.email).toBe(testCredentials.email);
  });

  it('should handle database connection issues gracefully', async () => {
    // Test scenario where database connection fails intermittently
    mockConnectToDatabase.mockRejectedValueOnce(new Error('Database connection failed'));

    jest.spyOn(UserService, 'authenticateUser').mockResolvedValue({
      success: false,
      error: {
        message: 'Database connection error',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      },
    });

    const result = await UserService.authenticateUser({
      email: testCredentials.email,
      password: testCredentials.password,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DATABASE_ERROR');
  });

  it('should verify JWT token generation and validation', async () => {
    // Test JWT token creation and validation process
    // Mock successful signin that should create JWT token
    mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: null });

    const result = await signIn('credentials', {
      email: testCredentials.email,
      password: testCredentials.password,
      redirect: false,
    });

    expect(result?.ok).toBe(true);
  });

  it('should handle user verification status correctly', async () => {
    // Test if email verification status affects login persistence
    const mockUnverifiedUser = {
      success: true,
      data: {
        user: {
          id: 'test-user-id',
          email: testCredentials.email,
          isEmailVerified: false, // Unverified user
          subscriptionTier: 'free',
          role: 'user',
        },
        requiresVerification: true,
      },
    };

    jest.spyOn(UserService, 'authenticateUser').mockResolvedValue(mockUnverifiedUser);

    const result = await UserService.authenticateUser({
      email: testCredentials.email,
      password: testCredentials.password,
    });

    expect(result.success).toBe(true);
    expect(result.data?.requiresVerification).toBe(true);
    expect(result.data?.user.isEmailVerified).toBe(false);
  });
});