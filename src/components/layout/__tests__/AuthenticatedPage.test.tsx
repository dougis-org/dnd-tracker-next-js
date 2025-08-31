import React from 'react';
import { render, screen } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import { AuthenticatedPage } from '../AuthenticatedPage';

// Mock Clerk
jest.mock('@clerk/nextjs');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock AppLayout
jest.mock('../AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

describe('AuthenticatedPage', () => {
  const TestContent = () => <div data-testid="test-content">Test Content</div>;

  const createMockAuthBase = () => ({
    userId: null,
    sessionId: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    has: jest.fn(),
    signOut: jest.fn(),
    getToken: jest.fn(),
  });

  const setupLoadingAuth = () => {
    mockUseAuth.mockReturnValue({
      isLoaded: false,
      isSignedIn: false,
      ...createMockAuthBase(),
    });
  };

  const setupUnauthenticatedAuth = () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      ...createMockAuthBase(),
    });
  };

  const setupAuthenticatedAuth = () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: 'user_123',
      sessionId: 'session_123',
      ...createMockAuthBase(),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('displays default loading message', () => {
      setupLoadingAuth();

      render(
        <AuthenticatedPage>
          <TestContent />
        </AuthenticatedPage>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });

    it('displays custom loading message', () => {
      setupLoadingAuth();

      render(
        <AuthenticatedPage loadingMessage="Please wait...">
          <TestContent />
        </AuthenticatedPage>
      );

      expect(screen.getByText('Please wait...')).toBeInTheDocument();
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });
  });

  describe('Unauthenticated State', () => {
    it('displays default unauthenticated message', () => {
      setupUnauthenticatedAuth();

      render(
        <AuthenticatedPage>
          <TestContent />
        </AuthenticatedPage>
      );

      expect(screen.getByText('Please sign in to access this page.')).toBeInTheDocument();
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });

    it('displays custom unauthenticated message', () => {
      setupUnauthenticatedAuth();

      render(
        <AuthenticatedPage unauthenticatedMessage="Login required for this feature">
          <TestContent />
        </AuthenticatedPage>
      );

      expect(screen.getByText('Login required for this feature')).toBeInTheDocument();
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated State', () => {
    it('renders children when authenticated', () => {
      setupAuthenticatedAuth();

      render(
        <AuthenticatedPage>
          <TestContent />
        </AuthenticatedPage>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.queryByText('Please sign in to access this page.')).not.toBeInTheDocument();
    });

    it('renders within AppLayout', () => {
      setupAuthenticatedAuth();

      render(
        <AuthenticatedPage>
          <TestContent />
        </AuthenticatedPage>
      );

      expect(screen.getByTestId('app-layout')).toBeInTheDocument();
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('has proper loading state styling', () => {
      setupLoadingAuth();

      const { container } = render(
        <AuthenticatedPage>
          <TestContent />
        </AuthenticatedPage>
      );

      const loadingDiv = container.querySelector('.flex.items-center.justify-center.h-64');
      expect(loadingDiv).toBeInTheDocument();
      expect(loadingDiv).toHaveClass('flex', 'items-center', 'justify-center', 'h-64');
    });

    it('has proper unauthenticated state styling', () => {
      setupUnauthenticatedAuth();

      const { container } = render(
        <AuthenticatedPage>
          <TestContent />
        </AuthenticatedPage>
      );

      const unauthDiv = container.querySelector('.flex.items-center.justify-center.h-64');
      expect(unauthDiv).toBeInTheDocument();
      expect(unauthDiv).toHaveClass('flex', 'items-center', 'justify-center', 'h-64');
    });
  });

  describe('Accessibility', () => {
    it('has proper text styling for loading message', () => {
      setupLoadingAuth();

      const { container } = render(
        <AuthenticatedPage>
          <TestContent />
        </AuthenticatedPage>
      );

      const textDiv = container.querySelector('.text-muted-foreground');
      expect(textDiv).toBeInTheDocument();
      expect(textDiv).toHaveTextContent('Loading...');
    });

    it('has proper text styling for unauthenticated message', () => {
      setupUnauthenticatedAuth();

      const { container } = render(
        <AuthenticatedPage>
          <TestContent />
        </AuthenticatedPage>
      );

      const textDiv = container.querySelector('.text-muted-foreground');
      expect(textDiv).toBeInTheDocument();
      expect(textDiv).toHaveTextContent('Please sign in to access this page.');
    });
  });
});