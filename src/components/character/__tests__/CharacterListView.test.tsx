import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterListView } from '../CharacterListView';
import { CharacterServiceClient } from '@/lib/services/CharacterServiceClient';
import { containsTextIgnoreCase } from '../../../test-utils/secure-regexp';
import {
  mockCharacters,
  createMockPaginatedResponse,
  createMockErrorResponse,
  waitForCharacterToLoad,
  expectCharacterToBeVisible,
  expectCharactersNotToBeVisible,
  renderCharacterListAndWait,
  testFilterOperation,
} from './test-helpers';

// Mock the CharacterServiceClient
jest.mock('@/lib/services/CharacterServiceClient');
const mockCharacterService = CharacterServiceClient as jest.Mocked<typeof CharacterServiceClient>;

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('CharacterListView', () => {
  const defaultProps = {
    userId: 'user1',
    onCharacterSelect: jest.fn(),
    onCharacterEdit: jest.fn(),
    onCharacterDelete: jest.fn(),
    onCharacterDuplicate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCharacterService.getCharactersByOwner.mockResolvedValue(
      createMockPaginatedResponse()
    );
  });

  describe('Component Rendering', () => {
    it('should render character list view with loading state initially', () => {
      render(<CharacterListView {...defaultProps} />);
      expect(screen.getByText(/loading characters/i)).toBeInTheDocument();
    });

    it('should render character list after data loads', async () => {
      render(<CharacterListView {...defaultProps} />);
      await waitForCharacterToLoad('Aragorn');
      expectCharacterToBeVisible('Legolas');
      expectCharacterToBeVisible('Gimli');
    });

    it('should display character essential information in cards', async () => {
      render(<CharacterListView {...defaultProps} />);
      await waitForCharacterToLoad();

      expect(screen.getByText('Level 5')).toBeInTheDocument();
      expect(screen.getByText('Human Ranger')).toBeInTheDocument();
      expect(screen.getByText('AC 16')).toBeInTheDocument();
      expect(screen.getByText('HP 45/45')).toBeInTheDocument();
    });
  });

  describe('View Options', () => {
    it('should toggle between grid and table view', async () => {
      render(<CharacterListView {...defaultProps} />);
      await waitForCharacterToLoad();

      const tableViewButton = screen.getByRole('button', { name: /table view/i });
      const gridViewButton = screen.getByRole('button', { name: /grid view/i });

      expect(tableViewButton).toBeInTheDocument();
      expect(gridViewButton).toBeInTheDocument();

      fireEvent.click(tableViewButton);

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Level')).toBeInTheDocument();
        expect(screen.getByText('Class')).toBeInTheDocument();
        expect(screen.getByText('Race')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should render search input', async () => {
      await renderCharacterListAndWait(defaultProps);
      const searchInput = screen.getByPlaceholderText(/search characters/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should filter characters by search term', async () => {
      const user = userEvent.setup();
      render(<CharacterListView {...defaultProps} />);
      await waitForCharacterToLoad();

      const searchInput = screen.getByPlaceholderText(/search characters/i);
      await user.type(searchInput, 'Aragorn');

      await waitFor(() => {
        expectCharacterToBeVisible('Aragorn');
        expectCharactersNotToBeVisible(['Legolas', 'Gimli']);
      });
    });

    it('should filter characters by class', async () => {
      await testFilterOperation(
        defaultProps,
        'filter by class',
        'ranger',
        ['Aragorn', 'Legolas'],
        ['Gimli']
      );
    });

    it('should filter characters by race', async () => {
      await testFilterOperation(
        defaultProps,
        'filter by race',
        'human',
        ['Aragorn'],
        ['Legolas', 'Gimli']
      );
    });
  });

  describe('Sorting', () => {
    const testSorting = async (sortValue: string, expectedOrder: string[]) => {
      render(<CharacterListView {...defaultProps} />);
      await waitForCharacterToLoad();

      const sortSelect = screen.getByRole('combobox', { name: /sort by/i });
      fireEvent.change(sortSelect, { target: { value: sortValue } });

      const characterElements = screen.getAllByTestId(/character-name/i);
      expectedOrder.forEach((name, index) => {
        expect(characterElements[index]).toHaveTextContent(name);
      });
    };

    it('should sort characters by name ascending', async () => {
      await testSorting('name-asc', ['Aragorn', 'Gimli', 'Legolas']);
    });

    it('should sort characters by level descending', async () => {
      await testSorting('level-desc', ['Aragorn', 'Legolas', 'Gimli']);
    });

    it('should sort characters by date created', async () => {
      await testSorting('date-desc', ['Legolas', 'Gimli', 'Aragorn']);
    });
  });

  describe('Character Actions', () => {
    const testCharacterAction = async (actionName: string, callbackProp: string) => {
      render(<CharacterListView {...defaultProps} />);
      await waitForCharacterToLoad();

      const actionButtons = screen.getAllByRole('button', { name: (content) => containsTextIgnoreCase(content, actionName) });
      fireEvent.click(actionButtons[0]);

      expect(defaultProps[callbackProp as keyof typeof defaultProps]).toHaveBeenCalledWith(mockCharacters[0]);
    };

    it('should call onCharacterEdit when edit button is clicked', async () => {
      await testCharacterAction('edit', 'onCharacterEdit');
    });

    it('should call onCharacterDelete when delete button is clicked', async () => {
      await testCharacterAction('delete', 'onCharacterDelete');
    });

    it('should call onCharacterDuplicate when duplicate button is clicked', async () => {
      await testCharacterAction('duplicate', 'onCharacterDuplicate');
    });

    it('should call onCharacterSelect when character card is clicked', async () => {
      render(<CharacterListView {...defaultProps} />);
      await waitForCharacterToLoad();

      const characterCard = screen.getByTestId('character-card-char1');
      fireEvent.click(characterCard);

      expect(defaultProps.onCharacterSelect).toHaveBeenCalledWith(mockCharacters[0]);
    });
  });

  describe('Batch Operations', () => {
    it('should allow selecting multiple characters', async () => {
      render(<CharacterListView {...defaultProps} />);
      await waitForCharacterToLoad();

      const checkboxes = screen.getAllByRole('checkbox');

      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('should show batch action buttons when characters are selected', async () => {
      render(<CharacterListView {...defaultProps} />);
      await waitForCharacterToLoad();

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /duplicate selected/i })).toBeInTheDocument();
    });

    it('should select all characters when select all checkbox is clicked', async () => {
      render(<CharacterListView {...defaultProps} />);
      await waitForCharacterToLoad();

      const tableViewButton = screen.getByRole('button', { name: /table view/i });
      fireEvent.click(tableViewButton);

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
      fireEvent.click(selectAllCheckbox);

      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when character loading fails', async () => {
      mockCharacterService.getCharactersByOwner.mockResolvedValue(
        createMockErrorResponse('Failed to load characters')
      );

      render(<CharacterListView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load characters/i)).toBeInTheDocument();
      });
    });

    it('should display empty state when no characters exist', async () => {
      mockCharacterService.getCharactersByOwner.mockResolvedValue(
        createMockPaginatedResponse([], { total: 0, totalPages: 0 })
      );

      render(<CharacterListView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/no characters found/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create your first character/i })).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should handle pagination when there are multiple pages', async () => {
      mockCharacterService.getCharactersByOwner.mockResolvedValue(
        createMockPaginatedResponse(mockCharacters, {
          total: 25,
          totalPages: 3,
        })
      );

      render(<CharacterListView {...defaultProps} />);
      await waitForCharacterToLoad();

      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    });
  });
});