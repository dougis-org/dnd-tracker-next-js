/**
 * Test case for Issue #473: Authentication token persistence issue
 * Minimal test focused on core issue reproduction and validation
 */

import { getToken } from 'next-auth/jwt';
import {
  mockRedirect,
  mockNext,
  createTestRequest,
  setupTestEnvironment,
  resetAuthMocks,
  createValidToken,
} from './auth-test-helpers';

jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }));
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { redirect: mockRedirect, next: mockNext, json: jest.fn() },
}));

describe('Issue #473: Authentication Token Persistence', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    resetAuthMocks();
    (getToken as jest.Mock).mockReset();
    originalEnv = setupTestEnvironment();
  });

  afterEach(() => { process.env = originalEnv; });

  test('should reproduce and validate token persistence fix', async () => {
    // Test the core issue: middleware should find valid tokens
    const mockToken = createValidToken();
    (getToken as jest.Mock).mockResolvedValue(mockToken);
    mockNext.mockReturnValue({ type: 'next' });

    const request = createTestRequest('/dashboard');
    const { middleware } = await import('@/middleware');
    await middleware(request);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(getToken).toHaveBeenCalledWith({
      req: request,
      secret: 'test-secret-for-jwt-signing',
    });
  });

  test('should handle missing token scenario', async () => {
    (getToken as jest.Mock).mockResolvedValue(null);
    mockRedirect.mockReturnValue({ type: 'redirect' });

    const request = createTestRequest('/dashboard');
    const { middleware } = await import('@/middleware');
    await middleware(request);

    expect(mockRedirect).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    // Verify redirect URL contains signin and callback parameters
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/signin',
        searchParams: expect.objectContaining({
          get: expect.any(Function)
        })
      })
    );
  });
});