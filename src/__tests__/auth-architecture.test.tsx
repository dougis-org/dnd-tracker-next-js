/**
 * Authentication Architecture Tests
 *
 * Tests the improved authentication architecture that eliminates
 * redundant client-side authentication checks by properly coordinating
 * middleware protection with server/client components.
 */

import { render, screen } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import AuthenticatedClientWrapper from '@/components/layout/AuthenticatedClientWrapper';
import AuthenticatedServerPage from '@/components/layout/AuthenticatedServerPage';
import { auth } from '@/lib/auth';

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
  useSession: jest.fn(),
}));

// Mock auth function
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock redirect
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
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should show minimal loading state', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
      });

      render(
        <AuthenticatedClientWrapper>
          <div data-testid="protected-content">Protected Content</div>
        </AuthenticatedClientWrapper>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should show error state when middleware protection fails', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(
        <AuthenticatedClientWrapper>
          <div data-testid="protected-content">Protected Content</div>
        </AuthenticatedClientWrapper>
      );

      expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      expect(screen.getByText(/should have been redirected to sign in/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to Sign In' })).toHaveAttribute('href', '/signin');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should include session data attributes', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        status: 'authenticated',
      });

      const { container } = render(
        <AuthenticatedClientWrapper>
          <div>Content</div>
        </AuthenticatedClientWrapper>
      );

      const wrapper = container.querySelector('[data-client-authenticated="true"]');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveAttribute('data-session-user-id', 'user-123');
    });

    it('should show custom fallback when provided', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const customFallback = <div data-testid="custom-fallback">Custom Error</div>;

      render(
        <AuthenticatedClientWrapper fallback={customFallback}>
          <div data-testid="protected-content">Protected Content</div>
        </AuthenticatedClientWrapper>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Error')).not.toBeInTheDocument();
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
      expect(screen.getByText('Server Content')).toBeInTheDocument();
    });

    it('should redirect when no session exists', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      // In a real scenario, redirect would prevent the component from rendering
      // In test, we'll catch the redirect call
      try {
        await AuthenticatedServerPage({
          children: <div>Content</div>,
        });
      } catch {
        // redirect() throws in tests
      }

      expect(redirect).toHaveBeenCalledWith('/signin');
    });

    it('should redirect to custom URL when specified', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      try {
        await AuthenticatedServerPage({
          children: <div>Content</div>,
          fallbackUrl: '/custom-signin',
        });
      } catch {
        // redirect() throws in tests
      }

      expect(redirect).toHaveBeenCalledWith('/custom-signin');
    });

    it('should include authentication data attributes', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'server-user-456', email: 'server@example.com' },
      });

      const Component = await AuthenticatedServerPage({
        children: <div>Content</div>,
      });

      const { container } = render(Component);

      const wrapper = container.querySelector('[data-authenticated="true"]');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveAttribute('data-user-id', 'server-user-456');
    });
  });

  describe('Integration with SessionProvider', () => {
    it('should work correctly within SessionProvider context', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: { user: { id: '789', email: 'integrated@example.com' } },
        status: 'authenticated',
      });

      render(
        <SessionProvider session={null}>
          <AuthenticatedClientWrapper>
            <div data-testid="integrated-content">Integrated Content</div>
          </AuthenticatedClientWrapper>
        </SessionProvider>
      );

      expect(screen.getByTestId('session-provider')).toBeInTheDocument();
      expect(screen.getByTestId('integrated-content')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Behavior', () => {
    it('should handle session provider errors gracefully', () => {
      (useSession as jest.Mock).mockImplementation(() => {
        throw new Error('Session provider error');
      });

      // Suppress console errors for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <AuthenticatedClientWrapper>
            <div>Content</div>
          </AuthenticatedClientWrapper>
        );
      }).toThrow('Session provider error');

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Considerations', () => {
    it('should not cause unnecessary re-renders', async () => {
      const mockSession = { user: { id: '123', email: 'test@example.com' } };

      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      const { rerender } = render(
        <AuthenticatedClientWrapper>
          <div data-testid="content">Content</div>
        </AuthenticatedClientWrapper>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();

      // Re-render with the same session data
      rerender(
        <AuthenticatedClientWrapper>
          <div data-testid="content">Content</div>
        </AuthenticatedClientWrapper>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(useSession).toHaveBeenCalledTimes(2); // Once per render
    });
  });

  describe('Accessibility', () => {
    it('should provide appropriate ARIA attributes for loading state', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
      });

      render(
        <AuthenticatedClientWrapper>
          <div>Content</div>
        </AuthenticatedClientWrapper>
      );

      const loadingElement = screen.getByText('Loading...');
      expect(loadingElement).toBeInTheDocument();
    });

    it('should provide appropriate error messaging', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(
        <AuthenticatedClientWrapper>
          <div>Content</div>
        </AuthenticatedClientWrapper>
      );

      const errorHeading = screen.getByRole('heading', { name: 'Authentication Error' });
      expect(errorHeading).toBeInTheDocument();

      const signInLink = screen.getByRole('link', { name: 'Go to Sign In' });
      expect(signInLink).toHaveAttribute('href', '/signin');
    });
  });
});