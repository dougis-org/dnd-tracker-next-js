/**
 * @jest-environment node
 */

import { validatePasswordWithDetails } from '../password-detail-validation';

describe('Password Detail Validation', () => {
  describe('validatePasswordWithDetails', () => {
    it('should return success for valid passwords', () => {
      const validPasswords = [
        'Password123!',
        'MyStr0ng@Pass',
        'Secure123$',
        'Complex9!Word',
        'Test1234@Word'
      ];

      validPasswords.forEach(password => {
        const result = validatePasswordWithDetails(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.message).toBe('Password meets all requirements');
      });
    });

    it('should return specific error for password too short', () => {
      const shortPasswords = [
        'Test1!',   // 6 chars
        'Pass1@',   // 6 chars
        'Abc123!',  // 7 chars
      ];

      shortPasswords.forEach(password => {
        const result = validatePasswordWithDetails(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
      });
    });

    it('should return specific error for missing lowercase letter', () => {
      const noLowercasePasswords = [
        'PASSWORD123!',
        'MYSTRONG@123',
        'SECURE123$WORD',
      ];

      noLowercasePasswords.forEach(password => {
        const result = validatePasswordWithDetails(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      });
    });

    it('should return specific error for missing uppercase letter', () => {
      const noUppercasePasswords = [
        'password123!',
        'mystrong@123',
        'secure123$word',
      ];

      noUppercasePasswords.forEach(password => {
        const result = validatePasswordWithDetails(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      });
    });

    it('should return specific error for missing number', () => {
      const noNumberPasswords = [
        'PasswordTest!',
        'MyStrong@Pass',
        'SecureWord$Test',
      ];

      noNumberPasswords.forEach(password => {
        const result = validatePasswordWithDetails(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      });
    });

    it('should return specific error for missing special character', () => {
      const noSpecialCharPasswords = [
        'Password123',
        'MyStrong123',
        'SecureWord123',
      ];

      noSpecialCharPasswords.forEach(password => {
        const result = validatePasswordWithDetails(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one special character (@$!%*?&)');
      });
    });

    it('should return multiple errors for passwords missing multiple requirements', () => {
      const multipleErrorsPasswords = [
        {
          password: 'pass',
          expectedErrors: [
            'Password must be at least 8 characters long',
            'Password must contain at least one uppercase letter',
            'Password must contain at least one number',
            'Password must contain at least one special character (@$!%*?&)'
          ]
        },
        {
          password: 'password',
          expectedErrors: [
            'Password must contain at least one uppercase letter',
            'Password must contain at least one number',
            'Password must contain at least one special character (@$!%*?&)'
          ]
        },
        {
          password: 'PASSWORD',
          expectedErrors: [
            'Password must contain at least one lowercase letter',
            'Password must contain at least one number',
            'Password must contain at least one special character (@$!%*?&)'
          ]
        },
        {
          password: 'Password',
          expectedErrors: [
            'Password must contain at least one number',
            'Password must contain at least one special character (@$!%*?&)'
          ]
        }
      ];

      multipleErrorsPasswords.forEach(({ password, expectedErrors }) => {
        const result = validatePasswordWithDetails(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(expectedErrors.length);
        expectedErrors.forEach(error => {
          expect(result.errors).toContain(error);
        });
      });
    });

    it('should return error for password too long', () => {
      const longPassword = 'A'.repeat(129) + '1!';
      const result = validatePasswordWithDetails(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot exceed 128 characters');
    });

    it('should return error for empty password', () => {
      const result = validatePasswordWithDetails('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should return error for password with invalid characters', () => {
      const invalidCharPasswords = [
        'Password123!~',   // contains ~
        'Password123!#',   // contains #
        'Password123!()',  // contains ()
        'Password123!{}',  // contains {}
        'Password123!+',   // contains +
      ];

      invalidCharPasswords.forEach(password => {
        const result = validatePasswordWithDetails(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password contains invalid characters. Only letters, numbers, and @$!%*?& are allowed');
      });
    });

    it('should provide a descriptive message that lists all failing requirements', () => {
      const result = validatePasswordWithDetails('pass');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password validation failed: Password must be at least 8 characters long, Password must contain at least one uppercase letter, Password must contain at least one number, Password must contain at least one special character (@$!%*?&)');
    });

    it('should provide success message for valid password', () => {
      const result = validatePasswordWithDetails('ValidPass123!');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Password meets all requirements');
    });

    it('should handle passwords with asterisk special character correctly', () => {
      // Regression test for issue #408: passwords with * character should be valid
      const passwordsWithAsterisk = [
        'cjt*JCQ8hvk*xbw2tgd',
        'Test*Password123!',
        'MyP@ssw*rd2024',
        'SecurePass*123!',
      ];

      passwordsWithAsterisk.forEach(password => {
        const result = validatePasswordWithDetails(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.message).toBe('Password meets all requirements');
      });
    });
  });
});