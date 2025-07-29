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
});

const createRequest = (pathname: string) => ({
  nextUrl: { pathname },
  url: `http://localhost:3000${pathname}`,
} as NextRequest);

describe('Middleware', () => {
  it('protects dashboard routes', async () => {
    const { middleware } = await import('../middleware');
    const request = createRequest('/dashboard');
    (getToken as jest.Mock).mockResolvedValue(null);

    await middleware(request);

    expect(mockRedirect).toHaveBeenCalled();
  });

  it('allows authenticated users', async () => {
    const { middleware } = await import('../middleware');
    const request = createRequest('/dashboard');
    (getToken as jest.Mock).mockResolvedValue({ sub: '123' });

    await middleware(request);

    expect(mockNext).toHaveBeenCalled();
  });

  it('returns 401 for API routes', async () => {
    const { middleware } = await import('../middleware');
    const request = createRequest('/api/characters');
    (getToken as jest.Mock).mockResolvedValue(null);

    await middleware(request);

    expect(mockJson).toHaveBeenCalledWith(
      { error: 'Authentication required' },
      { status: 401 }
    );
  });

  it('allows public routes', async () => {
    const { middleware } = await import('../middleware');
    const request = createRequest('/');

    await middleware(request);

    expect(mockNext).toHaveBeenCalled();
    expect(getToken).not.toHaveBeenCalled();
  });
});