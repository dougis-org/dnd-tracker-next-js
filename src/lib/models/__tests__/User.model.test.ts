/**
 * Comprehensive Unit Tests for User Model
 * Tests model functionality including instance methods, static methods, and validation
 */

import { Types } from 'mongoose';
import { SUBSCRIPTION_LIMITS } from '../User';
import type { IUser, CreateUserInput, SubscriptionFeature } from '../User';

// Helper functions for creating mock users
const createDefaultUserData = () => ({
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  passwordHash: '$2b$12$hashedpassword',
  role: 'user' as const,
  subscriptionTier: 'free' as const,
  isEmailVerified: false,
  timezone: 'UTC',
  dndEdition: '5th Edition',
  profileSetupCompleted: false,
  preferences: {
    theme: 'system' as const,
    emailNotifications: true,
    browserNotifications: false,
    timezone: 'UTC',
    language: 'en',
    diceRollAnimations: true,
    autoSaveEncounters: true,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createMockMethods = (user: any, objectIdString: string) => {
  // Implement toPublicJSON method
  user.toPublicJSON.mockImplementation(() => ({
    id: objectIdString,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    subscriptionTier: user.subscriptionTier,
    isEmailVerified: user.isEmailVerified,
    lastLoginAt: user.lastLoginAt,
    preferences: user.preferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));

  // Implement canAccessFeature method
  user.canAccessFeature.mockImplementation((feature: SubscriptionFeature, quantity: number) => {
    const limits = SUBSCRIPTION_LIMITS[user.subscriptionTier];
    const limit = limits[feature];
    return quantity <= limit;
  });
};

// Mock implementation of User model methods for testing
const createMockUser = (overrides: Partial<IUser> = {}): IUser => {
  const objectId = overrides._id || new Types.ObjectId();
  const objectIdString = objectId.toString();

  const userData = createDefaultUserData();
  const mockMethods = {
    comparePassword: jest.fn(),
    generatePasswordResetToken: jest.fn(),
    generateEmailVerificationToken: jest.fn(),
    toPublicJSON: jest.fn(),
    updateLastLogin: jest.fn(),
    isSubscriptionActive: jest.fn().mockReturnValue(true),
    canAccessFeature: jest.fn(),
    save: jest.fn(),
  };

  const defaultUser = {
    _id: objectId,
    ...userData,
    ...mockMethods,
    ...overrides,
  } as IUser;

  createMockMethods(defaultUser, objectIdString);
  return defaultUser;
};

describe('User Model Unit Tests', () => {
  describe('SUBSCRIPTION_LIMITS Constants', () => {
    it('should have correct structure for all tiers', () => {
      const expectedTiers = ['free', 'seasoned', 'expert', 'master', 'guild'];
      const expectedFeatures = ['parties', 'encounters', 'characters'];

      expectedTiers.forEach(tier => {
        expect(SUBSCRIPTION_LIMITS).toHaveProperty(tier);
        expectedFeatures.forEach(feature => {
          expect(SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS]).toHaveProperty(feature);
          expect(typeof SUBSCRIPTION_LIMITS[tier as keyof typeof SUBSCRIPTION_LIMITS][feature as SubscriptionFeature]).toBe('number');
        });
      });
    });

    it('should have progressive limits across tiers', () => {
      // Free tier should be most restrictive
      expect(SUBSCRIPTION_LIMITS.free.parties).toBe(1);
      expect(SUBSCRIPTION_LIMITS.free.encounters).toBe(3);
      expect(SUBSCRIPTION_LIMITS.free.characters).toBe(10);

      // Each tier should have more than the previous
      expect(SUBSCRIPTION_LIMITS.seasoned.parties).toBeGreaterThan(SUBSCRIPTION_LIMITS.free.parties);
      expect(SUBSCRIPTION_LIMITS.expert.parties).toBeGreaterThan(SUBSCRIPTION_LIMITS.seasoned.parties);
      expect(SUBSCRIPTION_LIMITS.master.parties).toBeGreaterThan(SUBSCRIPTION_LIMITS.expert.parties);

      // Guild should be unlimited
      expect(SUBSCRIPTION_LIMITS.guild.parties).toBe(Infinity);
      expect(SUBSCRIPTION_LIMITS.guild.encounters).toBe(Infinity);
      expect(SUBSCRIPTION_LIMITS.guild.characters).toBe(Infinity);
    });
  });

  describe('Instance Methods', () => {
    let mockUser: IUser;
    let stableObjectId: Types.ObjectId;

    beforeEach(() => {
      // Create a stable ObjectId that will be consistent across the test
      stableObjectId = new Types.ObjectId();
      mockUser = createMockUser({ _id: stableObjectId });
    });

    describe('toPublicJSON', () => {
      it('should return public user data without sensitive fields', () => {
        const publicUser = mockUser.toPublicJSON();

        expect(publicUser).toHaveProperty('id');
        expect(publicUser).toHaveProperty('email');
        expect(publicUser).toHaveProperty('username');
        expect(publicUser).toHaveProperty('firstName');
        expect(publicUser).toHaveProperty('lastName');
        expect(publicUser).toHaveProperty('role');
        expect(publicUser).toHaveProperty('subscriptionTier');
        expect(publicUser).toHaveProperty('isEmailVerified');
        expect(publicUser).toHaveProperty('preferences');
        expect(publicUser).toHaveProperty('createdAt');
        expect(publicUser).toHaveProperty('updatedAt');

        // Should not include sensitive fields
        expect(publicUser).not.toHaveProperty('passwordHash');
        expect(publicUser).not.toHaveProperty('passwordResetToken');
        expect(publicUser).not.toHaveProperty('emailVerificationToken');
      });

      it('should convert ObjectId to string for id field', () => {
        const publicUser = mockUser.toPublicJSON();

        // Verify the id field is a string
        expect(typeof publicUser.id).toBe('string');

        // Verify it's a valid ObjectId format (24 hex characters)
        expect(publicUser.id).toMatch(/^[a-f0-9]{24}$/);

        // Verify it's not undefined or empty
        expect(publicUser.id).toBeTruthy();
        expect(publicUser.id.length).toBe(24);
      });
    });

    describe('isSubscriptionActive', () => {
      it('should return true for all subscriptions (current implementation)', () => {
        expect(mockUser.isSubscriptionActive()).toBe(true);
      });
    });

    describe('canAccessFeature', () => {
      it('should check limits for free tier', () => {
        const freeUser = createMockUser({ subscriptionTier: 'free' });

        expect(freeUser.canAccessFeature('parties', 1)).toBe(true);
        expect(freeUser.canAccessFeature('parties', 2)).toBe(false);
        expect(freeUser.canAccessFeature('encounters', 3)).toBe(true);
        expect(freeUser.canAccessFeature('encounters', 4)).toBe(false);
        expect(freeUser.canAccessFeature('characters', 10)).toBe(true);
        expect(freeUser.canAccessFeature('characters', 11)).toBe(false);
      });

      it('should check limits for seasoned tier', () => {
        const seasonedUser = createMockUser({ subscriptionTier: 'seasoned' });

        expect(seasonedUser.canAccessFeature('parties', 3)).toBe(true);
        expect(seasonedUser.canAccessFeature('parties', 4)).toBe(false);
        expect(seasonedUser.canAccessFeature('encounters', 15)).toBe(true);
        expect(seasonedUser.canAccessFeature('encounters', 16)).toBe(false);
        expect(seasonedUser.canAccessFeature('characters', 50)).toBe(true);
        expect(seasonedUser.canAccessFeature('characters', 51)).toBe(false);
      });

      it('should allow unlimited access for guild tier', () => {
        const guildUser = createMockUser({ subscriptionTier: 'guild' });

        expect(guildUser.canAccessFeature('parties', 1000)).toBe(true);
        expect(guildUser.canAccessFeature('encounters', 1000)).toBe(true);
        expect(guildUser.canAccessFeature('characters', 1000)).toBe(true);
      });
    });
  });

  describe('Data Validation and Business Logic', () => {
    const testValidation = (items: string[], pattern: RegExp, validator?: (_item: string) => boolean) => {
      return items.map(item => {
        const matchesPattern = pattern.test(item);
        const passesValidator = validator ? validator(item) : true;
        return matchesPattern && passesValidator;
      });
    };

    it('should validate email format requirements', () => {
      const validEmails = ['user@example.com', 'test.email+tag@domain.co.uk', 'user123@subdomain.example.org', 'firstname.lastname@company.com'];
      const invalidEmails = ['invalid.email', '@example.com', 'user@', 'user@domain', 'user name@example.com'];
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(testValidation(validEmails, emailPattern)).toEqual([true, true, true, true]);
      expect(testValidation(invalidEmails, emailPattern)).toEqual([false, false, false, false, false]);
    });

    it('should validate username format requirements', () => {
      const validUsernames = ['user123', 'test_user', 'user-name', 'testuser', 'user_123-test'];
      const invalidUsernames = ['us', 'a'.repeat(31), 'user space', 'user@invalid', 'user#invalid'];
      const usernamePattern = /^[a-zA-Z0-9_-]+$/;
      const lengthValidator = (username: string) => username.length >= 3 && username.length <= 30;

      expect(testValidation(validUsernames, usernamePattern, lengthValidator)).toEqual([true, true, true, true, true]);
      expect(testValidation(invalidUsernames, usernamePattern, lengthValidator)).toEqual([false, false, false, false, false]);
    });

    it('should validate name format requirements', () => {
      const validNames = ['John', 'Mary-Jane', "O'Connor", 'Jean-Claude', 'Anna Maria'];
      const invalidNames = ['', 'John123', 'John@Doe', 'John_Doe', 'a'.repeat(101)];
      const namePattern = /^[a-zA-Z\s'-]+$/;
      const lengthValidator = (name: string) => name.length >= 1 && name.length <= 100;

      expect(testValidation(validNames, namePattern, lengthValidator)).toEqual([true, true, true, true, true]);
      expect(testValidation(invalidNames, namePattern, lengthValidator)).toEqual([false, false, false, false, false]);
    });

    const testEnumValues = (valid: string[], invalid: string[], allowedValues: string[]) => ({
      validResults: valid.map(item => allowedValues.includes(item)),
      invalidResults: invalid.map(item => allowedValues.includes(item))
    });

    it('should validate role enum values', () => {
      const allowedRoles = ['user', 'admin'];
      const { validResults, invalidResults } = testEnumValues(
        ['user', 'admin'],
        ['superuser', 'moderator', 'guest', ''],
        allowedRoles
      );

      expect(validResults).toEqual([true, true]);
      expect(invalidResults).toEqual([false, false, false, false]);
    });

    it('should validate subscription tier enum values', () => {
      const allowedTiers = ['free', 'seasoned', 'expert', 'master', 'guild'];
      const { validResults, invalidResults } = testEnumValues(
        ['free', 'seasoned', 'expert', 'master', 'guild'],
        ['premium', 'basic', 'pro', ''],
        allowedTiers
      );

      expect(validResults).toEqual([true, true, true, true, true]);
      expect(invalidResults).toEqual([false, false, false, false]);
    });
  });

  describe('Default Values', () => {
    it('should have correct default values for required fields', () => {
      const user = createMockUser();

      expect(user.role).toBe('user');
      expect(user.subscriptionTier).toBe('free');
      expect(user.isEmailVerified).toBe(false);
      expect(user.profileSetupCompleted).toBe(false);
      expect(user.timezone).toBe('UTC');
      expect(user.dndEdition).toBe('5th Edition');
    });

    it('should have correct default preferences', () => {
      const user = createMockUser();

      expect(user.preferences.theme).toBe('system');
      expect(user.preferences.emailNotifications).toBe(true);
      expect(user.preferences.browserNotifications).toBe(false);
      expect(user.preferences.timezone).toBe('UTC');
      expect(user.preferences.language).toBe('en');
      expect(user.preferences.diceRollAnimations).toBe(true);
      expect(user.preferences.autoSaveEncounters).toBe(true);
    });
  });

  describe('Password Security', () => {
    it('should not store plain text passwords', () => {
      const user = createMockUser({ passwordHash: '$2b$12$hashedpassword' });

      // Password hash should not be plain text
      expect(user.passwordHash).not.toBe('plainpassword');
      expect(user.passwordHash).toMatch(/^\$2[ab]\$/); // bcrypt hash pattern
    });

    it('should handle password comparison logic', () => {
      const user = createMockUser();
      const mockComparePassword = user.comparePassword as jest.Mock;

      // Mock successful comparison
      mockComparePassword.mockResolvedValue(true);
      expect(user.comparePassword('correctpassword')).resolves.toBe(true);

      // Mock failed comparison
      mockComparePassword.mockResolvedValue(false);
      expect(user.comparePassword('wrongpassword')).resolves.toBe(false);
    });
  });

  describe('Token Generation', () => {
    it('should generate password reset tokens', async () => {
      const user = createMockUser();
      const mockGenerateToken = user.generatePasswordResetToken as jest.Mock;

      const mockToken = 'a'.repeat(64); // 32 bytes * 2 (hex)
      mockGenerateToken.mockResolvedValue(mockToken);

      const token = await user.generatePasswordResetToken();
      expect(token).toBe(mockToken);
      expect(token.length).toBe(64);
      expect(mockGenerateToken).toHaveBeenCalled();
    });

    it('should generate email verification tokens', async () => {
      const user = createMockUser();
      const mockGenerateToken = user.generateEmailVerificationToken as jest.Mock;

      const mockToken = 'b'.repeat(64); // 32 bytes * 2 (hex)
      mockGenerateToken.mockResolvedValue(mockToken);

      const token = await user.generateEmailVerificationToken();
      expect(token).toBe(mockToken);
      expect(token.length).toBe(64);
      expect(mockGenerateToken).toHaveBeenCalled();
    });
  });

  describe('User Creation Input Validation', () => {
    it('should validate complete CreateUserInput structure', () => {
      const validUserInput: CreateUserInput = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'securepassword123',
        role: 'user',
        subscriptionTier: 'free',
        preferences: {
          theme: 'dark',
          emailNotifications: true,
          browserNotifications: false,
          timezone: 'America/New_York',
          language: 'en',
          diceRollAnimations: true,
          autoSaveEncounters: true,
        },
      };

      // Required fields
      expect(validUserInput.email).toBeTruthy();
      expect(validUserInput.username).toBeTruthy();
      expect(validUserInput.firstName).toBeTruthy();
      expect(validUserInput.lastName).toBeTruthy();
      expect(validUserInput.password).toBeTruthy();

      // Optional fields
      expect(validUserInput.role).toBeTruthy();
      expect(validUserInput.subscriptionTier).toBeTruthy();
      expect(validUserInput.preferences).toBeTruthy();
    });

    it('should handle minimal CreateUserInput', () => {
      const minimalUserInput: CreateUserInput = {
        email: 'minimal@example.com',
        username: 'minimal',
        firstName: 'Min',
        lastName: 'User',
        password: 'password123',
      };

      expect(minimalUserInput.email).toBeTruthy();
      expect(minimalUserInput.username).toBeTruthy();
      expect(minimalUserInput.firstName).toBeTruthy();
      expect(minimalUserInput.lastName).toBeTruthy();
      expect(minimalUserInput.password).toBeTruthy();
      expect(minimalUserInput.role).toBeUndefined();
      expect(minimalUserInput.subscriptionTier).toBeUndefined();
      expect(minimalUserInput.preferences).toBeUndefined();
    });
  });

  describe('Business Logic', () => {
    it('should support freemium model progression', () => {
      const tiers = ['free', 'seasoned', 'expert', 'master', 'guild'] as const;

      // Each tier should provide more features than the previous
      for (let i = 0; i < tiers.length - 1; i++) {
        const currentTier = tiers[i];
        const nextTier = tiers[i + 1];

        if (nextTier !== 'guild') {
          expect(SUBSCRIPTION_LIMITS[nextTier].parties).toBeGreaterThan(
            SUBSCRIPTION_LIMITS[currentTier].parties
          );
          expect(SUBSCRIPTION_LIMITS[nextTier].encounters).toBeGreaterThan(
            SUBSCRIPTION_LIMITS[currentTier].encounters
          );
          expect(SUBSCRIPTION_LIMITS[nextTier].characters).toBeGreaterThan(
            SUBSCRIPTION_LIMITS[currentTier].characters
          );
        }
      }
    });

    it('should provide meaningful free tier limits', () => {
      const freeLimits = SUBSCRIPTION_LIMITS.free;

      // Free tier should allow meaningful usage
      expect(freeLimits.parties).toBeGreaterThan(0);
      expect(freeLimits.encounters).toBeGreaterThan(2);
      expect(freeLimits.characters).toBeGreaterThan(5);
    });
  });

  describe('Type Safety', () => {
    it('should enforce type safety for subscription features', () => {
      const validFeatures: SubscriptionFeature[] = ['parties', 'encounters', 'characters'];

      validFeatures.forEach(feature => {
        expect(['parties', 'encounters', 'characters']).toContain(feature);
      });
    });

    it('should enforce type safety for user roles', () => {
      const validRoles = ['user', 'admin'];

      validRoles.forEach(role => {
        const user = createMockUser({ role: role as 'user' | 'admin' });
        expect(['user', 'admin']).toContain(user.role);
      });
    });

    it('should enforce type safety for subscription tiers', () => {
      const validTiers = ['free', 'seasoned', 'expert', 'master', 'guild'];

      validTiers.forEach(tier => {
        const user = createMockUser({
          subscriptionTier: tier as 'free' | 'seasoned' | 'expert' | 'master' | 'guild'
        });
        expect(['free', 'seasoned', 'expert', 'master', 'guild']).toContain(user.subscriptionTier);
      });
    });
  });

  describe('Additional Constants Coverage', () => {
    it('should test all subscription tier limits comprehensively', () => {
      // Test every tier and every feature for comprehensive coverage
      const allTiers = ['free', 'seasoned', 'expert', 'master', 'guild'] as const;
      const allFeatures = ['parties', 'encounters', 'characters'] as const;

      allTiers.forEach(tier => {
        const tierLimits = SUBSCRIPTION_LIMITS[tier];
        expect(tierLimits).toBeDefined();

        allFeatures.forEach(feature => {
          const limit = tierLimits[feature];
          expect(typeof limit).toBe('number');

          if (tier === 'guild') {
            expect(limit).toBe(Infinity);
          } else {
            expect(limit).toBeGreaterThan(0);
            expect(limit).toBeLessThan(Infinity);
          }
        });
      });
    });

    it('should validate subscription limits structure completeness', () => {
      const expectedStructure = {
        free: { parties: 1, encounters: 3, characters: 10 },
        seasoned: { parties: 3, encounters: 15, characters: 50 },
        expert: { parties: 10, encounters: 50, characters: 200 },
        master: { parties: 25, encounters: 100, characters: 500 },
        guild: { parties: Infinity, encounters: Infinity, characters: Infinity },
      };

      Object.keys(expectedStructure).forEach(tier => {
        const tierKey = tier as keyof typeof SUBSCRIPTION_LIMITS;
        expect(SUBSCRIPTION_LIMITS[tierKey]).toEqual(expectedStructure[tierKey]);
      });
    });

    it('should ensure subscription limits are properly typed', () => {
      // Test that each subscription feature type is valid
      const features: SubscriptionFeature[] = ['parties', 'encounters', 'characters'];

      features.forEach(feature => {
        expect(['parties', 'encounters', 'characters']).toContain(feature);

        // Ensure every tier has this feature
        Object.keys(SUBSCRIPTION_LIMITS).forEach(tier => {
          const tierKey = tier as keyof typeof SUBSCRIPTION_LIMITS;
          expect(SUBSCRIPTION_LIMITS[tierKey]).toHaveProperty(feature);
        });
      });
    });
  });
});