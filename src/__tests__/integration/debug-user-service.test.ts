/**
 * Debug test to understand UserService failures
 */
import { describe, it } from '@jest/globals';
import { UserService } from '@/lib/services';

describe('Debug UserService', () => {
  it('should reveal UserService errors', async () => {
    console.log('Testing UserService.createUser...');

    const result = await UserService.createUser({
      email: 'debug@test.com',
      username: 'debuguser',
      firstName: 'Debug',
      lastName: 'User',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      agreeToTerms: true,
    });

    console.log('Registration result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.log('Registration failed with error:', result.error);
    }
  });
});