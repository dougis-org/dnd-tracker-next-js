import { render, screen } from '@testing-library/react';
import AuthenticatedClientWrapper from '@/components/layout/AuthenticatedClientWrapper';
import AuthenticatedServerPage from '@/components/layout/AuthenticatedServerPage';
import { useSession } from 'next-auth/react';
import { auth } from '@/lib/auth';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
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
      (useSession as jest.Mock).mockReturnValue({
        status: 'authenticated',
        data: { user: { id: '123' } },
      });

      render(
        <AuthenticatedClientWrapper>
          <div>Protected Content</div>
        </AuthenticatedClientWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      (useSession as jest.Mock).mockReturnValue({
        status: 'loading',
        data: null,
      });

      render(
        <AuthenticatedClientWrapper>
          <div>Protected Content</div>
        </AuthenticatedClientWrapper>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows sign in message when unauthenticated', () => {
      (useSession as jest.Mock).mockReturnValue({
        status: 'unauthenticated',
        data: null,
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
      (auth as jest.Mock).mockResolvedValue({ user: { id: '123' } });

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