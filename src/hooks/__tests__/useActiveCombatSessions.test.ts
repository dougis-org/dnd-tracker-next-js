import { renderHook, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useActiveCombatSessions } from '../useActiveCombatSessions';

// Mock fetch globally
global.fetch = jest.fn();

// Mock useSession
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe('useActiveCombatSessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      status: 'authenticated',
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Initial state', () => {
    test('should initialize with loading state', () => {
      const { result } = renderHook(() => useActiveCombatSessions());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.encounters).toEqual([]);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('Successful API calls', () => {
    test('should fetch and return active combat sessions', async () => {
      const mockEncounters = [
        {
          _id: 'encounter1',
          name: 'Dragon Fight',
          combatState: {
            isActive: true,
            currentRound: 3,
            currentTurn: 2,
            initiativeOrder: [
              { participantId: 'pc1', initiative: 18, isActive: true, hasActed: false },
              { participantId: 'dragon', initiative: 15, isActive: false, hasActed: false },
            ],
          },
          participants: [
            { characterId: 'pc1', name: 'Aragorn', type: 'pc' },
            { characterId: 'dragon', name: 'Red Dragon', type: 'monster' },
          ],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ encounters: mockEncounters }),
      } as Response);

      const { result } = renderHook(() => useActiveCombatSessions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.encounters).toEqual(mockEncounters);
      expect(result.current.error).toBe(null);
      expect(mockFetch).toHaveBeenCalledWith('/api/encounters?status=active&combat=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    test('should handle empty encounters response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ encounters: [] }),
      } as Response);

      const { result } = renderHook(() => useActiveCombatSessions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.encounters).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    test('should handle response without encounters field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const { result } = renderHook(() => useActiveCombatSessions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.encounters).toEqual([]);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Error handling', () => {
    test('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useActiveCombatSessions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.encounters).toEqual([]);
      expect(result.current.error).toBe('HTTP error! status: 500');
    });

    test('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useActiveCombatSessions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.encounters).toEqual([]);
      expect(result.current.error).toBe('Network error');
    });

    test('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      const { result } = renderHook(() => useActiveCombatSessions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.encounters).toEqual([]);
      expect(result.current.error).toBe('Invalid JSON');
    });

    test('should handle non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useActiveCombatSessions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.encounters).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch combat sessions');
    });
  });

  describe('Authentication states', () => {
    test('should not fetch data when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      });

      renderHook(() => useActiveCombatSessions());

      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should set loading to false when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const { result } = renderHook(() => useActiveCombatSessions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should not fetch data when user ID is missing', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { email: 'test@example.com' } }, // Missing id
        status: 'authenticated',
      });

      const { result } = renderHook(() => useActiveCombatSessions());

      // Wait for the effect to complete - should set loading to false
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 3000 });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Refetch functionality', () => {
    test('should refetch data when refetch is called', async () => {
      const mockEncounters = [
        {
          _id: 'encounter1',
          name: 'Test Combat',
          combatState: {
            isActive: true,
            currentRound: 1,
            currentTurn: 0,
            initiativeOrder: [],
          },
          participants: [],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ encounters: mockEncounters }),
      } as Response);

      const { result } = renderHook(() => useActiveCombatSessions());

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Call refetch
      result.current.refetch();

      // Wait for refetch to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      expect(result.current.encounters).toEqual(mockEncounters);
    });

    test('should handle refetch errors', async () => {
      // Initial successful fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ encounters: [] }),
      } as Response);

      const { result } = renderHook(() => useActiveCombatSessions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock error on refetch
      mockFetch.mockRejectedValueOnce(new Error('Refetch error'));

      result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBe('Refetch error');
      });

      expect(result.current.encounters).toEqual([]);
    });
  });

  describe('Session changes', () => {
    test('should refetch when session changes from unauthenticated to authenticated', async () => {
      // Start with unauthenticated
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const { result, rerender } = renderHook(() => useActiveCombatSessions());

      expect(mockFetch).not.toHaveBeenCalled();

      // Mock successful fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ encounters: [] }),
      } as Response);

      // Change to authenticated
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        status: 'authenticated',
      });

      rerender();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Console logging', () => {
    test('should log errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      renderHook(() => useActiveCombatSessions());

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching active combat sessions:',
          networkError
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });
});