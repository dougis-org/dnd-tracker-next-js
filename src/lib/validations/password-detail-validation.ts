/**
 * Enhanced password validation with detailed error messages
 * for better user experience when passwords don't meet complexity requirements
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  message: string;
}

/**
 * Validates a password and returns detailed information about which requirements failed
 * @param password - The password to validate
 * @returns PasswordValidationResult with detailed error information
 */
export function validatePasswordWithDetails(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check if password is empty
  if (!password || password.length === 0) {
    errors.push('Password is required');
    return {
      isValid: false,
      errors,
      message: 'Password validation failed: ' + errors.join(', ')
    };
  }

  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Check maximum length
  if (password.length > 128) {
    errors.push('Password cannot exceed 128 characters');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character (only allowed special characters)
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  // Check for invalid characters (anything not letters, numbers, or allowed special chars)
  if (!/^[A-Za-z\d@$!%*?&]+$/.test(password)) {
    errors.push('Password contains invalid characters. Only letters, numbers, and @$!%*?& are allowed');
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    message: isValid
      ? 'Password meets all requirements'
      : 'Password validation failed: ' + errors.join(', ')
  };
}