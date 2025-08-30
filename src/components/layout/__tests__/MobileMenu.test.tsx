import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react';
import { MobileMenu } from '../MobileMenu';
import { setupLayoutTest, mockUsePathname } from './test-utils';
import {
  createVisibilityTests,
  createAuthenticationTests,
  createUserProfileTests,
  createActiveStateTests,
  createLayoutStructureTests,
  createBrandLogoTests,
  createClickInteractionTests,
  createAnimationTests,
  createMockCallbacks,
  clearAllMocks,
  renderWithProps,
} from './layout-test-helpers';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock Clerk hooks
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
  useClerk: jest.fn(() => ({
    signOut: jest.fn(),
  })),
}));



// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    className,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    onClick?: () => void;
  }) {
    return React.createElement(
      'a',
      { href, className, onClick, ...props },
      children
    );
  };
});

describe('MobileMenu', () => {
  const mocks = createMockCallbacks();
  const { cleanup } = setupLayoutTest();

  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
    clearAllMocks(mocks);
    jest.clearAllMocks();
    // Mock Clerk authentication state
    (require('@clerk/nextjs').useAuth as jest.Mock).mockReturnValue({
      isSignedIn: true,
      userId: 'user_test_123', // Example user ID
    });
    (require('@clerk/nextjs').useUser as jest.Mock).mockReturnValue({
      isLoaded: true,
      user: {
        id: 'user_test_123',
        fullName: 'Test User',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  // Consolidated test suites using helpers
  describe('Visibility Behavior', () => {
    const tests = createVisibilityTests(MobileMenu, 'D&D Tracker', { onClose: mocks.onClose });
    Object.keys(tests).forEach(testName => {
      test(testName, tests[testName]);
    });
  });

  describe('Body Scroll Management', () => {
    test('disables body scroll when menu is open', () => {
      act(() => {
        renderWithProps(MobileMenu, { onClose: mocks.onClose });
      });
      expect(document.body.style.overflow).toBe('hidden');
    });

    test('restores body scroll when menu is closed', () => {
      const { rerender } = renderWithProps(MobileMenu, { onClose: mocks.onClose });
      expect(document.body.style.overflow).toBe('hidden');

      act(() => {
        rerender(<MobileMenu isOpen={false} onClose={mocks.onClose!} />);
      });
      expect(document.body.style.overflow).toBe('unset');
    });

    test('restores body scroll on component unmount', () => {
      const { unmount } = renderWithProps(MobileMenu, { onClose: mocks.onClose });
      expect(document.body.style.overflow).toBe('hidden');

      act(() => {
        unmount();
      });
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Layout Structure', () => {
    const layoutTests = createLayoutStructureTests(MobileMenu, { onClose: mocks.onClose });
    Object.keys(layoutTests).forEach(testName => {
      test(testName, layoutTests[testName]);
    });

    test('renders backdrop overlay', () => {
      const { container } = renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const backdrop = container.querySelector(
        '.fixed.inset-0.z-40.bg-black\\/50.lg\\:hidden'
      );
      expect(backdrop).toBeInTheDocument();
      expect(backdrop).toHaveClass('fixed inset-0 z-40 bg-black/50 lg:hidden');
    });

    test('renders mobile menu panel with correct styling', () => {
      const { container } = renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const menuPanel = container.querySelector(
        '.fixed.inset-y-0.left-0.z-50.w-64'
      );
      expect(menuPanel).toBeInTheDocument();
      expect(menuPanel).toHaveClass(
        'bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:hidden'
      );
    });
  });

  describe('Header Section', () => {
    const brandTests = createBrandLogoTests(MobileMenu, { onClose: mocks.onClose });
    Object.keys(brandTests).forEach(testName => {
      test(testName, brandTests[testName]);
    });

    test('header has correct height and styling', () => {
      renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const header = screen.getByText('D&D Tracker').closest('.flex.h-16');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass(
        'items-center justify-between border-b border-border px-4'
      );
    });
  });

  describe('Close Button', () => {
    test('renders close button with correct accessibility', () => {
      renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const closeButton = screen.getByLabelText('Close menu');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close menu');
    });

    test('close button has correct styling', () => {
      renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const closeButton = screen.getByLabelText('Close menu');
      expect(closeButton).toHaveClass(
        'rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      );
    });

    test('close button contains X icon', () => {
      renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const closeButton = screen.getByLabelText('Close menu');
      const icon = closeButton.querySelector('svg');

      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-6 w-6');
      expect(icon).toHaveAttribute('viewBox', '0 0 24 24');

      const path = icon?.querySelector('path');
      expect(path).toHaveAttribute('d', 'M6 18L18 6M6 6l12 12');
    });

    test('calls onClose when close button is clicked', () => {
      renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const closeButton = screen.getByLabelText('Close menu');
      fireEvent.click(closeButton);
      expect(mocks.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Backdrop Interaction', () => {
    test('calls onClose when backdrop is clicked', () => {
      const { container } = renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const backdrop = container.querySelector(
        '.fixed.inset-0.z-40.bg-black\\/50.lg\\:hidden'
      );
      fireEvent.click(backdrop!);
      expect(mocks.onClose).toHaveBeenCalledTimes(1);
    });

    test('backdrop has proper z-index for overlay', () => {
      const { container } = renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const backdrop = container.querySelector(
        '.fixed.inset-0.z-40.bg-black\\/50.lg\\:hidden'
      );
      expect(backdrop).toHaveClass('z-40');
    });
  });

  describe('Navigation Items', () => {
    const authTests = createAuthenticationTests(MobileMenu, { onClose: mocks.onClose });
    Object.keys(authTests).forEach(testName => {
      test(testName, authTests[testName]);
    });

    const clickTests = createClickInteractionTests(MobileMenu, mocks, {});
    Object.keys(clickTests).forEach(testName => {
      test(testName, clickTests[testName]);
    });
  });

  describe('Active State Handling', () => {
    const activeTests = createActiveStateTests(MobileMenu, mockUsePathname, { onClose: mocks.onClose });
    Object.keys(activeTests).forEach(testName => {
      test(testName, activeTests[testName]);
    });
  });

  describe('User Profile Footer', () => {
    const profileTests = createUserProfileTests(MobileMenu, { onClose: mocks.onClose });
    Object.keys(profileTests).forEach(testName => {
      test(testName, profileTests[testName]);
    });
  });

  describe('Mobile-Specific Design', () => {
    test('has lg:hidden class to hide on desktop', () => {
      const { container } = renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const backdrop = container.querySelector(
        '.fixed.inset-0.z-40.bg-black\\/50.lg\\:hidden'
      );
      const menuPanel = container.querySelector(
        '.fixed.inset-y-0.left-0.z-50.w-64'
      );

      expect(backdrop).toHaveClass('lg:hidden');
      expect(menuPanel).toHaveClass('lg:hidden');
    });

    const animationTests = createAnimationTests(MobileMenu, { onClose: mocks.onClose });
    Object.keys(animationTests).forEach(testName => {
      test(testName, animationTests[testName]);
    });
  });

  describe('Animation and Transitions', () => {
    test('menu panel has transition classes', () => {
      const { container } = renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const menuPanel = container.querySelector(
        '.fixed.inset-y-0.left-0.z-50.w-64'
      );
      expect(menuPanel).toHaveClass(
        'transform transition-transform duration-300 ease-in-out'
      );
    });

    test('navigation section has proper spacing', () => {
      renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveClass('flex-1 space-y-1 px-3 py-4');
    });
  });

  describe('Z-Index Stacking', () => {
    test('backdrop has lower z-index than menu panel', () => {
      const { container } = renderWithProps(MobileMenu, { onClose: mocks.onClose });
      const backdrop = container.querySelector(
        '.fixed.inset-0.z-40.bg-black\\/50.lg\\:hidden'
      );
      const menuPanel = container.querySelector(
        '.fixed.inset-y-0.left-0.z-50.w-64'
      );

      expect(backdrop).toHaveClass('z-40');
      expect(menuPanel).toHaveClass('z-50');
    });
  });
});
