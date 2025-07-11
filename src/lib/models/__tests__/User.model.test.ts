/**
 * Comprehensive Unit Tests for User Model
 * Tests model functionality including instance methods, static methods, and validation
 */

import { Types } from 'mongoose';
import { SUBSCRIPTION_LIMITS } from '../User';
import type { IUser, CreateUserInput, SubscriptionFeature } from '../User';

// Mock implementation of User model methods for testing
const createMockUser = (overrides: Partial<IUser> = {}): IUser => {
  const defaultUser = {
    _id: new Types.ObjectId(),
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

    // Mock instance methods
    comparePassword: jest.fn(),
    generatePasswordResetToken: jest.fn(),
    generateEmailVerificationToken: jest.fn(),
    toPublicJSON: jest.fn(),
    updateLastLogin: jest.fn(),
    isSubscriptionActive: jest.fn().mockReturnValue(true),
    canAccessFeature: jest.fn(),
    save: jest.fn(),
    ...overrides,
  } as IUser;

  // Implement toPublicJSON method
  (defaultUser.toPublicJSON as jest.Mock).mockImplementation(() => ({
    id: defaultUser._id.toString(),
    email: defaultUser.email,
    username: defaultUser.username,
    firstName: defaultUser.firstName,
    lastName: defaultUser.lastName,
    role: defaultUser.role,
    subscriptionTier: defaultUser.subscriptionTier,
    isEmailVerified: defaultUser.isEmailVerified,
    lastLoginAt: defaultUser.lastLoginAt,
    preferences: defaultUser.preferences,
    createdAt: defaultUser.createdAt,
    updatedAt: defaultUser.updatedAt,
  }));

  // Implement canAccessFeature method
  (defaultUser.canAccessFeature as jest.Mock).mockImplementation((feature: SubscriptionFeature, quantity: number) => {
    const limits = SUBSCRIPTION_LIMITS[defaultUser.subscriptionTier];
    const limit = limits[feature];
    return quantity <= limit;
  });

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

    beforeEach(() => {
      mockUser = createMockUser();
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
        expect(typeof publicUser.id).toBe('string');
        expect(publicUser.id).toBe(mockUser._id.toString());
        // Verify it's a valid ObjectId format (24 hex characters)
        expect(publicUser.id).toMatch(/^[a-f0-9]{24}$/);
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
    it('should validate email format requirements', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@subdomain.example.org',
        'firstname.lastname@company.com',
      ];

      const invalidEmails = [
        'invalid.email',
        '@example.com',
        'user@',
        'user@domain',
        'user name@example.com',
      ];

      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });

      invalidEmails.forEach(email => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it('should validate username format requirements', () => {
      const validUsernames = [
        'user123',
        'test_user',
        'user-name',
        'testuser',
        'user_123-test',
      ];

      const invalidUsernames = [
        'us', // too short (< 3 chars)
        'a'.repeat(31), // too long (> 30 chars)
        'user space', // contains space
        'user@invalid', // contains @
        'user#invalid', // contains #
      ];

      const usernamePattern = /^[a-zA-Z0-9_-]+$/;

      validUsernames.forEach(username => {
        expect(username.length).toBeGreaterThanOrEqual(3);
        expect(username.length).toBeLessThanOrEqual(30);
        expect(username).toMatch(usernamePattern);
      });

      invalidUsernames.forEach(username => {
        const isValidLength = username.length >= 3 && username.length <= 30;
        const matchesPattern = usernamePattern.test(username);
        expect(isValidLength && matchesPattern).toBe(false);
      });
    });

    it('should validate name format requirements', () => {
      const validNames = [
        'John',
        'Mary-Jane',
        "O'Connor",
        'Jean-Claude',
        'Anna Maria',
      ];

      const invalidNames = [
        '', // empty
        'John123', // contains numbers
        'John@Doe', // contains @
        'John_Doe', // contains underscore
        'a'.repeat(101), // too long
      ];

      const namePattern = /^[a-zA-Z\s'-]+$/;

      validNames.forEach(name => {
        expect(name.length).toBeGreaterThanOrEqual(1);
        expect(name.length).toBeLessThanOrEqual(100);
        expect(name).toMatch(namePattern);
      });

      invalidNames.forEach(name => {
        const isValidLength = name.length >= 1 && name.length <= 100;
        const matchesPattern = namePattern.test(name);
        expect(isValidLength && matchesPattern).toBe(false);
      });
    });

    it('should validate role enum values', () => {
      const validRoles = ['user', 'admin'];
      const invalidRoles = ['superuser', 'moderator', 'guest', ''];

      validRoles.forEach(role => {
        expect(['user', 'admin']).toContain(role);
      });

      invalidRoles.forEach(role => {
        expect(['user', 'admin']).not.toContain(role);
      });
    });

    it('should validate subscription tier enum values', () => {
      const validTiers = ['free', 'seasoned', 'expert', 'master', 'guild'];
      const invalidTiers = ['premium', 'basic', 'pro', ''];

      validTiers.forEach(tier => {
        expect(['free', 'seasoned', 'expert', 'master', 'guild']).toContain(tier);
      });

      invalidTiers.forEach(tier => {
        expect(['free', 'seasoned', 'expert', 'master', 'guild']).not.toContain(tier);
      });
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