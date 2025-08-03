'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';
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
import { isValidCallbackUrl, getTrustedDomains } from '@/lib/utils/origin-validation';
import { useToast } from '@/hooks/use-toast';

type FormState = {
  success: boolean;
  errors: FormValidationError[];
  isSubmitting: boolean;
};

// Utility functions to reduce duplication
const createZodErrors = (zodError: z.ZodError): FormValidationError[] =>
  zodError.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));

const createGeneralError = (error: unknown): FormValidationError[] => [{
  field: '',
  message: error instanceof Error ? error.message : 'An unexpected error occurred',
}];

const TOAST_MESSAGES = {
  success: 'Login Success',
  failure: 'Login Failure, please check your email and password',
} as const;

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Utility function to get callback URL parameters
  const getCallbackUrlParam = useCallback(() =>
    searchParams.get('callbackUrl') || searchParams.get('next'), [searchParams]);

  // Enhanced callback URL validation for Issue #473: Fix development environment redirects
  const getValidatedCallbackUrl = useCallback(() => {
    const rawCallbackUrl = getCallbackUrlParam();

    if (!rawCallbackUrl) {
      return '/dashboard';
    }

    // Use the enhanced validation utility that handles development environment variations
    // Only access window in the browser (client-side)
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const trustedDomains = getTrustedDomains();

    const isValid = isValidCallbackUrl(rawCallbackUrl, currentOrigin, {
      allowRelative: true,
      allowedDomains: trustedDomains,
    });

    if (isValid) {
      return rawCallbackUrl;
    }

    // Log the blocking for debugging, but with more context about why
    if (rawCallbackUrl.startsWith('http')) {
      console.warn(
        `Blocked redirect to external URL: ${rawCallbackUrl}. ` +
        `Current origin: ${currentOrigin}. ` +
        `Environment: ${process.env.NODE_ENV || 'unknown'}`
      );
    } else {
      console.warn(`Invalid callback URL format: ${rawCallbackUrl}`);
    }

    return '/dashboard';
  }, [getCallbackUrlParam]);

  const callbackUrl = getValidatedCallbackUrl();
  const error = searchParams.get('error');

  // Generate redirect message if user was redirected from a protected route
  const redirectMessage = getRedirectMessage(getCallbackUrlParam());

  const [formState, setFormState] = useState<FormState>({
    success: false,
    errors: [],
    isSubmitting: false,
  });

  // Form state utility functions
  const updateFormState = useCallback((partial: Partial<FormState>) => {
    setFormState(prev => ({ ...prev, ...partial }));
  }, []);

  const setFormErrors = useCallback((errors: FormValidationError[]) =>
    updateFormState({ errors, isSubmitting: false }), [updateFormState]);

  const setFormSuccess = useCallback(() =>
    updateFormState({ success: true, errors: [], isSubmitting: false }), [updateFormState]);

  // Toast utility function
  const showToast = useCallback((type: 'success' | 'failure') => {
    toast({
      title: TOAST_MESSAGES[type],
      variant: type === 'success' ? 'default' : 'destructive'
    });
  }, [toast]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    updateFormState({ isSubmitting: true, errors: [] });

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
        rememberMe: validatedData.rememberMe.toString(),
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
      setFormSuccess();
      showToast('success');
      router.push(callbackUrl as any);
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        setFormErrors(createZodErrors(error));
        return;
      }

      // Handle other errors
      setFormErrors(createGeneralError(error));

      // Show failure toast for authentication errors
      if (error instanceof Error) {
        showToast('failure');
      }
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
