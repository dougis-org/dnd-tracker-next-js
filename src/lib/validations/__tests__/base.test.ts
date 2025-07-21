/**
 * @jest-environment node
 */

import {
  emailSchema,
  passwordSchema,
  usernameSchema,
  nameSchema,
  objectIdSchema,
  abilityScoreSchema,
  levelSchema,
  hitPointsSchema,
  armorClassSchema,
  initiativeSchema,
  challengeRatingSchema,
  safeValidate,
  handleValidationError,
  ValidationError,
  createOptionalSchema,
  createArraySchema,
  createPaginationSchema,
} from '../base';
import { TestPasswordConstants } from '../../test-utils/password-constants';

describe('Base Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      validEmails.forEach(email => {
        const result = safeValidate(emailSchema, email);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid-email',
        '@domain.com',
        'user@',
        'user@.com',
      ];

      invalidEmails.forEach(email => {
        const result = safeValidate(emailSchema, email);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [TestPasswordConstants.PASSWORD_123, TestPasswordConstants.MY_STRONG_PASSWORD, TestPasswordConstants.COMPLEXITY_PASSWORD];

      validPasswords.forEach(password => {
        const result = safeValidate(passwordSchema, password);
        expect(result.success).toBe(true);
      });
    });

    it('should validate passwords with special characters like asterisks', () => {
      // Test case for issue #408: passwords with * character should be valid
      // Regression test for password validation rejecting valid asterisk characters
      const passwordsWithSpecialChars = [
        'cjt*JCQ8hvk*xbw2tgd', // The exact password from the bug report
        'Test*Password123!',
        'MyP@ssw*rd2024',
        'SecurePass*123!', // Fixed: changed # to ! (allowed character)
        'Compl3x$P@ss*w0rd',
      ];

      passwordsWithSpecialChars.forEach(password => {
        const result = safeValidate(passwordSchema, password);
        expect(result.success).toBe(true);
      });
    });

    it('should validate edge case passwords with all required character types', () => {
      const validEdgeCasePasswords = [
        'aA1!abcd', // 8 chars, all requirements met
        'Aa1@bcdefgh', // 11 chars, all requirements
        'MyP@ssw0rd!123', // Longer password with all requirements
      ];

      const invalidEdgeCasePasswords = [
        'aA1!', // Minimal length - should fail
      ];

      validEdgeCasePasswords.forEach(password => {
        const result = safeValidate(passwordSchema, password);
        expect(result.success).toBe(true);
      });

      invalidEdgeCasePasswords.forEach(password => {
        const result = safeValidate(passwordSchema, password);
        expect(result.success).toBe(false);
      });
    });

    it('should reject weak passwords', () => {
      const invalidPasswords = [
        'short',
        'nouppercase123!',
        'NOLOWERCASE123!',
        'NoNumbers!',
        'NoSpecialChars123',
        '',
      ];

      invalidPasswords.forEach(password => {
        const result = safeValidate(passwordSchema, password);
        expect(result.success).toBe(false);
      });
    });

    it('should provide detailed error messages for password validation failures', () => {
      const passwordErrorCases = [
        {
          password: 'short',
          expectedErrors: [
            'Password must be at least 8 characters long',
            'Password must contain at least one uppercase letter',
            'Password must contain at least one number',
            'Password must contain at least one special character (@$!%*?&)'
          ]
        },
        {
          password: 'password123',
          expectedErrors: [
            'Password must contain at least one uppercase letter',
            'Password must contain at least one special character (@$!%*?&)'
          ]
        },
        {
          password: 'PASSWORD123!',
          expectedErrors: [
            'Password must contain at least one lowercase letter'
          ]
        }
      ];

      passwordErrorCases.forEach(({ password, expectedErrors }) => {
        const result = safeValidate(passwordSchema, password);
        expect(result.success).toBe(false);
        if (!result.success) {
          const errorMessages = result.errors.map(err => err.message);
          expectedErrors.forEach(expectedError => {
            expect(errorMessages.some(msg => msg.includes(expectedError))).toBe(true);
          });
        }
      });
    });

    it('should reject passwords with disallowed characters', () => {
      const passwordsWithInvalidChars = [
        'TestPassword1!()', // Contains all required types, plus invalid '()'
        'MyPassword123!~', // Contains all required types, plus invalid '~'
        'PasswordIsG00d!{}', // Contains all required types, plus invalid '{}'
        'ValidPass123!#', // Contains all required types, plus invalid '#'
        'TestPass123!+', // Contains all required types, plus invalid '+'
      ];

      passwordsWithInvalidChars.forEach(password => {
        const result = safeValidate(passwordSchema, password);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('usernameSchema', () => {
    it('should validate correct usernames', () => {
      const validUsernames = [
        'user123',
        'test_user',
        'user-name',
        'abc',
        'a'.repeat(30),
      ];

      validUsernames.forEach(username => {
        const result = safeValidate(usernameSchema, username);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid usernames', () => {
      const invalidUsernames = [
        'ab', // too short
        'a'.repeat(31), // too long
        'user@name', // invalid character
        'user name', // space
        '',
      ];

      invalidUsernames.forEach(username => {
        const result = safeValidate(usernameSchema, username);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('nameSchema', () => {
    it('should validate correct names', () => {
      const validNames = [
        'John',
        'Mary Jane',
        "O'Connor",
        'Jean-Luc',
        'Van Der Berg',
      ];

      validNames.forEach(name => {
        const result = safeValidate(nameSchema, name);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid names', () => {
      const invalidNames = ['', 'John123', 'Name@domain', 'a'.repeat(101)];

      invalidNames.forEach(name => {
        const result = safeValidate(nameSchema, name);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('objectIdSchema', () => {
    it('should validate correct ObjectIds', () => {
      const validObjectIds = [
        '507f1f77bcf86cd799439011',
        '507f191e810c19729de860ea',
        '123456789012345678901234',
      ];

      validObjectIds.forEach(id => {
        const result = safeValidate(objectIdSchema, id);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid ObjectIds', () => {
      const invalidObjectIds = [
        '',
        '123',
        'invalid-id',
        '507f1f77bcf86cd79943901', // too short
        '507f1f77bcf86cd7994390111', // too long
      ];

      invalidObjectIds.forEach(id => {
        const result = safeValidate(objectIdSchema, id);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('D&D specific schemas', () => {
    describe('abilityScoreSchema', () => {
      it('should validate correct ability scores', () => {
        const validScores = [1, 10, 20, 30];

        validScores.forEach(score => {
          const result = safeValidate(abilityScoreSchema, score);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid ability scores', () => {
        const invalidScores = [0, -1, 31, 50, 1.5];

        invalidScores.forEach(score => {
          const result = safeValidate(abilityScoreSchema, score);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('levelSchema', () => {
      it('should validate correct levels', () => {
        const validLevels = [1, 10, 20];

        validLevels.forEach(level => {
          const result = safeValidate(levelSchema, level);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid levels', () => {
        const invalidLevels = [0, -1, 21, 1.5];

        invalidLevels.forEach(level => {
          const result = safeValidate(levelSchema, level);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('hitPointsSchema', () => {
      it('should validate correct hit points', () => {
        const validHP = [0, 1, 100, 500];

        validHP.forEach(hp => {
          const result = safeValidate(hitPointsSchema, hp);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid hit points', () => {
        const invalidHP = [-1, -10, 1.5];

        invalidHP.forEach(hp => {
          const result = safeValidate(hitPointsSchema, hp);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('armorClassSchema', () => {
      it('should validate correct armor class', () => {
        const validAC = [1, 10, 20, 30];

        validAC.forEach(ac => {
          const result = safeValidate(armorClassSchema, ac);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid armor class', () => {
        const invalidAC = [0, -1, 31, 1.5];

        invalidAC.forEach(ac => {
          const result = safeValidate(armorClassSchema, ac);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('initiativeSchema', () => {
      it('should validate correct initiative', () => {
        const validInitiative = [-10, -5, 0, 10, 30];

        validInitiative.forEach(init => {
          const result = safeValidate(initiativeSchema, init);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid initiative', () => {
        const invalidInitiative = [-11, 31, 1.5];

        invalidInitiative.forEach(init => {
          const result = safeValidate(initiativeSchema, init);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('challengeRatingSchema', () => {
      it('should validate correct challenge rating', () => {
        const validCR = [0, 0.125, 0.25, 0.5, 1, 10, 30];

        validCR.forEach(cr => {
          const result = safeValidate(challengeRatingSchema, cr);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid challenge rating', () => {
        const invalidCR = [-1, 31];

        invalidCR.forEach(cr => {
          const result = safeValidate(challengeRatingSchema, cr);
          expect(result.success).toBe(false);
        });
      });
    });
  });

  describe('Utility functions', () => {
    describe('createOptionalSchema', () => {
      it('should make schema optional', () => {
        const optionalNameSchema = createOptionalSchema(nameSchema);

        expect(safeValidate(optionalNameSchema, undefined).success).toBe(true);
        expect(safeValidate(optionalNameSchema, '').success).toBe(true);
        expect(safeValidate(optionalNameSchema, 'John').success).toBe(true);
      });
    });

    describe('createArraySchema', () => {
      it('should validate arrays within constraints', () => {
        const arraySchema = createArraySchema(nameSchema, 1, 3);

        expect(safeValidate(arraySchema, ['John']).success).toBe(true);
        expect(safeValidate(arraySchema, ['John', 'Jane']).success).toBe(true);
        expect(safeValidate(arraySchema, ['John', 'Jane', 'Bob']).success).toBe(
          true
        );

        expect(safeValidate(arraySchema, []).success).toBe(false); // too few
        expect(
          safeValidate(arraySchema, ['John', 'Jane', 'Bob', 'Alice']).success
        ).toBe(false); // too many
      });
    });

    describe('createPaginationSchema', () => {
      it('should validate pagination parameters', () => {
        const paginationSchema = createPaginationSchema();

        const validPagination = [
          { page: 1, limit: 20 },
          { page: 5, limit: 50 },
          {},
        ];

        validPagination.forEach(pagination => {
          const result = safeValidate(paginationSchema, pagination);
          expect(result.success).toBe(true);
        });

        const invalidPagination = [
          { page: 0, limit: 20 },
          { page: 1, limit: 0 },
          { page: 1, limit: 101 },
        ];

        invalidPagination.forEach(pagination => {
          const result = safeValidate(paginationSchema, pagination);
          expect(result.success).toBe(false);
        });
      });
    });
  });

  describe('Error handling', () => {
    describe('ValidationError', () => {
      it('should create validation error with field and code', () => {
        const error = new ValidationError(
          'Test error',
          'testField',
          'test_code'
        );

        expect(error.message).toBe('Test error');
        expect(error.field).toBe('testField');
        expect(error.code).toBe('test_code');
        expect(error.name).toBe('ValidationError');
      });
    });

    describe('handleValidationError', () => {
      it('should convert Zod errors to ValidationError array', () => {
        const result = emailSchema.safeParse('invalid-email');

        if (!result.success) {
          const errors = handleValidationError(result.error);

          expect(Array.isArray(errors)).toBe(true);
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0]).toBeInstanceOf(ValidationError);
        }
      });
    });

    describe('safeValidate', () => {
      it('should return success for valid data', () => {
        const result = safeValidate(emailSchema, 'test@example.com');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('test@example.com');
        }
      });

      it('should return errors for invalid data', () => {
        const result = safeValidate(emailSchema, 'invalid-email');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(Array.isArray(result.errors)).toBe(true);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
