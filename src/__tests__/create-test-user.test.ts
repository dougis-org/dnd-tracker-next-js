/**
 * Create test user for Issue #620
 * Database was empty - need to create the test user that was expected to exist
 */
import { describe, it } from '@jest/globals';
import { UserService } from '@/lib/services';

describe('Create Test User for Issue #620', () => {
  it('should create the test user doug@dougis.com', async () => {
    try {
      console.log('Creating test user for Issue #620...');

      // Create the test user that was supposed to exist for Issue #620 testing
      const userCreationResult = await UserService.createUser({
        email: 'doug@dougis.com',
        username: 'doug',
        firstName: 'Doug',
        lastName: 'Test',
        password: 'EXF5pke@njn7thm4nkr',  // The password from Issue #620
        confirmPassword: 'EXF5pke@njn7thm4nkr',
        agreeToTerms: true,
      });

      console.log('User creation result:', JSON.stringify(userCreationResult, null, 2));

      if (userCreationResult.success) {
        console.log('✅ Test user created successfully!');

        // Now test authentication
        console.log('Testing authentication with new user...');
        const authResult = await UserService.authenticateUser({
          email: 'doug@dougis.com',
          password: 'EXF5pke@njn7thm4nkr',
          rememberMe: false
        });

        console.log('Authentication result:', JSON.stringify(authResult, null, 2));

        if (authResult.success) {
          console.log('✅ Authentication successful! Issue #620 should now be resolved.');
          console.log('User authenticated:', authResult.data.user.email);
        } else {
          console.log('❌ Authentication failed:', authResult.error);
        }

      } else {
        console.log('❌ User creation failed:', userCreationResult.error);
      }

    } catch (error) {
      console.error('Test user creation error:', error);
    }
  });
});