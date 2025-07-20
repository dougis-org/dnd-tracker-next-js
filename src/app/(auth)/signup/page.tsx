'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { userRegistrationSchema } from '@/lib/validations/user';
import {
  FormWrapper,
  FormInput,
  FormSubmitButton,
  FormValidationError,
} from '@/components/forms';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type FormState = {
  success: boolean;
  errors: FormValidationError[];
  isSubmitting: boolean;
};

export default function SignUpPage() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({
    success: false,
    errors: [],
    isSubmitting: false,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormState(prev => ({ ...prev, isSubmitting: true, errors: [] }));

    try {
      const formData = new FormData(event.currentTarget);
      const data = Object.fromEntries(formData.entries());

      // Convert checkbox values to boolean
      const agreeToTerms = formData.get('agreeToTerms') === 'on';
      const subscribeToNewsletter =
        formData.get('subscribeToNewsletter') === 'on';

      const validationData = {
        ...data,
        agreeToTerms,
        subscribeToNewsletter,
      };

      // Validate the form data with Zod
      const validatedData = userRegistrationSchema.parse(validationData);

      // Make API request
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle server validation errors (400) and duplicate user errors (409)
        if ([400, 409].includes(response.status) && result.errors) {
          setFormState({
            success: false,
            errors: result.errors.map((err: any) => ({
              field: err.field || '',
              message: err.message,
            })),
            isSubmitting: false,
          });
          return;
        }

        throw new Error(result.message || 'Registration failed');
      }

      // Success - redirect based on email bypass flag
      setFormState({
        success: true,
        errors: [],
        isSubmitting: false,
      });

      // Check if email verification was bypassed
      if (result.emailBypass) {
        // Email verification was bypassed, redirect directly to sign-in
        router.push('/signin?next=/profile-setup' as any);
      } else {
        // Normal flow - redirect to email verification page
        router.push(
          ('/verify-email?email=' +
            encodeURIComponent(validatedData.email)) as any
        );
      }
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        setFormState({
          success: false,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
          isSubmitting: false,
        });
        return;
      }

      // Handle other errors
      setFormState({
        success: false,
        errors: [
          {
            field: '',
            message:
              error instanceof Error
                ? error.message
                : 'An unexpected error occurred',
          },
        ],
        isSubmitting: false,
      });
    }
  };

  const getFieldError = (field: string) => {
    return formState.errors.find(err => err.field === field)?.message;
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Register to start building your D&D encounters
        </p>
      </div>

      <FormWrapper
        onSubmit={handleSubmit}
        errors={formState.errors}
        isSubmitting={formState.isSubmitting}
      >
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="First Name"
            name="firstName"
            placeholder="Enter your first name"
            required
            error={getFieldError('firstName')}
          />
          <FormInput
            label="Last Name"
            name="lastName"
            placeholder="Enter your last name"
            required
            error={getFieldError('lastName')}
          />
        </div>

        <FormInput
          label="Username"
          name="username"
          placeholder="Choose a unique username"
          required
          error={getFieldError('username')}
          helperText="3-30 characters, letters, numbers, and hyphens only"
        />

        <FormInput
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          error={getFieldError('email')}
        />

        <FormInput
          label="Password"
          name="password"
          type="password"
          placeholder="Create a strong password"
          required
          error={getFieldError('password')}
          helperText="Min 8 characters with uppercase, lowercase, number, and symbol"
        />

        <FormInput
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          required
          error={getFieldError('confirmPassword')}
        />

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="agreeToTerms" name="agreeToTerms" />
            <Label htmlFor="agreeToTerms" className="text-sm">
              I agree to the{' '}
              <Link
                href={'/terms' as any}
                className="text-primary hover:underline"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href={'/privacy' as any}
                className="text-primary hover:underline"
              >
                Privacy Policy
              </Link>
            </Label>
          </div>
          {getFieldError('agreeToTerms') && (
            <p className="text-sm text-destructive" role="alert">
              {getFieldError('agreeToTerms')}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox id="subscribeToNewsletter" name="subscribeToNewsletter" />
          <Label htmlFor="subscribeToNewsletter" className="text-sm">
            Subscribe to our newsletter (optional)
          </Label>
        </div>

        <FormSubmitButton loadingText="Creating account...">
          Create Account
        </FormSubmitButton>

        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link
            href={'/signin' as any}
            className="text-primary hover:underline"
          >
            Sign in
          </Link>
        </div>
      </FormWrapper>
    </div>
  );
}
