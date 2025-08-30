import { GET, POST } from '../route';
import * as clerkServer from '@clerk/nextjs/server';

// Mock Clerk's auth function
jest.mock('@clerk/nextjs/server', () => ({
  ...jest.requireActual('@clerk/nextjs/server'),
  auth: jest.fn(),
}));

// Mock the deployment monitor dependencies
jest.mock('@/lib/monitoring/deployment-monitor', () => ({
  DeploymentMonitor: jest.fn(),
  AlertConfig: {},
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

const mockAuth = clerkServer.auth as jest.MockedFunction<
  typeof clerkServer.auth
>;

describe('/api/monitoring/deployment authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockReset();
  });

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: undefined } as any);

      const request = new Request(
        'http://localhost:3000/api/monitoring/deployment'
      );
      const response = await GET(request as any);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Authentication required');
    });

    it('returns 403 when user is not admin', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        publicMetadata: { role: 'user' },
      } as any);

      const request = new Request(
        'http://localhost:3000/api/monitoring/deployment'
      );
      const response = await GET(request as any);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Admin access required for monitoring endpoints');
    });
  });

  describe('POST', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: undefined } as any);

      const request = new Request(
        'http://localhost:3000/api/monitoring/deployment',
        {
          method: 'POST',
          body: JSON.stringify({ action: 'metric', data: {} }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request as any);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Authentication required');
    });

    it('returns 403 when user is not admin', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        publicMetadata: { role: 'user' },
      } as any);

      const request = new Request(
        'http://localhost:3000/api/monitoring/deployment',
        {
          method: 'POST',
          body: JSON.stringify({ action: 'metric', data: {} }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const response = await POST(request as any);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Admin access required for monitoring endpoints');
    });
  });
});
