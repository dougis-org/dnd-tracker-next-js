'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { z } from 'zod';
import { userLoginSchema } from '@/lib/validations/user';
import {
  FormWrapper,
  FormInput,
  FormSubmitButton,
  FormValidationError,
} from '@/components/forms';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { getRedirectMessage } from '@/lib/utils/redirect-utils';

type FormState = {
  success: boolean;
  errors: FormValidationError[];
  isSubmitting: boolean;
};

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Enhanced callback URL validation for Issue #438: Prevent invalid redirects
  const getValidatedCallbackUrl = () => {
    const rawCallbackUrl = searchParams.get('callbackUrl') || searchParams.get('next');

    if (!rawCallbackUrl) {
      return '/dashboard';
    }

    try {
      // If it's a relative URL, it's safe
      if (rawCallbackUrl.startsWith('/')) {
        return rawCallbackUrl;
      }

      // If it's an absolute URL, validate it
      const url = new URL(rawCallbackUrl);
      const currentOrigin = window.location.origin;

      // Only allow same-origin redirects
      if (url.origin === currentOrigin) {
        return rawCallbackUrl;
      }

      console.warn(`Blocked redirect to external URL: ${rawCallbackUrl}`);
      return '/dashboard';
    } catch (error) {
      console.warn(`Invalid callback URL format: ${rawCallbackUrl}`, error);
      return '/dashboard';
    }
  };

  const callbackUrl = getValidatedCallbackUrl();
  const error = searchParams.get('error');

  // Generate redirect message if user was redirected from a protected route
  const redirectMessage = getRedirectMessage(searchParams.get('callbackUrl') || searchParams.get('next'));

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
      const rememberMe = formData.get('rememberMe') === 'on';

      const validationData = {
        ...data,
        rememberMe,
      };

      // Validate the form data with Zod
      const validatedData = userLoginSchema.parse(validationData);

      // Sign in with NextAuth
      const response = await signIn('credentials', {
        redirect: false,
        email: validatedData.email,
        password: validatedData.password,
        callbackUrl,
      });

      if (response?.error) {
        throw new Error(
          response.error === 'CredentialsSignin'
            ? 'Invalid email or password'
            : response.error
        );
      }

      // Success - redirect to callback URL
      setFormState({
        success: true,
        errors: [],
        isSubmitting: false,
      });

      router.push(callbackUrl as any);
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

  // Determine if we have a general error (not tied to a specific field)
  const generalError =
    formState.errors.find(err => !err.field)?.message ||
    (error === 'CredentialsSignin' ? 'Invalid email or password' : error);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Sign in to your account</h1>
        {redirectMessage ? (
          <p className="text-primary font-medium">
            {redirectMessage}
          </p>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">
            Enter your credentials to access your D&D Encounter Tracker
          </p>
        )}
      </div>

      {generalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}

      <FormWrapper
        onSubmit={handleSubmit}
        errors={formState.errors}
        isSubmitting={formState.isSubmitting}
      >
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
          placeholder="Enter your password"
          required
          error={getFieldError('password')}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox id="rememberMe" name="rememberMe" />
            <Label htmlFor="rememberMe" className="text-sm">
              Remember me
            </Label>
          </div>
          <Link
            href={'/reset-password' as any}
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <FormSubmitButton loadingText="Signing in...">Sign In</FormSubmitButton>

        <div className="text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link
            href={'/signup' as any}
            className="text-primary hover:underline"
          >
            Sign up
          </Link>
        </div>
      </FormWrapper>
    </div>
  );
}
