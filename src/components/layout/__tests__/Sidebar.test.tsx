import { screen } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { setupLayoutTest, mockUsePathname } from './test-utils';
import {
  createVisibilityTests,
  createAuthenticationTests,
  createUserProfileTests,
  createActiveStateTests,
  createLayoutStructureTests,
  createBrandLogoTests,
  createAnimationTests,
  renderWithProps,
} from './layout-test-helpers';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
  useClerk: jest.fn(),
}));

describe('Sidebar', () => {
  const { cleanup } = setupLayoutTest();

  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // Consolidated test suites using helpers
  describe('Visibility Behavior', () => {
    const tests = createVisibilityTests(Sidebar, 'D&D Tracker');
    Object.keys(tests).forEach(testName => {
      test(testName, tests[testName]);
    });
  });

  describe('Layout Structure', () => {
    const layoutTests = createLayoutStructureTests(Sidebar);
    Object.keys(layoutTests).forEach(testName => {
      test(testName, layoutTests[testName]);
    });

    test('applies correct CSS classes for sidebar positioning', () => {
      const { container } = renderWithProps(Sidebar);
      const sidebarElement = container.firstChild as HTMLElement;
      expect(sidebarElement).toHaveClass(
        'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out lg:relative lg:z-auto'
      );
    });
  });

  describe('Brand/Logo Section', () => {
    const brandTests = createBrandLogoTests(Sidebar);
    Object.keys(brandTests).forEach(testName => {
      test(testName, brandTests[testName]);
    });

    test('brand header has correct height and styling', () => {
      renderWithProps(Sidebar);
      const brandHeader = screen.getByText('D&D Tracker').closest('.flex.h-16');
      expect(brandHeader).toBeInTheDocument();
      expect(brandHeader).toHaveClass('border-b border-border px-6');
    });
  });

  describe('Navigation Items', () => {
    const authTests = createAuthenticationTests(Sidebar);
    Object.keys(authTests).forEach(testName => {
      test(testName, authTests[testName]);
    });

    test('renders all secondary navigation items when authenticated', () => {
      renderWithProps(Sidebar, { isAuthenticated: true });
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Help')).toBeInTheDocument();
    });

    test('has visual separator between primary and secondary navigation when authenticated', () => {
      renderWithProps(Sidebar, { isAuthenticated: true });
      const separator = screen
        .getByRole('navigation')
        .querySelector('.border-t.border-border');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveClass('my-4');
    });
  });

  describe('Active State Tests', () => {
    const activeTests = createActiveStateTests(
      Sidebar,
      mockUsePathname as jest.Mock
    );
    Object.keys(activeTests).forEach(testName => {
      test(testName, activeTests[testName]);
    });

    test('active state works for secondary navigation items', () => {
      mockUsePathname.mockReturnValue('/settings');
      renderWithProps(Sidebar, { isAuthenticated: true });
      const settingsLink = screen.getByText('Settings').closest('a');
      expect(settingsLink).toHaveClass('bg-primary text-primary-foreground');
    });
  });

  describe('User Profile Footer', () => {
    const profileTests = createUserProfileTests(Sidebar);
    Object.keys(profileTests).forEach(testName => {
      test(testName, profileTests[testName]);
    });
  });

  describe('Navigation Link Component', () => {
    const animationTests = createAnimationTests(Sidebar);
    Object.keys(animationTests).forEach(testName => {
      test(testName, animationTests[testName]);
    });

    test('navigation icons have consistent sizing', () => {
      renderWithProps(Sidebar);
      const navigationSection = screen.getByRole('navigation');
      const icons = navigationSection.querySelectorAll('svg');

      for (const icon of Array.from(icons)) {
        expect(icon).toHaveClass('h-5 w-5');
      }
    });
  });

  describe('Responsive Design Classes', () => {
    test('has correct z-index classes for mobile and desktop', () => {
      const { container } = renderWithProps(Sidebar);
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('z-50 lg:z-auto');
    });

    test('has correct positioning classes for mobile and desktop', () => {
      const { container } = renderWithProps(Sidebar);
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('fixed lg:relative');
    });

    test('navigation sections have proper spacing', () => {
      renderWithProps(Sidebar);
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveClass('flex-1 space-y-1 px-3 py-4');
    });
  });

  describe('UserMenu Integration', () => {
    test('renders UserMenu component when authenticated', () => {
      renderWithProps(Sidebar, { isAuthenticated: true });
      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });

    test('does not render UserMenu component when unauthenticated', () => {
      renderWithProps(Sidebar, { isAuthenticated: false });
      // UserMenu returns null when not authenticated
      expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
    });

    test('UserMenu appears at bottom of sidebar when authenticated', () => {
      renderWithProps(Sidebar, { isAuthenticated: true });
      const sidebar = screen
        .getByTestId('user-menu')
        .closest('.flex.h-full.flex-col');
      const userMenu = screen.getByTestId('user-menu');

      // UserMenu should be one of the last elements in the flex column
      expect(sidebar).toContainElement(userMenu);
    });

    test('UserMenu has consistent structure when rendered', () => {
      renderWithProps(Sidebar, { isAuthenticated: true });
      const userMenu = screen.getByTestId('user-menu');
      expect(userMenu).toBeInTheDocument();
      // Note: Actual styling and auth logic is tested in UserMenu component tests
    });
  });
});
