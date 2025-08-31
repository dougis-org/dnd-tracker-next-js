import { render, screen } from '@testing-library/react';
import AuthenticatedClientWrapper from '@/components/layout/AuthenticatedClientWrapper';
import AuthenticatedServerPage from '@/components/layout/AuthenticatedServerPage';
import { mockUseAuth } from '@/app/(auth)/__tests__/auth-test-utils';

import { auth } from '@/lib/auth';


jest.mock('../lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

import { redirect } from 'next/navigation';

describe('Authentication Architecture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthenticatedClientWrapper', () => {
    it('renders children when authenticated', () => {
      mockUseAuth({
        isSignedIn: true,
        isLoaded: true,
        userId: '123',
      });

      render(
        <AuthenticatedClientWrapper>
          <div>Protected Content</div>
        </AuthenticatedClientWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      mockUseAuth({
        isSignedIn: false,
        isLoaded: false,
      });

      render(
        <AuthenticatedClientWrapper>
          <div>Protected Content</div>
        </AuthenticatedClientWrapper>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows sign in message when unauthenticated', () => {
      mockUseAuth({
        isSignedIn: false,
        isLoaded: true,
      });

      render(
        <AuthenticatedClientWrapper>
          <div>Protected Content</div>
        </AuthenticatedClientWrapper>
      );

      expect(screen.getByText('Please sign in to continue.')).toBeInTheDocument();
    });
  });

  describe('AuthenticatedServerPage', () => {
    it('renders children when session exists', async () => {
      (auth as jest.Mock).mockResolvedValue({ userId: '123' });

      const Component = await AuthenticatedServerPage({
        children: <div>Server Content</div>,
      });

      render(Component);
      expect(screen.getByText('Server Content')).toBeInTheDocument();
    });

    it('redirects when no session exists', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      try {
        await AuthenticatedServerPage({
          children: <div>Content</div>,
        });
      } catch {
        // redirect() throws in tests
      }

      expect(redirect).toHaveBeenCalledWith('/signin');
    });
  });
});