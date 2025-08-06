import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PartyListView } from '../PartyListView';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock custom hooks
jest.mock('../hooks/usePartyData', () => ({
  usePartyData: jest.fn(),
}));

jest.mock('../hooks/usePartyFilters', () => ({
  usePartyFilters: jest.fn(),
}));

jest.mock('../hooks/usePartySelection', () => ({
  usePartySelection: jest.fn(),
}));

// Mock components
jest.mock('../BatchActions', () => ({
  BatchActions: ({ selectedCount, selectedParties, onClearSelection, onRefetch }: any) => (
    <div data-testid="batch-actions">
      <span>Selected: {selectedCount}</span>
      <span>Parties: {selectedParties?.join(',')}</span>
      <button onClick={onClearSelection}>Clear Selection</button>
      <button onClick={onRefetch}>Refetch</button>
    </div>
  ),
}));

jest.mock('@/components/shared/Pagination', () => ({
  Pagination: ({ currentPage, totalPages, totalItems, onPageChange }: any) => (
    <div data-testid="pagination">
      <span>Page {currentPage} of {totalPages}</span>
      <span>Total: {totalItems}</span>
      <button onClick={() => onPageChange(currentPage + 1)}>Next</button>
    </div>
  ),
}));

jest.mock('../PartyListView/ErrorFallback', () => ({
  ErrorFallback: ({ onRetry }: any) => (
    <div data-testid="error-fallback">
      <span>Error occurred</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

jest.mock('../PartyListView/ControlsSection', () => ({
  ControlsSection: ({ onCreateParty, viewMode, onViewModeChange }: any) => (
    <div data-testid="controls-section">
      <button onClick={onCreateParty}>Create Party</button>
      <button onClick={() => onViewModeChange('grid')}>Grid View</button>
      <button onClick={() => onViewModeChange('table')}>Table View</button>
      <span>Current view: {viewMode}</span>
    </div>
  ),
}));

jest.mock('../PartyListView/ContentSection', () => ({
  ContentSection: ({ viewMode, gridProps }: any) => (
    <div data-testid="content-section">
      <span>View mode: {viewMode}</span>
      <div data-testid="party-content">
        {gridProps?.parties?.map((party: any) => (
          <div key={party.id} data-testid={`party-${party.id}`}>
            {party.name}
          </div>
        ))}
      </div>
    </div>
  ),
}));

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
};

const mockSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  },
};

// Mock data
const mockParties = [
  {
    id: 'party-1',
    name: 'The Brave Adventurers',
    description: 'A party of brave heroes',
    memberCount: 4,
    createdAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'party-2',
    name: 'The Shadow Walkers',
    description: 'Stealthy rogues and assassins',
    memberCount: 3,
    createdAt: '2023-01-02T00:00:00Z',
  },
];

const mockPagination = {
  currentPage: 1,
  totalPages: 2,
  totalItems: 10,
};

// Helper function to create mock data configurations
function createMockDataConfig(overrides = {}) {
  return {
    parties: mockParties,
    isLoading: false,
    error: null,
    pagination: mockPagination,
    goToPage: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  };
}

// Helper function to setup mocks with common configuration
function setupMocks(dataOverrides = {}, selectionOverrides = {}) {
  const mockUsePartyData = require('../hooks/usePartyData').usePartyData;
  const mockUsePartyFilters = require('../hooks/usePartyFilters').usePartyFilters;
  const mockUsePartySelection = require('../hooks/usePartySelection').usePartySelection;

  mockUsePartyFilters.mockReturnValue({
    filters: {},
    searchQuery: '',
    sortBy: 'name',
    sortOrder: 'asc',
    updateFilters: jest.fn(),
    updateSearchQuery: jest.fn(),
    updateSort: jest.fn(),
    clearFilters: jest.fn(),
  });

  mockUsePartyData.mockReturnValue(createMockDataConfig(dataOverrides));

  mockUsePartySelection.mockReturnValue({
    selectedParties: [],
    selectAll: jest.fn(),
    selectParty: jest.fn(),
    clearSelection: jest.fn(),
    isAllSelected: false,
    hasSelection: false,
    ...selectionOverrides,
  });
}

describe('PartyListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });
    setupMocks();
  });

  describe('Loading State', () => {
    it('should display loading state', () => {
      setupMocks({ parties: [], isLoading: true, pagination: null });
      render(<PartyListView />);
      expect(screen.getByTestId('content-section')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error fallback when error occurs', () => {
      const mockError = new Error('Failed to load parties');
      setupMocks({ parties: [], error: mockError, pagination: null });
      render(<PartyListView />);
      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });

    it('should handle retry action', () => {
      const mockRefetch = jest.fn();
      const mockError = new Error('Failed to load parties');
      setupMocks({ parties: [], error: mockError, pagination: null, refetch: mockRefetch });
      render(<PartyListView />);
      fireEvent.click(screen.getByText('Retry'));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('View Mode Toggle', () => {
    it('should default to grid view', () => {
      render(<PartyListView />);

      expect(screen.getByText('Current view: grid')).toBeInTheDocument();
    });

    it('should switch to table view', () => {
      render(<PartyListView />);

      fireEvent.click(screen.getByText('Table View'));
      expect(screen.getByText('View mode: table')).toBeInTheDocument();
    });

    it('should switch back to grid view', () => {
      render(<PartyListView />);

      fireEvent.click(screen.getByText('Table View'));
      fireEvent.click(screen.getByText('Grid View'));
      expect(screen.getByText('View mode: grid')).toBeInTheDocument();
    });
  });

  describe('Party Selection', () => {
    it('should not show batch actions when no parties selected', () => {
      render(<PartyListView />);
      expect(screen.queryByTestId('batch-actions')).not.toBeInTheDocument();
    });

    it('should show batch actions when parties are selected', () => {
      setupMocks({}, { selectedParties: ['party-1'], hasSelection: true });
      render(<PartyListView />);
      expect(screen.getByTestId('batch-actions')).toBeInTheDocument();
      expect(screen.getByText('Selected: 1')).toBeInTheDocument();
    });

    it('should handle clear selection', () => {
      const mockClearSelection = jest.fn();
      setupMocks({}, {
        selectedParties: ['party-1'],
        hasSelection: true,
        clearSelection: mockClearSelection
      });
      render(<PartyListView />);
      fireEvent.click(screen.getByText('Clear Selection'));
      expect(mockClearSelection).toHaveBeenCalled();
    });
  });

  describe('Create Party', () => {
    it('should handle create party action', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<PartyListView />);

      fireEvent.click(screen.getByText('Create Party'));
      expect(consoleSpy).toHaveBeenCalledWith('Create new party');

      consoleSpy.mockRestore();
    });
  });

  describe('Pagination', () => {
    it('should render pagination when available', () => {
      render(<PartyListView />);
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('Total: 10')).toBeInTheDocument();
    });

    it('should not render pagination when not available', () => {
      setupMocks({ pagination: null });
      render(<PartyListView />);
      expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
    });

    it('should handle page change', () => {
      const mockGoToPage = jest.fn();
      setupMocks({ goToPage: mockGoToPage });
      render(<PartyListView />);
      fireEvent.click(screen.getByText('Next'));
      expect(mockGoToPage).toHaveBeenCalledWith(2);
    });
  });

  describe('Party Display', () => {
    it('should display parties in content section', () => {
      render(<PartyListView />);
      expect(screen.getByTestId('party-party-1')).toBeInTheDocument();
      expect(screen.getByTestId('party-party-2')).toBeInTheDocument();
    });

    it('should handle empty party list', () => {
      setupMocks({ parties: [], pagination: null });
      render(<PartyListView />);
      expect(screen.getByTestId('content-section')).toBeInTheDocument();
      expect(screen.queryByTestId('party-party-1')).not.toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should pass correct props to ControlsSection', () => {
      render(<PartyListView />);

      expect(screen.getByTestId('controls-section')).toBeInTheDocument();
      expect(screen.getByText('Create Party')).toBeInTheDocument();
    });

    it('should pass correct props to ContentSection', () => {
      render(<PartyListView />);

      expect(screen.getByTestId('content-section')).toBeInTheDocument();
      expect(screen.getByText('View mode: grid')).toBeInTheDocument();
    });
  });
});