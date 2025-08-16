import '../__test-helpers__/test-setup';
import { UserService } from '../UserService';
import { DatabaseTransaction } from '../DatabaseTransaction';
import { connectToDatabase } from '../../db';
const User = require('../../models/User').default;

// Integration test for transaction functionality
describe('UserService Transaction Integration', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  beforeEach(async () => {
    // Clean up any existing test users
    await User.deleteMany({ email: { $regex: /@test\.example$/ } });
  });

  afterEach(async () => {
    // Clean up test users
    await User.deleteMany({ email: { $regex: /@test\.example$/ } });
  });

  describe('Transaction Support Detection', () => {
    it('should detect transaction support correctly', async () => {
      const isSupported = await DatabaseTransaction.isTransactionSupported();
      // This will be true in replica set environments, false in standalone MongoDB
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('User Creation with Transactions', () => {
    it('should create user atomically with email verification token', async () => {
      const userData = {
        email: 'transaction.user@test.example',
        username: 'transactionuser',
        firstName: 'Transaction',
        lastName: 'User',
        password: 'SecurePassword123!',
      };

      // Set environment to require email verification
      const originalBypass = process.env.BYPASS_EMAIL_VERIFICATION;
      process.env.BYPASS_EMAIL_VERIFICATION = 'false';

      try {
        const result = await UserService.createUser(userData);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.user.email).toBe(userData.email);
          expect(result.data.user.isEmailVerified).toBe(false);

          // Verify user was saved to database
          const savedUser = await User.findByEmail(userData.email);
          expect(savedUser).toBeTruthy();
          expect(savedUser?.emailVerificationToken).toBeTruthy();
        }
      } finally {
        // Restore original environment
        if (originalBypass) {
          process.env.BYPASS_EMAIL_VERIFICATION = originalBypass;
        } else {
          delete process.env.BYPASS_EMAIL_VERIFICATION;
        }
      }
    });

    it('should handle user creation failure atomically', async () => {
      const userData = {
        email: 'invalid-email', // Invalid email to trigger validation error
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePassword123!',
      };

      const result = await UserService.createUser(userData);

      expect(result.success).toBe(false);

      // Verify no partial data was saved
      const savedUser = await User.findOne({ username: userData.username });
      expect(savedUser).toBeNull();
    });
  });

  describe('Password Reset with Transactions', () => {
    let testUser: any;

    beforeEach(async () => {
      // Create a test user
      const userData = {
        email: 'password.reset@test.example',
        username: 'passwordreset',
        firstName: 'Password',
        lastName: 'Reset',
        password: 'OriginalPassword123!',
      };

      const result = await UserService.createUser(userData);
      expect(result.success).toBe(true);

      testUser = await User.findByEmail(userData.email);
      expect(testUser).toBeTruthy();
    });

    it('should generate password reset token atomically', async () => {
      const resetRequest = { email: testUser.email };

      const result = await UserService.requestPasswordReset(resetRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toBeTruthy();

        // Verify token was saved to database
        const updatedUser = await User.findByEmail(testUser.email);
        expect(updatedUser?.passwordResetToken).toBeTruthy();
        expect(updatedUser?.passwordResetExpires).toBeTruthy();
      }
    });

    it('should reset password and clear tokens atomically', async () => {
      // First generate a reset token
      const resetRequest = { email: testUser.email };
      const tokenResult = await UserService.requestPasswordReset(resetRequest);
      expect(tokenResult.success).toBe(true);

      if (tokenResult.success) {
        const resetData = {
          token: tokenResult.data.token,
          password: 'NewSecurePassword123!',
        };

        const result = await UserService.resetPassword(resetData);

        expect(result.success).toBe(true);

        // Verify password was updated and tokens were cleared
        const updatedUser = await User.findByEmail(testUser.email);
        expect(updatedUser).toBeTruthy();
        expect(updatedUser?.passwordResetToken).toBeFalsy();
        expect(updatedUser?.passwordResetExpires).toBeFalsy();

        // Verify new password works
        const isPasswordValid = await updatedUser?.comparePassword('NewSecurePassword123!');
        expect(isPasswordValid).toBe(true);
      }
    });
  });

  describe('Email Verification with Transactions', () => {
    let testUser: any;

    beforeEach(async () => {
      // Create a test user with email verification required
      const originalBypass = process.env.BYPASS_EMAIL_VERIFICATION;
      process.env.BYPASS_EMAIL_VERIFICATION = 'false';

      try {
        const userData = {
          email: 'email.verify@test.example',
          username: 'emailverify',
          firstName: 'Email',
          lastName: 'Verify',
          password: 'SecurePassword123!',
        };

        const result = await UserService.createUser(userData);
        expect(result.success).toBe(true);

        testUser = await User.findByEmail(userData.email);
        expect(testUser).toBeTruthy();
        expect(testUser.isEmailVerified).toBe(false);
        expect(testUser.emailVerificationToken).toBeTruthy();
      } finally {
        if (originalBypass) {
          process.env.BYPASS_EMAIL_VERIFICATION = originalBypass;
        } else {
          delete process.env.BYPASS_EMAIL_VERIFICATION;
        }
      }
    });

    it('should verify email and clear token atomically', async () => {
      const verificationData = {
        token: testUser.emailVerificationToken,
      };

      const result = await UserService.verifyEmail(verificationData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isEmailVerified).toBe(true);

        // Verify both email verification status and token clearing
        const updatedUser = await User.findByEmail(testUser.email);
        expect(updatedUser?.isEmailVerified).toBe(true);
        expect(updatedUser?.emailVerificationToken).toBeFalsy();
      }
    });
  });

  describe('Profile Update with Transactions', () => {
    let testUser: any;

    beforeEach(async () => {
      const userData = {
        email: 'profile.update@test.example',
        username: 'profileupdate',
        firstName: 'Profile',
        lastName: 'Update',
        password: 'SecurePassword123!',
      };

      const result = await UserService.createUser(userData);
      expect(result.success).toBe(true);

      testUser = await User.findByEmail(userData.email);
      expect(testUser).toBeTruthy();
    });

    it('should update profile fields atomically', async () => {
      const updateData = {
        firstName: 'UpdatedProfile',
        lastName: 'UpdatedUser',
        displayName: 'Updated Display Name',
      };

      const result = await UserService.updateUserProfile(testUser._id.toString(), updateData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe(updateData.firstName);
        expect(result.data.lastName).toBe(updateData.lastName);

        // Verify all fields were updated atomically
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser?.firstName).toBe(updateData.firstName);
        expect(updatedUser?.lastName).toBe(updateData.lastName);
        expect(updatedUser?.displayName).toBe(updateData.displayName);
      }
    });

    it('should handle profile update conflicts atomically', async () => {
      // Create another user with a conflicting email
      const conflictUserData = {
        email: 'conflict.user@test.example',
        username: 'conflictuser',
        firstName: 'Conflict',
        lastName: 'User',
        password: 'SecurePassword123!',
      };

      await UserService.createUser(conflictUserData);

      // Try to update test user with conflicting email
      const updateData = {
        email: 'conflict.user@test.example', // This should conflict
        firstName: 'ShouldNotUpdate',
      };

      const result = await UserService.updateUserProfile(testUser._id.toString(), updateData);

      expect(result.success).toBe(false);

      // Verify no partial updates occurred
      const unchangedUser = await User.findById(testUser._id);
      expect(unchangedUser?.firstName).toBe(testUser.firstName);
      expect(unchangedUser?.email).toBe(testUser.email);
    });
  });
});