/**
 * Integration test for UserService.createUser to debug the 500 error
 * This test uses the real UserService without mocking to identify the issue
 */

import { UserService } from '../UserService';

describe('UserService Integration - Issue #439', () => {

  describe('createUser real implementation', () => {
    const validUserData = {
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser123',
      email: 'test@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      agreeToTerms: true,
      subscribeToNewsletter: false,
    };

    it('should create user successfully with bypass email verification', async () => {
      // Ensure BYPASS_EMAIL_VERIFICATION is set
      const originalValue = process.env.BYPASS_EMAIL_VERIFICATION;
      process.env.BYPASS_EMAIL_VERIFICATION = 'true';

      try {
        console.log('Testing createUser with data:', validUserData);

        const result = await UserService.createUser(validUserData);

        console.log('UserService.createUser result:', JSON.stringify(result, null, 2));

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.user).toBeDefined();
        expect(result.data?.user.email).toBe(validUserData.email);
        expect(result.data?.emailBypass).toBe(true);
      } catch (error) {
        console.error('Error during createUser test:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw error;
      } finally {
        // Restore original value
        if (originalValue !== undefined) {
          process.env.BYPASS_EMAIL_VERIFICATION = originalValue;
        } else {
          delete process.env.BYPASS_EMAIL_VERIFICATION;
        }
      }
    });

    it('should handle duplicate email error correctly', async () => {
      // Ensure BYPASS_EMAIL_VERIFICATION is set
      const originalValue = process.env.BYPASS_EMAIL_VERIFICATION;
      process.env.BYPASS_EMAIL_VERIFICATION = 'true';

      try {
        // Create first user
        const firstResult = await UserService.createUser(validUserData);
        expect(firstResult.success).toBe(true);

        // Try to create user with same email
        const duplicateResult = await UserService.createUser(validUserData);
        console.log('Duplicate user result:', JSON.stringify(duplicateResult, null, 2));

        expect(duplicateResult.success).toBe(false);
        expect(duplicateResult.error?.statusCode).toBe(409);
      } finally {
        // Restore original value
        if (originalValue !== undefined) {
          process.env.BYPASS_EMAIL_VERIFICATION = originalValue;
        } else {
          delete process.env.BYPASS_EMAIL_VERIFICATION;
        }
      }
    });

    it('should handle invalid password correctly', async () => {
      const invalidUserData = {
        ...validUserData,
        password: 'weak',
        confirmPassword: 'weak',
      };

      try {
        const result = await UserService.createUser(invalidUserData);
        console.log('Invalid password result:', JSON.stringify(result, null, 2));

        expect(result.success).toBe(false);
        expect(result.error?.statusCode).toBe(400);
      } catch (error) {
        console.error('Error during invalid password test:', error);
        throw error;
      }
    });
  });
});