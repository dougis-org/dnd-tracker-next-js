import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardStats } from '../use-dashboard-stats';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('useDashboardStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses for each API endpoint
    mockFetch.mockImplementation((url: string | URL | Request) => {
      const urlString = url.toString();

      if (urlString.includes('/api/characters')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              items: Array.from({ length: 3 }, (_, i) => ({ id: `char-${i}`, name: `Character ${i}` })),
              pagination: { totalItems: 3 }
            }
          })
        } as Response);
      }

      if (urlString.includes('/api/encounters')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              encounters: Array.from({ length: 5 }, (_, i) => ({ id: `enc-${i}`, name: `Encounter ${i}` })),
              totalItems: 5
            }
          })
        } as Response);
      }

      if (urlString.includes('/api/parties')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              parties: Array.from({ length: 2 }, (_, i) => ({ id: `party-${i}`, name: `Party ${i}` })),
              totalItems: 2
            }
          })
        } as Response);
      }

      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('should return initial loading state', () => {
    const { result } = renderHook(() => useDashboardStats());

    expect(result.current.stats).toEqual({
      characters: 0,
      encounters: 0,
      parties: 0,
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should fetch and return correct statistics', async () => {
    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      characters: 3,
      encounters: 5,
      parties: 2,
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      characters: 0,
      encounters: 0,
      parties: 0,
    });
    expect(result.current.error).toBe('Failed to load dashboard statistics');
  });

  it('should handle partial API failures', async () => {
    mockFetch.mockImplementation((url: string | URL | Request) => {
      const urlString = url.toString();

      if (urlString.includes('/api/characters')) {
        return Promise.reject(new Error('Characters API failed'));
      }

      if (urlString.includes('/api/encounters')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { encounters: [], totalItems: 5 }
          })
        } as Response);
      }

      if (urlString.includes('/api/parties')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { parties: [], totalItems: 2 }
          })
        } as Response);
      }

      return Promise.reject(new Error('Unknown endpoint'));
    });

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      characters: 0, // Failed API returns 0
      encounters: 5, // Successful API returns count
      parties: 2,   // Successful API returns count
    });
    expect(result.current.error).toBeNull(); // Partial failures don't show error
  });

  it('should refetch data when refetch is called', async () => {
    const { result } = renderHook(() => useDashboardStats());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Update mock to return different data
    mockFetch.mockImplementation((url: string | URL | Request) => {
      const urlString = url.toString();

      if (urlString.includes('/api/characters')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              items: [],
              pagination: { totalItems: 7 }
            }
          })
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { totalItems: 0 }
        })
      } as Response);
    });

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.stats.characters).toBe(7);
    });
  });

  it('should call APIs with correct parameters', async () => {
    renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/characters?page=1&limit=1');
      expect(mockFetch).toHaveBeenCalledWith('/api/encounters?page=1&limit=1');
      expect(mockFetch).toHaveBeenCalledWith('/api/parties?page=1&limit=1');
    });
  });
});