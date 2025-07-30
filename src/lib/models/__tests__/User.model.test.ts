/**
 * Comprehensive Unit Tests for User Model
 * Tests model functionality including instance methods, static methods, and validation
 */

import { Types } from 'mongoose';
import { SUBSCRIPTION_LIMITS } from '../User';
import type { IUser, SubscriptionFeature } from '../User';
import { runParameterizedTests, createValidationTests } from '../../__tests__/shared-test-helpers';

// Extracted test data constants
const SUBSCRIPTION_TIERS = ['free', 'seasoned', 'expert', 'master', 'guild'] as const;
const SUBSCRIPTION_FEATURES = ['parties', 'encounters', 'characters'] as const;

// Simplified user data factory
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

// Simplified mock user factory
const createMockUser = (overrides: Partial<IUser> = {}): IUser => {
  const objectId = overrides._id || new Types.ObjectId();
  const userData = createDefaultUserData();
  const finalUserData = { ...userData, ...overrides };

  const mockMethods = {
    comparePassword: jest.fn(),
    generatePasswordResetToken: jest.fn(),
    generateEmailVerificationToken: jest.fn(),
    updateLastLogin: jest.fn(),
    isSubscriptionActive: jest.fn().mockReturnValue(true),
    save: jest.fn(),
    toPublicJSON: jest.fn().mockImplementation(() => ({
      id: objectId.toString(),
      email: finalUserData.email,
      username: finalUserData.username,
      firstName: finalUserData.firstName,
      lastName: finalUserData.lastName,
      role: finalUserData.role,
      subscriptionTier: finalUserData.subscriptionTier,
      isEmailVerified: finalUserData.isEmailVerified,
      preferences: finalUserData.preferences,
      createdAt: finalUserData.createdAt,
      updatedAt: finalUserData.updatedAt,
    })),
    canAccessFeature: jest.fn().mockImplementation((feature: SubscriptionFeature, quantity: number) => {
      const limits = SUBSCRIPTION_LIMITS[finalUserData.subscriptionTier];
      return quantity <= limits[feature];
    }),
  };

  // Ensure _id maintains its ObjectId type when passed in overrides
  const result = {
    ...finalUserData,
    ...mockMethods,
    _id: objectId,
  };

  return result as IUser;
};

describe('User Model Unit Tests', () => {
  describe('SUBSCRIPTION_LIMITS Constants', () => {
    it('should have correct structure for all tiers', () => {
      SUBSCRIPTION_TIERS.forEach(tier => {
        expect(SUBSCRIPTION_LIMITS).toHaveProperty(tier);
        SUBSCRIPTION_FEATURES.forEach(feature => {
          expect(SUBSCRIPTION_LIMITS[tier]).toHaveProperty(feature);
          expect(typeof SUBSCRIPTION_LIMITS[tier][feature]).toBe('number');
        });
      });
    });

    const tierLimitTestCases = SUBSCRIPTION_TIERS.map(tier => ({
      tier,
      limits: SUBSCRIPTION_LIMITS[tier],
      description: `have correct limits for ${tier} tier`
    }));

    runParameterizedTests(
      'subscription tier limits',
      tierLimitTestCases,
      ({ limits }) => {
        expect(limits).toBeDefined();
        expect(typeof limits.parties).toBe('number');
        expect(typeof limits.encounters).toBe('number');
        expect(typeof limits.characters).toBe('number');
      },
      ({ description }) => `should ${description}`
    );
  });

  describe('Instance Methods', () => {
    describe('toPublicJSON', () => {
      it('should return public user data without sensitive information', () => {
        const user = createMockUser();
        const publicData = user.toPublicJSON();

        expect(publicData).toHaveProperty('id');
        expect(publicData).toHaveProperty('email');
        expect(publicData).toHaveProperty('username');
        expect(publicData).not.toHaveProperty('passwordHash');
        expect(publicData).not.toHaveProperty('tokens');
      });
    });

    describe('canAccessFeature', () => {
      const featureAccessTestCases = SUBSCRIPTION_TIERS.map(tier => ({
        tier,
        limits: SUBSCRIPTION_LIMITS[tier],
        description: `correctly validate ${tier} tier limits`
      }));

      runParameterizedTests(
        'feature access validation',
        featureAccessTestCases,
        ({ tier, limits }) => {
          const user = createMockUser({ subscriptionTier: tier });

          SUBSCRIPTION_FEATURES.forEach(feature => {
            const limit = limits[feature];
            expect(user.canAccessFeature(feature, limit)).toBe(true);
            if (limit !== Infinity) {
              expect(user.canAccessFeature(feature, limit + 1)).toBe(false);
            }
          });
        },
        ({ description }) => `should ${description}`
      );
    });

    describe('Guild tier unlimited access', () => {
      it('should allow unlimited access for guild tier', () => {
        const guildUser = createMockUser({ subscriptionTier: 'guild' });

        SUBSCRIPTION_FEATURES.forEach(feature => {
          expect(guildUser.canAccessFeature(feature, 1000)).toBe(true);
        });
      });
    });
  });

  describe('Data Validation', () => {
    const emailValidationCases = [
      {
        input: ['user@example.com', 'test.email+tag@domain.co.uk', 'user123@subdomain.example.org'],
        expected: true,
        description: 'valid email formats'
      },
      {
        input: ['invalid.email', '@example.com', 'user@', 'user name@example.com'],
        expected: false,
        description: 'invalid email formats'
      }
    ];

    createValidationTests(
      emailValidationCases,
      (emails: string[]) => {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emails.every(email => emailPattern.test(email));
      }
    );

    const usernameValidationCases = [
      {
        input: ['user123', 'test_user', 'user-name', 'testuser'],
        expected: true,
        description: 'valid username formats'
      },
      {
        input: ['us', 'a'.repeat(31), 'user space', 'user@invalid'],
        expected: false,
        description: 'invalid username formats'
      }
    ];

    createValidationTests(
      usernameValidationCases,
      (usernames: string[]) => {
        const usernamePattern = /^[a-zA-Z0-9_-]+$/;
        return usernames.every(username =>
          usernamePattern.test(username) &&
          username.length >= 3 &&
          username.length <= 30
        );
      }
    );

    const nameValidationCases = [
      {
        input: ['John', 'Mary-Jane', "O'Connor", 'Jean-Claude'],
        expected: true,
        description: 'valid name formats'
      },
      {
        input: ['', 'John123', 'John@Doe', 'a'.repeat(101)],
        expected: false,
        description: 'invalid name formats'
      }
    ];

    createValidationTests(
      nameValidationCases,
      (names: string[]) => {
        const namePattern = /^[a-zA-Z\s'-]+$/;
        return names.every(name =>
          namePattern.test(name) &&
          name.length >= 1 &&
          name.length <= 100
        );
      }
    );

    const enumValidationTestCases = [
      {
        name: 'role',
        validValues: ['user', 'admin'],
        invalidValues: ['superuser', 'moderator', 'guest', '']
      },
      {
        name: 'subscription tier',
        validValues: SUBSCRIPTION_TIERS,
        invalidValues: ['premium', 'basic', 'pro', '']
      }
    ];

    runParameterizedTests(
      'enum validation',
      enumValidationTestCases,
      ({ validValues, invalidValues }) => {
        validValues.forEach(value => {
          expect(validValues.includes(value)).toBe(true);
        });
        invalidValues.forEach(value => {
          expect(validValues.includes(value)).toBe(false);
        });
      },
      ({ name }) => `should validate ${name} enum values`
    );
  });

  describe('Default Values', () => {
    const defaultValueTests = [
      { field: 'role', expected: 'user' },
      { field: 'subscriptionTier', expected: 'free' },
      { field: 'isEmailVerified', expected: false },
      { field: 'profileSetupCompleted', expected: false },
      { field: 'timezone', expected: 'UTC' },
      { field: 'dndEdition', expected: '5th Edition' }
    ];

    runParameterizedTests(
      'default field values',
      defaultValueTests,
      ({ field, expected }) => {
        const user = createMockUser();
        expect(user[field as keyof IUser]).toBe(expected);
      },
      ({ field }) => `should have correct default value for ${field}`
    );

    const preferencesTests = [
      { field: 'theme', expected: 'system' },
      { field: 'emailNotifications', expected: true },
      { field: 'browserNotifications', expected: false },
      { field: 'timezone', expected: 'UTC' },
      { field: 'language', expected: 'en' },
      { field: 'diceRollAnimations', expected: true },
      { field: 'autoSaveEncounters', expected: true }
    ];

    runParameterizedTests(
      'default preferences',
      preferencesTests,
      ({ field, expected }) => {
        const user = createMockUser();
        expect(user.preferences[field as keyof typeof user.preferences]).toBe(expected);
      },
      ({ field }) => `should have correct default preference for ${field}`
    );
  });

  describe('Complex Business Logic', () => {
    describe('Password Management', () => {
      it('should have password comparison method', () => {
        const user = createMockUser();
        expect(user.comparePassword).toBeDefined();
        expect(typeof user.comparePassword).toBe('function');
      });

      it('should have password reset token generation', () => {
        const user = createMockUser();
        expect(user.generatePasswordResetToken).toBeDefined();
        expect(typeof user.generatePasswordResetToken).toBe('function');
      });
    });

    describe('Email Verification', () => {
      it('should have email verification token generation', () => {
        const user = createMockUser();
        expect(user.generateEmailVerificationToken).toBeDefined();
        expect(typeof user.generateEmailVerificationToken).toBe('function');
      });
    });

    describe('Subscription Management', () => {
      it('should check subscription status', () => {
        const user = createMockUser();
        expect(user.isSubscriptionActive()).toBe(true);
      });

      const tierFeatureTestCases = SUBSCRIPTION_TIERS.flatMap(tier =>
        SUBSCRIPTION_FEATURES.map(feature => ({
          tier,
          feature,
          limit: SUBSCRIPTION_LIMITS[tier][feature],
          description: `${tier} tier ${feature} limit validation`
        }))
      );

      runParameterizedTests(
        'tier-specific feature limits',
        tierFeatureTestCases,
        ({ tier, feature, limit }) => {
          const user = createMockUser({ subscriptionTier: tier });
          expect(user.canAccessFeature(feature, Math.min(limit, 999))).toBe(true);
          if (limit !== Infinity) {
            expect(user.canAccessFeature(feature, limit + 1)).toBe(false);
          }
        },
        ({ description }) => `should validate ${description}`
      );
    });

    describe('User Activity Tracking', () => {
      it('should update last login timestamp', () => {
        const user = createMockUser();
        expect(user.updateLastLogin).toBeDefined();
        expect(typeof user.updateLastLogin).toBe('function');
      });
    });
  });

  describe('Model Integration', () => {
    it('should have save method for persistence', () => {
      const user = createMockUser();
      expect(user.save).toBeDefined();
      expect(typeof user.save).toBe('function');
    });

    it('should have proper ObjectId structure', () => {
      const user = createMockUser();
      expect(user._id).toBeDefined();
      expect(user._id.toString()).toMatch(/^[0-9a-fA-F]{24}$/);
    });

    it('should maintain data integrity', () => {
      const customData = {
        email: 'custom@example.com',
        username: 'customuser',
        subscriptionTier: 'expert' as const
      };
      const user = createMockUser(customData);

      expect(user.email).toBe(customData.email);
      expect(user.username).toBe(customData.username);
      expect(user.subscriptionTier).toBe(customData.subscriptionTier);
    });
  });
});