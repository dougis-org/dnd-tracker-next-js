import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from '@clerk/nextjs';
import { useActiveCombatSessions } from '../useActiveCombatSessions';

// Mock fetch globally
global.fetch = jest.fn();

// Mock useUser
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
}));

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

// Test helpers
const createMockEncounter = (overrides = {}) => ({
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
  ...overrides,
});

const setupMockUser = (userData = null, isLoaded = true, isSignedIn = true) => {
  mockUseUser.mockReturnValue({
    user: userData || (isSignedIn ? {
      id: 'user123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User'
    } : null),
    isLoaded,
    isSignedIn,
  });
};

const setupMockResponse = (data, ok = true) => {
  const status = ok ? 200 : (data?.status || 500);
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
  } as Response);
};

describe('useActiveCombatSessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockUser();
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
      const mockEncounters = [createMockEncounter()];
      setupMockResponse({ encounters: mockEncounters });

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
      setupMockResponse({ encounters: [] });

      const { result } = renderHook(() => useActiveCombatSessions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.encounters).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    test('should handle response without encounters field', async () => {
      setupMockResponse({});

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
      setupMockUser(null, false, false);
      renderHook(() => useActiveCombatSessions());
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should set loading to false when unauthenticated', async () => {
      setupMockUser(null, true, false);

      const { result } = renderHook(() => useActiveCombatSessions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should not fetch data when user ID is missing', async () => {
      setupMockUser({ emailAddresses: [{ emailAddress: 'test@example.com' }] }); // Missing id

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
      const mockEncounters = [createMockEncounter({
        name: 'Test Combat',
        combatState: { ...createMockEncounter().combatState, currentRound: 1, currentTurn: 0, initiativeOrder: [] },
        participants: []
      })];

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
      setupMockResponse({ encounters: [] });

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
      setupMockUser(null, true, false);
      const { rerender } = renderHook(() => useActiveCombatSessions());
      expect(mockFetch).not.toHaveBeenCalled();

      // Mock successful fetch and change to authenticated
      setupMockResponse({ encounters: [] });
      setupMockUser();

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