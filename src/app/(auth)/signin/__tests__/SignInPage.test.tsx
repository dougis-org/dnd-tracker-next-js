/**
 * Test file for SignIn page functionality
 * Addresses Issue #473: Login redirect and token persistence issues
 *
 * Tests both the external URL redirect blocking and callback URL validation
 * to ensure users can successfully log in and navigate to protected pages.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import SignInPage from '../page';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('next-auth/react');
jest.mock('@/hooks/use-toast');
jest.mock('@/lib/utils/redirect-utils', () => ({
  getRedirectMessage: jest.fn(() => null),
}));

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

const mockSearchParams = new URLSearchParams();
const mockToast = jest.fn();

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('SignInPage - Issue #473 Fix', () => {
  let originalLocation: Location;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue(mockRouter);
    mockUseSearchParams.mockReturnValue({
      get: (key: string) => mockSearchParams.get(key),
    } as any);
    mockUseToast.mockReturnValue({
      toast: mockToast,
    });

    // Mock successful sign in by default
    mockSignIn.mockResolvedValue({
      ok: true,
      error: null,
      url: 'http://localhost:3000/dashboard',
      status: 200,
    });

    // Store original location and set default mock
    originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000/signin',
    };

    // Clear URLSearchParams for each test
    mockSearchParams.forEach((value, key) => {
      mockSearchParams.delete(key);
    });
  });

  afterEach(() => {
    // Restore original location
    window.location = originalLocation;
  });

  describe('Callback URL Validation - Development Environment', () => {
    it('should handle localhost callback URLs correctly', async () => {
      mockSearchParams.set('callbackUrl', 'http://localhost:3000/dashboard');

      render(<SignInPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          redirect: false,
          email: 'test@example.com',
          password: 'password123',
          callbackUrl: 'http://localhost:3000/dashboard',
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('http://localhost:3000/dashboard');
      });
    });

    it('should block external callback URLs', async () => {
      // Set up malicious external callback URL
      mockSearchParams.set('callbackUrl', 'https://evil.com/steal-tokens');

      render(<SignInPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          redirect: false,
          email: 'test@example.com',
          password: 'password123',
          callbackUrl: '/dashboard', // Should fallback to default
        });
      });
    });

    it('should handle 0.0.0.0 origin correctly in development', async () => {
      // Simulate accessing the app via 0.0.0.0:3000
      window.location = {
        ...originalLocation,
        origin: 'http://0.0.0.0:3000',
        href: 'http://0.0.0.0:3000/signin',
      };

      mockSearchParams.set('callbackUrl', 'http://0.0.0.0:3000/dashboard');

      render(<SignInPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should accept 0.0.0.0 callback URLs in development
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          redirect: false,
          email: 'test@example.com',
          password: 'password123',
          callbackUrl: 'http://0.0.0.0:3000/dashboard',
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('http://0.0.0.0:3000/dashboard');
      });
    });

    it('should handle 127.0.0.1 origin correctly in development', async () => {
      // Simulate accessing the app via 127.0.0.1:3000
      window.location = {
        ...originalLocation,
        origin: 'http://127.0.0.1:3000',
        href: 'http://127.0.0.1:3000/signin',
      };

      mockSearchParams.set('callbackUrl', 'http://127.0.0.1:3000/dashboard');

      render(<SignInPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          redirect: false,
          email: 'test@example.com',
          password: 'password123',
          callbackUrl: 'http://127.0.0.1:3000/dashboard',
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('http://127.0.0.1:3000/dashboard');
      });
    });

    it('should reject cross-origin callback URLs in production', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      window.location = {
        ...originalLocation,
        origin: 'https://dndtracker.com',
        href: 'https://dndtracker.com/signin',
      };

      mockSearchParams.set('callbackUrl', 'https://evil.com/dashboard');

      render(<SignInPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          redirect: false,
          email: 'test@example.com',
          password: 'password123',
          callbackUrl: '/dashboard', // Should fallback to default
        });
      });

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Authentication Flow', () => {
    it('should show success toast and redirect on successful login', async () => {
      mockSearchParams.set('callbackUrl', '/dashboard');

      render(<SignInPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Login Success',
          variant: 'default'
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show error toast on authentication failure', async () => {
      mockSignIn.mockResolvedValue({
        ok: false,
        error: 'CredentialsSignin',
        url: null,
        status: 401,
      });

      render(<SignInPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Login Failure, please check your email and password',
          variant: 'destructive'
        });
      });

      // Should not redirect on failure
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle relative callback URLs correctly', async () => {
      mockSearchParams.set('callbackUrl', '/settings');

      render(<SignInPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          redirect: false,
          email: 'test@example.com',
          password: 'password123',
          callbackUrl: '/settings',
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/settings');
      });
    });
  });

  describe('Validation Errors', () => {
    it('should display validation errors for invalid email', async () => {
      render(<SignInPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });

      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('should display validation errors for missing password', async () => {
      render(<SignInPage />);

      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password.*required/i)).toBeInTheDocument();
      });

      expect(mockSignIn).not.toHaveBeenCalled();
    });
  });
});