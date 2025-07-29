/**
 * Authentication Architecture Tests
 */

import { render, screen } from '@testing-library/react';
import AuthenticatedClientWrapper from '@/components/layout/AuthenticatedClientWrapper';
import AuthenticatedServerPage from '@/components/layout/AuthenticatedServerPage';
import { auth } from '@/lib/auth';

jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
  useSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

describe('Authentication Architecture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthenticatedClientWrapper', () => {
    it('should render children when authenticated', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        status: 'authenticated',
      });

      render(
        <AuthenticatedClientWrapper>
          <div data-testid="protected-content">Protected Content</div>
        </AuthenticatedClientWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should show error when unauthenticated', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(
        <AuthenticatedClientWrapper>
          <div data-testid="protected-content">Protected Content</div>
        </AuthenticatedClientWrapper>
      );

      expect(screen.getByText('Please sign in to continue.')).toBeInTheDocument();
    });
  });

  describe('AuthenticatedServerPage', () => {
    it('should render children when session exists', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: '123', email: 'test@example.com' },
      });

      const Component = await AuthenticatedServerPage({
        children: <div data-testid="server-content">Server Content</div>,
      });

      render(Component);
      expect(screen.getByTestId('server-content')).toBeInTheDocument();
    });

    it('should redirect when no session exists', async () => {
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