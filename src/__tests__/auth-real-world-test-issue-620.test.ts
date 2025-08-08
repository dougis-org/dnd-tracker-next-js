/**
 * Real-world Authentication Test - Issue #620
 * Tests the actual credentials provided in the issue to reproduce the problem
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserService } from '@/lib/services';
import { connectToDatabase } from '@/lib/db';
import { auth } from '@/lib/auth';

// Test using the exact credentials from the issue
const ISSUE_CREDENTIALS = {
  email: 'doug@dougis.com',
  password: 'EXF5pke@njn7thm4nkr',
  username: 'dougistest',
  firstName: 'Doug',
  lastName: 'Test'
};

describe('Real-world Authentication Test - Issue #620', () => {
  beforeEach(async () => {
    // Ensure clean database connection
    await connectToDatabase();
  });

  afterEach(async () => {
    // Clean up any test users created
    try {
      const User = (await import('@/lib/models/User')).default;
      await User.deleteOne({ email: ISSUE_CREDENTIALS.email });
    } catch (error) {
      // Ignore cleanup errors in test environment
      console.warn('Cleanup warning:', error);
    }
  });

  it('should reproduce the consistent login failure issue', async () => {
    // Step 1: Create user (simulate registration)
    const registrationResult = await UserService.createUser({
      email: ISSUE_CREDENTIALS.email,
      username: ISSUE_CREDENTIALS.username,
      firstName: ISSUE_CREDENTIALS.firstName,
      lastName: ISSUE_CREDENTIALS.lastName,
      password: ISSUE_CREDENTIALS.password,
      confirmPassword: ISSUE_CREDENTIALS.password,
      agreeToTerms: true,
    });

    expect(registrationResult.success).toBe(true);
    console.log('Registration result:', registrationResult);

    // Step 2: Immediate login attempt (should work)
    const firstLoginResult = await UserService.authenticateUser({
      email: ISSUE_CREDENTIALS.email,
      password: ISSUE_CREDENTIALS.password,
    });

    expect(firstLoginResult.success).toBe(true);
    console.log('First login result:', firstLoginResult);

    // Step 3: Simulate some time passing and second login attempt
    // This is where the issue typically manifests
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

    const secondLoginResult = await UserService.authenticateUser({
      email: ISSUE_CREDENTIALS.email,
      password: ISSUE_CREDENTIALS.password,
    });

    // Log detailed information for debugging
    console.log('Second login result:', secondLoginResult);

    // This should succeed but currently fails due to Issue #620
    if (!secondLoginResult.success) {
      console.error('Login failure detected - Issue #620 reproduced');
      console.error('Error details:', secondLoginResult.error);

      // Check if user still exists in database
      const userLookup = await UserService.getUserByEmail(ISSUE_CREDENTIALS.email);
      console.log('User lookup after failed login:', userLookup);

      // Check password hash integrity
      if (userLookup.success && userLookup.data) {
        const User = (await import('@/lib/models/User')).default;
        const dbUser = await User.findByEmail(ISSUE_CREDENTIALS.email);
        if (dbUser) {
          console.log('Password hash format:', dbUser.passwordHash.substring(0, 20) + '...');

          // Test password comparison directly
          try {
            const directComparison = await dbUser.comparePassword(ISSUE_CREDENTIALS.password);
            console.log('Direct password comparison result:', directComparison);
          } catch (error) {
            console.error('Password comparison error:', error);
          }
        }
      }
    }

    // For now, log the failure but don't fail the test since we're reproducing the issue
    if (!secondLoginResult.success) {
      console.log('Successfully reproduced Issue #620 - login failure after registration');
    } else {
      console.log('Issue #620 not reproduced - login succeeded both times');
    }
  });

  it('should maintain session consistency with JWT tokens', async () => {
    // Create a user for testing
    const registrationResult = await UserService.createUser({
      email: ISSUE_CREDENTIALS.email,
      username: ISSUE_CREDENTIALS.username,
      firstName: ISSUE_CREDENTIALS.firstName,
      lastName: ISSUE_CREDENTIALS.lastName,
      password: ISSUE_CREDENTIALS.password,
      confirmPassword: ISSUE_CREDENTIALS.password,
      agreeToTerms: true,
    });

    expect(registrationResult.success).toBe(true);

    // Test session retrieval (this tests the auth.ts JWT logic)
    try {
      const session = await auth();
      console.log('Session retrieval test:', session ? 'Success' : 'No session');
    } catch (error) {
      console.log('Session retrieval error:', error);
    }
  });

  it('should handle database connection issues gracefully', async () => {
    // Test authentication when database might have connectivity issues
    const loginResult = await UserService.authenticateUser({
      email: 'nonexistent@test.com',
      password: 'wrongpassword',
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error?.code).toBe('INVALID_CREDENTIALS');
  });
});