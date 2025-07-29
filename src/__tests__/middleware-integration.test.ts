/**
 * Middleware Integration Tests
 */

import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

const mockRedirect = jest.fn();
const mockNext = jest.fn();
const mockJson = jest.fn();

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    redirect: mockRedirect,
    next: mockNext,
    json: mockJson,
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (getToken as jest.Mock).mockReset();
});

const createTestRequest = (pathname: string): NextRequest => ({
  nextUrl: { pathname },
  url: `http://localhost:3000${pathname}`,
} as NextRequest);

describe('Middleware Integration', () => {
  it('should protect dashboard routes', async () => {
    const { middleware } = await import('../middleware');
    const request = createTestRequest('/dashboard');

    (getToken as jest.Mock).mockResolvedValue(null);
    mockRedirect.mockReturnValue({ type: 'redirect' });

    await middleware(request);

    expect(mockRedirect).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 for unauthenticated API requests', async () => {
    const { middleware } = await import('../middleware');
    const request = createTestRequest('/api/characters');

    (getToken as jest.Mock).mockResolvedValue(null);
    mockJson.mockReturnValue({ type: 'json', status: 401 });

    await middleware(request);

    expect(mockJson).toHaveBeenCalledWith(
      { error: 'Authentication required' },
      { status: 401 }
    );
  });

  it('should allow authenticated requests to proceed', async () => {
    const { middleware } = await import('../middleware');
    const request = createTestRequest('/api/characters');

    const validToken = {
      email: 'test@example.com',
      sub: '123',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    (getToken as jest.Mock).mockResolvedValue(validToken);
    mockNext.mockReturnValue({ type: 'next' });

    await middleware(request);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should allow public routes without authentication', async () => {
    const { middleware } = await import('../middleware');
    const request = createTestRequest('/');

    mockNext.mockReturnValue({ type: 'next' });

    await middleware(request);

    expect(mockNext).toHaveBeenCalled();
    expect(getToken).not.toHaveBeenCalled();
  });
});