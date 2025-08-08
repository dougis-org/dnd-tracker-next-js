import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CombatPage from '../page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock the API fetch calls
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

const mockSession = {
  user: { id: 'user123', email: 'test@example.com' },
  expires: new Date().toISOString(),
};

describe('Issue #606: Functional Combat Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    });
    (fetch as jest.Mock).mockClear();
  });

  describe('Active Combat Sessions Display', () => {
    test('should display active combat sessions when encounters exist', async () => {
      // Mock API response with active combat sessions
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          encounters: [
            {
              _id: 'encounter1',
              name: 'Dragon Fight',
              combatState: {
                isActive: true,
                currentRound: 3,
                currentTurn: 2,
                initiativeOrder: [
                  { participantId: 'pc1', initiative: 18, isActive: true },
                  { participantId: 'dragon', initiative: 15, isActive: false },
                ]
              },
              participants: [
                { characterId: 'pc1', name: 'Aragorn', type: 'pc' },
                { characterId: 'dragon', name: 'Red Dragon', type: 'monster' }
              ]
            }
          ]
        })
      });

      render(<CombatPage />);

      // Should show loading state initially
      expect(screen.getByText('Loading active combat sessions...')).toBeInTheDocument();

      // Wait for API call and data to load
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/encounters?status=active&combat=true', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
      });

      // Should display the active combat session
      await waitFor(() => {
        expect(screen.getByText('Dragon Fight')).toBeInTheDocument();
        expect(screen.getByText('Round 3')).toBeInTheDocument();
        expect(screen.getByText('Active: Aragorn')).toBeInTheDocument();
      });
    });

    test('should display empty state when no active combat sessions exist', async () => {
      // Mock API response with no active encounters
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ encounters: [] })
      });

      render(<CombatPage />);

      await waitFor(() => {
        expect(screen.getByText('No active combat sessions')).toBeInTheDocument();
        expect(screen.getByText('Start a new encounter to begin combat tracking')).toBeInTheDocument();
      });
    });

    test('should handle API error gracefully', async () => {
      // Mock API error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(<CombatPage />);

      await waitFor(() => {
        expect(screen.getByText('Error loading combat sessions')).toBeInTheDocument();
        expect(screen.getByText('Unable to load active combat sessions. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Start New Combat Button Functionality', () => {
    test('should navigate to encounters when Start New Combat is clicked', async () => {
      // Mock empty combat sessions response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ encounters: [] })
      });

      render(<CombatPage />);

      await waitFor(() => {
        expect(screen.getByText('Start New Combat')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Start New Combat'));

      expect(mockRouter.push).toHaveBeenCalledWith('/encounters');
    });

    test('should show tooltip explaining Start New Combat functionality', async () => {
      // Mock empty combat sessions response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ encounters: [] })
      });

      render(<CombatPage />);

      await waitFor(() => {
        const button = screen.getByText('Start New Combat');
        expect(button).toHaveAttribute('title', 'Select an encounter to start combat');
      });
    });
  });

  describe('Combat Session Management', () => {
    test('should display combat session details correctly', async () => {
      const mockEncounter = {
        _id: 'encounter1',
        name: 'Goblin Ambush',
        combatState: {
          isActive: true,
          currentRound: 1,
          currentTurn: 0,
          initiativeOrder: [
            {
              participantId: 'pc1',
              initiative: 20,
              isActive: true,
              hasActed: false
            },
            {
              participantId: 'goblin1',
              initiative: 12,
              isActive: false,
              hasActed: false
            }
          ]
        },
        participants: [
          {
            characterId: 'pc1',
            name: 'Legolas',
            type: 'pc',
            currentHitPoints: 45,
            maxHitPoints: 45,
            armorClass: 16
          },
          {
            characterId: 'goblin1',
            name: 'Goblin Warrior',
            type: 'monster',
            currentHitPoints: 7,
            maxHitPoints: 7,
            armorClass: 15
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ encounters: [mockEncounter] })
      });

      render(<CombatPage />);

      await waitFor(() => {
        expect(screen.getByText('Goblin Ambush')).toBeInTheDocument();
        expect(screen.getByText('Round 1')).toBeInTheDocument();
        expect(screen.getByText('Participants: 2')).toBeInTheDocument();
      });
    });

    test('should show initiative order correctly', async () => {
      const mockEncounter = {
        _id: 'encounter1',
        name: 'Test Combat',
        combatState: {
          isActive: true,
          currentRound: 2,
          currentTurn: 1,
          initiativeOrder: [
            { participantId: 'pc1', initiative: 18, isActive: false, hasActed: true },
            { participantId: 'pc2', initiative: 16, isActive: true, hasActed: false },
            { participantId: 'orc1', initiative: 14, isActive: false, hasActed: false }
          ]
        },
        participants: [
          { characterId: 'pc1', name: 'Fighter', type: 'pc' },
          { characterId: 'pc2', name: 'Wizard', type: 'pc' },
          { characterId: 'orc1', name: 'Orc Berserker', type: 'monster' }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ encounters: [mockEncounter] })
      });

      render(<CombatPage />);

      await waitFor(() => {
        expect(screen.getByText('Active: Wizard')).toBeInTheDocument();
        expect(screen.getByText('Round 2')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication States', () => {
    test('should show login message when not authenticated', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated'
      });

      render(<CombatPage />);

      expect(screen.getByText('Please log in to access combat tracking')).toBeInTheDocument();
    });

    test('should show loading when session is loading', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading'
      });

      render(<CombatPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Refresh and Real-time Features', () => {
    test('should have refresh button to reload combat sessions', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ encounters: [] })
      });

      render(<CombatPage />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Refresh'));

      // Should make another API call
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});