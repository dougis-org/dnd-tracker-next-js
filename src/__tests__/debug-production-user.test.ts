/**
 * Test to verify if the production test user exists
 */
import { describe, it } from '@jest/globals';
import { connectToDatabase } from '@/lib/db';
import { UserService } from '@/lib/services';

describe('Production User Validation', () => {
  it('should check if the test user doug@dougis.com exists', async () => {
    console.log('Connecting to database...');

    try {
      await connectToDatabase();
      console.log('Database connected successfully');

      const userResult = await UserService.getUserByEmail('doug@dougis.com');
      console.log('User lookup result:', JSON.stringify(userResult, null, 2));

      if (userResult.success) {
        console.log('User exists:', {
          email: userResult.data.email,
          firstName: userResult.data.firstName,
          lastName: userResult.data.lastName,
          isEmailVerified: userResult.data.isEmailVerified,
          subscriptionTier: userResult.data.subscriptionTier
        });
      } else {
        console.log('User not found:', userResult.error);
      }
    } catch (error) {
      console.error('Database connection error:', error);
    }
  });

  it('should test authentication for the test user', async () => {
    console.log('Testing authentication for doug@dougis.com...');

    try {
      const authResult = await UserService.authenticateUser({
        email: 'doug@dougis.com',
        password: 'EXF5pke@njn7thm4nkr',
        rememberMe: false
      });

      console.log('Authentication result:', JSON.stringify(authResult, null, 2));

      if (authResult.success) {
        console.log('Authentication successful for user:', authResult.data.user.email);
      } else {
        console.log('Authentication failed:', authResult.error);
      }
    } catch (error) {
      console.error('Authentication test error:', error);
    }
  });
});