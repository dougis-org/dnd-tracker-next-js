import { z } from 'zod';
import { validatePasswordWithDetails } from './password-detail-validation';

/**
 * Base validation schemas and utilities for consistent data validation
 * across the D&D Encounter Tracker application
 */

// Common validation patterns
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(254, 'Email address is too long');

export const passwordSchema = z
  .string()
  .superRefine((password, ctx) => {
    const result = validatePasswordWithDetails(password);

    if (!result.isValid) {
      result.errors.forEach(error => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error,
        });
      });
    }
  });

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters long')
  .max(30, 'Username cannot exceed 30 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscores, and hyphens'
  );

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name cannot exceed 100 characters')
  .regex(
    /^[a-zA-Z\s'-]+$/,
    'Name can only contain letters, spaces, apostrophes, and hyphens'
  );

// MongoDB ObjectId validation
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

// UUID validation (for external IDs)
export const uuidSchema = z.string().uuid('Invalid UUID format');

// D&D specific validations
export const abilityScoreSchema = z
  .number()
  .int('Ability score must be a whole number')
  .min(1, 'Ability score must be at least 1')
  .max(30, 'Ability score cannot exceed 30');

export const levelSchema = z
  .number()
  .int('Level must be a whole number')
  .min(1, 'Level must be at least 1')
  .max(20, 'Level cannot exceed 20');

export const hitPointsSchema = z
  .number()
  .int('Hit points must be a whole number')
  .min(0, 'Hit points cannot be negative');

export const armorClassSchema = z
  .number()
  .int('Armor class must be a whole number')
  .min(1, 'Armor class must be at least 1')
  .max(30, 'Armor class cannot exceed 30');

export const initiativeSchema = z
  .number()
  .int('Initiative must be a whole number')
  .min(-10, 'Initiative cannot be lower than -10')
  .max(30, 'Initiative cannot exceed 30');

export const challengeRatingSchema = z
  .number()
  .min(0, 'Challenge Rating cannot be negative')
  .max(30, 'Challenge Rating cannot exceed 30');

// Date validation schemas
export const dateSchema = z
  .string()
  .datetime('Invalid date format')
  .or(z.date());

export const timestampSchema = z
  .number()
  .int('Timestamp must be a whole number')
  .positive('Timestamp must be positive');

// Utility validation functions
export const createOptionalSchema = <T extends z.ZodTypeAny>(schema: T) =>
  schema.optional().or(z.literal('').transform(() => undefined));

export const createArraySchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
  minItems = 0,
  maxItems = 100
) =>
  z
    .array(itemSchema)
    .min(minItems, `At least ${minItems} item(s) required`)
    .max(maxItems, `Cannot exceed ${maxItems} items`);

export const createPaginationSchema = () =>
  z.object({
    page: z
      .number()
      .int('Page must be a whole number')
      .min(1, 'Page must be at least 1')
      .default(1),
    limit: z
      .number()
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .default(20),
  });

// Error handling utilities
export class ValidationError extends Error {
  public field?: string;

  public code?: string;

  constructor(message: string, field?: string, code?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

export const handleValidationError = (error: z.ZodError): ValidationError[] => {
  return error.errors.map(
    err => new ValidationError(err.message, err.path.join('.'), err.code)
  );
};

export const safeValidate = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] } => {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: handleValidationError(result.error),
  };
};

// Type utilities
export type InferSchemaType<T extends z.ZodTypeAny> = z.infer<T>;
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };
