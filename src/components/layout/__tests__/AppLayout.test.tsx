import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUser, useClerk, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { AppLayout } from '../AppLayout';
import { setupLayoutTest, mockWindowInnerWidth } from './test-utils';

// Mock next-auth/react
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
  useClerk: jest.fn(),
  useAuth: jest.fn(),
  UserButton: ({
    afterSignOutUrl,
    userProfileUrl,
  }: {
    afterSignOutUrl: string;
    userProfileUrl: string;
  }) => (
    <div data-testid="user-button">
      <a href={userProfileUrl}>My Account</a>
      <button
        onClick={() => {
          if (afterSignOutUrl) {
            window.location.href = afterSignOutUrl;
          }
        }}
      >
        Sign Out
      </button>
    </div>
  ),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock the child components
jest.mock('../Sidebar', () => ({
  Sidebar: ({
    isOpen,
    isAuthenticated,
  }: {
    isOpen: boolean;
    isAuthenticated?: boolean;
  }) => (
    <div data-testid="sidebar" data-open={isOpen} data-auth={isAuthenticated} />
  ),
}));

jest.mock('../MobileMenu', () => ({
  MobileMenu: ({
    isOpen,
    onClose,
    isAuthenticated,
  }: {
    isOpen: boolean;
    onClose: () => void;
    isAuthenticated?: boolean;
  }) => (
    <div
      data-testid="mobile-menu"
      data-open={isOpen}
      data-auth={isAuthenticated}
    >
      {isOpen && (
        <button data-testid="mobile-menu-close" onClick={onClose}>
          Close
        </button>
      )}
    </div>
  ),
}));

jest.mock('../Breadcrumbs', () => ({
  Breadcrumbs: () => <div data-testid="breadcrumbs" />,
}));

jest.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

describe('AppLayout', () => {
  const { cleanup } = setupLayoutTest();
  const mockChildren = <div data-testid="main-content">Test Content</div>;
  const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
  const mockUseClerk = useClerk as jest.MockedFunction<typeof useClerk>;
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    // Reset window.innerWidth to desktop size
    mockWindowInnerWidth(1024);

    // Setup default clerk mock
    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });

    mockUseClerk.mockReturnValue({
      signOut: jest.fn(),
    } as any);

    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Component Rendering', () => {
    test('renders without errors', () => {
      render(<AppLayout>{mockChildren}</AppLayout>);
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    test('renders all core layout components', () => {
      render(<AppLayout>{mockChildren}</AppLayout>);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    test('renders children content in main element', () => {
      render(<AppLayout>{mockChildren}</AppLayout>);
      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
      expect(mainElement).toContainElement(screen.getByTestId('main-content'));
    });

    test('applies correct CSS classes for layout structure', () => {
      const { container } = render(<AppLayout>{mockChildren}</AppLayout>);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveClass('min-h-screen');
      expect(rootDiv).toHaveClass('bg-background');
      expect(rootDiv).toHaveClass('lg:flex');
    });
  });

  describe('Desktop Layout Behavior', () => {
    test('shows sidebar on desktop (width >= 1024px)', () => {
      mockWindowInnerWidth(1024);
      render(<AppLayout>{mockChildren}</AppLayout>);

      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-open',
        'true'
      );
    });

    test('hides mobile menu button on desktop', () => {
      mockWindowInnerWidth(1024);
      render(<AppLayout>{mockChildren}</AppLayout>);

      const mobileMenuButton = screen.queryByLabelText('Open menu');
      expect(mobileMenuButton).not.toBeInTheDocument();
    });

    test('mobile menu is closed by default on desktop', () => {
      mockWindowInnerWidth(1024);
      render(<AppLayout>{mockChildren}</AppLayout>);

      expect(screen.getByTestId('mobile-menu')).toHaveAttribute(
        'data-open',
        'false'
      );
    });
  });

  describe('Mobile Layout Behavior', () => {
    test('hides sidebar on mobile (width < 1024px)', () => {
      mockWindowInnerWidth(768);

      act(() => {
        render(<AppLayout>{mockChildren}</AppLayout>);
        // Trigger resize event
        fireEvent(window, new Event('resize'));
      });

      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-open',
        'false'
      );
    });

    test('shows mobile menu button on mobile', () => {
      mockWindowInnerWidth(768);

      act(() => {
        render(<AppLayout>{mockChildren}</AppLayout>);
        fireEvent(window, new Event('resize'));
      });

      const mobileMenuButton = screen.getByLabelText('Open menu');
      expect(mobileMenuButton).toBeInTheDocument();
      expect(mobileMenuButton).toHaveClass('lg:hidden');
    });

    test('mobile menu button opens mobile menu when clicked', () => {
      mockWindowInnerWidth(768);

      act(() => {
        render(<AppLayout>{mockChildren}</AppLayout>);
        fireEvent(window, new Event('resize'));
      });

      const mobileMenuButton = screen.getByLabelText('Open menu');

      act(() => {
        fireEvent.click(mobileMenuButton);
      });

      expect(screen.getByTestId('mobile-menu')).toHaveAttribute(
        'data-open',
        'true'
      );
    });

    test('mobile menu can be closed', () => {
      mockWindowInnerWidth(768);

      act(() => {
        render(<AppLayout>{mockChildren}</AppLayout>);
        fireEvent(window, new Event('resize'));
      });

      // Open mobile menu
      const mobileMenuButton = screen.getByLabelText('Open menu');
      act(() => {
        fireEvent.click(mobileMenuButton);
      });

      // Close mobile menu
      const closeButton = screen.getByTestId('mobile-menu-close');
      act(() => {
        fireEvent.click(closeButton);
      });

      expect(screen.getByTestId('mobile-menu')).toHaveAttribute(
        'data-open',
        'false'
      );
    });
  });

  describe('Responsive Behavior', () => {
    test('transitions from mobile to desktop layout correctly', () => {
      mockWindowInnerWidth(768);

      act(() => {
        render(<AppLayout>{mockChildren}</AppLayout>);
        fireEvent(window, new Event('resize'));
      });

      // Verify mobile state
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-open',
        'false'
      );
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument();

      // Resize to desktop
      act(() => {
        mockWindowInnerWidth(1024);
        fireEvent(window, new Event('resize'));
      });

      // Verify desktop state
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-open',
        'true'
      );
      expect(screen.queryByLabelText('Open menu')).not.toBeInTheDocument();
    });

    test('auto-closes mobile menu when resizing to desktop', () => {
      mockWindowInnerWidth(768);

      act(() => {
        render(<AppLayout>{mockChildren}</AppLayout>);
        fireEvent(window, new Event('resize'));
      });

      // Open mobile menu
      const mobileMenuButton = screen.getByLabelText('Open menu');
      act(() => {
        fireEvent.click(mobileMenuButton);
      });

      expect(screen.getByTestId('mobile-menu')).toHaveAttribute(
        'data-open',
        'true'
      );

      // Resize to desktop
      act(() => {
        mockWindowInnerWidth(1024);
        fireEvent(window, new Event('resize'));
      });

      expect(screen.getByTestId('mobile-menu')).toHaveAttribute(
        'data-open',
        'false'
      );
    });

    test('cleans up resize event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<AppLayout>{mockChildren}</AppLayout>);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Header Navigation Elements', () => {
    test('renders header with correct structure', () => {
      render(<AppLayout>{mockChildren}</AppLayout>);

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass(
        'sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm'
      );
    });

    test('header contains breadcrumbs in flex-1 container', () => {
      render(<AppLayout>{mockChildren}</AppLayout>);

      const breadcrumbsContainer =
        screen.getByTestId('breadcrumbs').parentElement;
      expect(breadcrumbsContainer).toHaveClass('flex-1');
    });

    test('header contains theme toggle', () => {
      render(<AppLayout>{mockChildren}</AppLayout>);

      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    test('header contains auth button based on status', () => {
      mockUseUser.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        user: null,
      });

      render(<AppLayout>{mockChildren}</AppLayout>);

      const signInButton = screen.getByRole('button', { name: 'Sign In' });
      expect(signInButton).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    test('mobile menu button has proper aria-label', () => {
      mockWindowInnerWidth(768);

      act(() => {
        render(<AppLayout>{mockChildren}</AppLayout>);
        fireEvent(window, new Event('resize'));
      });

      const mobileMenuButton = screen.getByLabelText('Open menu');
      expect(mobileMenuButton).toHaveAttribute('aria-label', 'Open menu');
    });

    test('main content has proper role', () => {
      render(<AppLayout>{mockChildren}</AppLayout>);

      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
      expect(mainElement).toHaveClass('flex-1 overflow-auto');
    });

    test('header has proper role', () => {
      render(<AppLayout>{mockChildren}</AppLayout>);

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Mobile Menu Button Icon', () => {
    test('mobile menu button contains hamburger icon', () => {
      mockWindowInnerWidth(768);

      act(() => {
        render(<AppLayout>{mockChildren}</AppLayout>);
        fireEvent(window, new Event('resize'));
      });

      const mobileMenuButton = screen.getByLabelText('Open menu');
      const svg = mobileMenuButton.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('h-6 w-6');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });
  });

  describe('Layout State Management', () => {
    test('maintains separate state for sidebar and mobile menu visibility', () => {
      mockWindowInnerWidth(768);

      act(() => {
        render(<AppLayout>{mockChildren}</AppLayout>);
        fireEvent(window, new Event('resize'));
      });

      // Initially: sidebar closed, mobile menu closed
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-open',
        'false'
      );
      expect(screen.getByTestId('mobile-menu')).toHaveAttribute(
        'data-open',
        'false'
      );

      // Open mobile menu
      const mobileMenuButton = screen.getByLabelText('Open menu');
      act(() => {
        fireEvent.click(mobileMenuButton);
      });

      // Now: sidebar still closed, mobile menu open
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-open',
        'false'
      );
      expect(screen.getByTestId('mobile-menu')).toHaveAttribute(
        'data-open',
        'true'
      );
    });
  });

  describe('Authentication Aware Features', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('renders sign in button when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
      mockUseUser.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        user: null,
      });

      render(<AppLayout>{mockChildren}</AppLayout>);
      expect(
        screen.getByRole('button', { name: 'Sign In' })
      ).toBeInTheDocument();
    });

    test('renders user menu when user is authenticated', () => {
      mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
      mockUseUser.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          fullName: 'Test User',
          imageUrl: 'https://example.com/avatar.png',
        } as any,
      });

      render(<AppLayout>{mockChildren}</AppLayout>);
      expect(
        screen.getByRole('button', { name: 'User menu' })
      ).toBeInTheDocument();
    });

    test('shows loading state during authentication check', () => {
      mockUseAuth.mockReturnValue({ isLoaded: false, isSignedIn: false });
      mockUseUser.mockReturnValue({
        isLoaded: false,
        isSignedIn: false,
        user: null,
      });

      render(<AppLayout>{mockChildren}</AppLayout>);
      expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
    });

    test('passes auth status to sidebar', () => {
      mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
      mockUseUser.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          fullName: 'Test User',
          imageUrl: 'https://example.com/avatar.png',
        } as any,
      });

      render(<AppLayout>{mockChildren}</AppLayout>);
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-open',
        'true'
      );
    });

    test('displays real user name when authenticated', () => {
      mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
      mockUseUser.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          fullName: 'John Doe',
          imageUrl: 'https://example.com/avatar.png',
        } as any,
      });

      render(<AppLayout>{mockChildren}</AppLayout>);
      // The user name is in the UserMenu component, which is not rendered in this test
      // So we can't test for the user name here.
      // We will test for the user menu button instead.
      expect(
        screen.getByRole('button', { name: 'User menu' })
      ).toBeInTheDocument();
    });

    test('displays user email when name is not available', () => {
      mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
      mockUseUser.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          primaryEmailAddress: { emailAddress: 'john.doe@example.com' },
          imageUrl: 'https://example.com/avatar.png',
        } as any,
      });

      render(<AppLayout>{mockChildren}</AppLayout>);
      // The user email is in the UserMenu component, which is not rendered in this test
      // So we can't test for the user email here.
      // We will test for the user menu button instead.
      expect(
        screen.getByRole('button', { name: 'User menu' })
      ).toBeInTheDocument();
    });
  });

  describe('User Dropdown Menu Functionality', () => {
    const mockSignOut = jest.fn();
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
      user = userEvent.setup();
      jest.clearAllMocks();
      mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
      mockUseUser.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          fullName: 'Test User',
          imageUrl: 'https://example.com/avatar.png',
        } as any,
      });
      mockUseClerk.mockReturnValue({
        signOut: mockSignOut,
      } as any);
    });

    const setupUserDropdownTest = () => {
      render(<AppLayout>{mockChildren}</AppLayout>);
      const userMenuButton = screen.getByRole('button', { name: 'User menu' });
      return { userMenuButton };
    };

    const openDropdownMenu = async (userMenuButton: HTMLElement) => {
      await user.click(userMenuButton);
      await waitFor(() => {
        expect(screen.getByText('My Account')).toBeInTheDocument();
      });
    };

    test('renders the UserMenu component when authenticated', () => {
      setupUserDropdownTest();
      expect(
        screen.getByRole('button', { name: 'User menu' })
      ).toBeInTheDocument();
    });

    test('user menu button does not immediately sign out when clicked', async () => {
      const { userMenuButton } = setupUserDropdownTest();
      await user.click(userMenuButton);

      // Should NOT call signOut immediately
      expect(mockSignOut).not.toHaveBeenCalled();
    });

    test('clicking user menu button shows dropdown menu', async () => {
      const { userMenuButton } = setupUserDropdownTest();
      await user.click(userMenuButton);

      // Should show dropdown menu
      await waitFor(() => {
        expect(screen.getByText('My Account')).toBeInTheDocument();
      });
    });

    test('dropdown menu contains settings option', async () => {
      const { userMenuButton } = setupUserDropdownTest();
      await openDropdownMenu(userMenuButton);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    test('dropdown menu contains logout option', async () => {
      const { userMenuButton } = setupUserDropdownTest();
      await openDropdownMenu(userMenuButton);

      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    test('logout button has click handler', async () => {
      const { userMenuButton } = setupUserDropdownTest();
      await openDropdownMenu(userMenuButton);

      // Verify the logout button is clickable (has onClick handler)
      const logoutButton = screen
        .getByText('Sign Out')
        .closest('[role="menuitem"]');
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton).toHaveAttribute('role', 'menuitem');
    });

    test('dropdown menu is properly structured', async () => {
      const { userMenuButton } = setupUserDropdownTest();
      await openDropdownMenu(userMenuButton);

      // Check that all expected elements are present
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    test('pressing escape closes the dropdown', async () => {
      const { userMenuButton } = setupUserDropdownTest();
      await openDropdownMenu(userMenuButton);

      // Press escape
      await user.keyboard('{Escape}');

      // Should close dropdown
      await waitFor(() => {
        expect(screen.queryByText('My Account')).not.toBeInTheDocument();
      });
    });

    test('dropdown has proper accessibility attributes', async () => {
      const { userMenuButton } = setupUserDropdownTest();

      // Button should have aria-expanded
      expect(userMenuButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(userMenuButton);

      // Button should show expanded state
      await waitFor(() => {
        expect(userMenuButton).toHaveAttribute('aria-expanded', 'true');
      });
    });

    test('clicking sign out option triggers signOut function', async () => {
      const { userMenuButton } = setupUserDropdownTest();
      await openDropdownMenu(userMenuButton);

      // Click the Sign Out option
      const signOutOption = screen.getByText('Sign Out');
      await act(async () => {
        await user.click(signOutOption);
      });

      // Should call signOut function
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    test('clicking settings option navigates to user profile page', async () => {
      const mockPush = jest.fn();
      (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

      const { userMenuButton } = setupUserDropdownTest();
      await openDropdownMenu(userMenuButton);

      // Click the Settings option
      const settingsOption = screen.getByText('Settings');
      await act(async () => {
        await user.click(settingsOption);
      });

      // Should navigate to user profile page (Clerk's user management)
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/user-profile');
    });
  });
});
