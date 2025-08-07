import { screen, fireEvent } from '@testing-library/react';
import { renderDashboard, expectElementToBeInDocument, expectTextToBeInDocument, expectButtonToBeInDocument } from './test-helpers';
import * as useDashboardStatsModule from '@/hooks/use-dashboard-stats';

// Mock the useDashboardStats hook
jest.mock('@/hooks/use-dashboard-stats');

// Mock Next.js router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

const mockUseDashboardStats = useDashboardStatsModule.useDashboardStats as jest.MockedFunction<
  typeof useDashboardStatsModule.useDashboardStats
>;

// Mock console.log to avoid noise in tests
jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset router mock
    mockPush.mockClear();
    // Default mock implementation
    mockUseDashboardStats.mockReturnValue({
      stats: { characters: 0, encounters: 0, parties: 0 },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe('Component Rendering', () => {
    test('renders without errors', () => {
      renderDashboard();
      expectElementToBeInDocument('dashboard');
    });

    test('renders dashboard title', () => {
      renderDashboard();
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });

    test('applies correct layout classes', () => {
      renderDashboard();
      const dashboard = screen.getByTestId('dashboard');
      expect(dashboard).toHaveClass('p-6', 'space-y-6');
    });
  });

  describe('Summary Cards', () => {
    test('renders summary cards component', () => {
      renderDashboard();
      expectElementToBeInDocument('summary-cards');
    });

    test('summary cards display correct titles', () => {
      renderDashboard();
      expectTextToBeInDocument('Characters');
      expectTextToBeInDocument('Encounters');
      expectTextToBeInDocument('Active Sessions');
    });

    test('summary cards display real statistics from API', () => {
      mockUseDashboardStats.mockReturnValue({
        stats: { characters: 5, encounters: 3, parties: 2 },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderDashboard();
      const characterValue = screen.getByTestId('characters-value');
      const encounterValue = screen.getByTestId('encounters-value');
      const sessionsValue = screen.getByTestId('active-sessions-value');

      expect(characterValue).toHaveTextContent('5');
      expect(encounterValue).toHaveTextContent('3');
      expect(sessionsValue).toHaveTextContent('2'); // parties mapped to activeSessions
    });

    test('summary cards display loading state', () => {
      mockUseDashboardStats.mockReturnValue({
        stats: { characters: 0, encounters: 0, parties: 0 },
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      renderDashboard();
      const characterValue = screen.getByTestId('characters-value');
      const encounterValue = screen.getByTestId('encounters-value');
      const sessionsValue = screen.getByTestId('active-sessions-value');

      expect(characterValue).toHaveTextContent('...');
      expect(encounterValue).toHaveTextContent('...');
      expect(sessionsValue).toHaveTextContent('...');
    });

    test('summary cards display error state', () => {
      mockUseDashboardStats.mockReturnValue({
        stats: { characters: 0, encounters: 0, parties: 0 },
        isLoading: false,
        error: 'Failed to load dashboard statistics',
        refetch: jest.fn(),
      });

      renderDashboard();

      expect(screen.getByText('Error loading statistics')).toBeInTheDocument();
      expect(screen.getByText('Failed to load dashboard statistics')).toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    test('renders quick action toolbar', () => {
      renderDashboard();
      expectElementToBeInDocument('quick-actions');
    });

    test('displays all quick action buttons', () => {
      renderDashboard();
      expectButtonToBeInDocument(/create character/i);
      expectButtonToBeInDocument(/create encounter/i);
      expectButtonToBeInDocument(/start combat/i);
    });
  });

  describe('Dashboard Widgets', () => {
    test('renders widget grid container', () => {
      renderDashboard();
      expectElementToBeInDocument('dashboard-widgets');
    });

    test('widget grid has correct responsive classes', () => {
      renderDashboard();
      const widgetGrid = screen.getByTestId('dashboard-widgets');
      expect(widgetGrid).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-6');
    });
  });

  describe('Recent Activity Feed', () => {
    test('renders activity feed section', () => {
      renderDashboard();
      expectElementToBeInDocument('activity-feed');
    });

    test('displays empty state when no activity', () => {
      renderDashboard();
      expectTextToBeInDocument(/no recent activity/i);
    });
  });

  describe('Customization Features', () => {
    test('renders customization button', () => {
      renderDashboard();
      expectButtonToBeInDocument(/customize dashboard/i);
    });
  });

  describe('Action Handler Navigation', () => {
    test('Create Character button navigates to character creation', () => {
      renderDashboard();
      const createCharacterButton = screen.getByRole('button', { name: /create character/i });

      fireEvent.click(createCharacterButton);

      expect(mockPush).toHaveBeenCalledWith('/characters');
    });

    test('Create Encounter button navigates to encounter creation', () => {
      renderDashboard();
      const createEncounterButton = screen.getByRole('button', { name: /create encounter/i });

      fireEvent.click(createEncounterButton);

      expect(mockPush).toHaveBeenCalledWith('/encounters/create');
    });

    test('Start Combat button navigates to combat page', () => {
      renderDashboard();
      const startCombatButton = screen.getByRole('button', { name: /start combat/i });

      fireEvent.click(startCombatButton);

      expect(mockPush).toHaveBeenCalledWith('/combat');
    });

    test('Customize Dashboard button opens dashboard customization', () => {
      renderDashboard();
      const customizeButton = screen.getByRole('button', { name: /customize dashboard/i });

      fireEvent.click(customizeButton);

      // For now, this will test that console.log is called
      // Later we can implement a proper customization modal
      expect(console.log).toHaveBeenCalledWith('Customize dashboard clicked');
    });
  });
});