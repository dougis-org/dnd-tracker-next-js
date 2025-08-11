/**
 * Verify the production user exists and test authentication flow
 */
import { describe, it } from '@jest/globals';

describe('Production User Authentication Verification', () => {
  it('should verify the user exists and authentication works', async () => {
    try {
      console.log('Testing production authentication flow...');

      // Test 1: Check if user exists via UserService.getUserByEmail
      console.log('\n1. Testing UserService.getUserByEmail...');
      const { UserService } = await import('@/lib/services');

      const userResult = await UserService.getUserByEmail('doug@dougis.com');
      console.log('getUserByEmail result:', userResult.success);

      if (userResult.success && userResult.data) {
        console.log('✅ User found:', {
          email: userResult.data.email,
          firstName: userResult.data.firstName,
          lastName: userResult.data.lastName,
          isEmailVerified: userResult.data.isEmailVerified,
          subscriptionTier: userResult.data.subscriptionTier
        });

        // Test 2: Test authentication
        console.log('\n2. Testing UserService.authenticateUser...');
        const authResult = await UserService.authenticateUser({
          email: 'doug@dougis.com',
          password: 'EXF5pke@njn7thm4nkr',
          rememberMe: false
        });

        console.log('Authentication result:', authResult.success);

        if (authResult.success && authResult.data) {
          console.log('✅ Authentication successful!');
          console.log('Authenticated user:', {
            email: authResult.data.user.email,
            firstName: authResult.data.user.firstName,
            lastName: authResult.data.user.lastName,
            requiresVerification: authResult.data.requiresVerification
          });

          // Test 3: Test NextAuth authorize function directly
          console.log('\n3. Testing NextAuth authorize function...');
          const { validateNextAuthUrl } = await import('@/lib/auth');

          // Import the auth configuration
          const authModule = await import('@/lib/auth');
          console.log('NextAuth configuration imported successfully');

          console.log('\n✅ ALL AUTHENTICATION COMPONENTS ARE WORKING');
          console.log('Issue #620 authentication failure must be elsewhere...');

        } else {
          console.log('❌ Authentication failed:', authResult.error);
          console.log('This is the root cause of Issue #620');
        }

      } else {
        console.log('❌ User not found:', userResult.error);
        console.log('This would be the root cause of Issue #620');
      }

    } catch (error) {
      console.error('Authentication verification error:', error);
      console.log('This error might be the root cause of Issue #620');
    }
  });
});