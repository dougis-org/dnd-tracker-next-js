import { GET, POST } from '../route';
import { auth } from '@/lib/auth';

// Mock the auth module
jest.mock('@/lib/auth');

// Mock the deployment monitor dependencies
jest.mock('@/lib/monitoring/deployment-monitor', () => ({
  DeploymentMonitor: jest.fn(),
  AlertConfig: {},
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/monitoring/deployment authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/monitoring/deployment');
      const response = await GET(request as any);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Authentication required');
    });

    it('returns 403 when user is not admin', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', role: 'user' }
      } as any);

      const request = new Request('http://localhost:3000/api/monitoring/deployment');
      const response = await GET(request as any);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Admin access required for monitoring endpoints');
    });
  });

  describe('POST', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/monitoring/deployment', {
        method: 'POST',
        body: JSON.stringify({ action: 'metric', data: {} }),
        headers: { 'Content-Type': 'application/json' }
      });
      const response = await POST(request as any);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Authentication required');
    });

    it('returns 403 when user is not admin', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', role: 'user' }
      } as any);

      const request = new Request('http://localhost:3000/api/monitoring/deployment', {
        method: 'POST',
        body: JSON.stringify({ action: 'metric', data: {} }),
        headers: { 'Content-Type': 'application/json' }
      });
      const response = await POST(request as any);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Admin access required for monitoring endpoints');
    });
  });
});