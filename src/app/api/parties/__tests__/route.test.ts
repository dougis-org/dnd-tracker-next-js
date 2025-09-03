import { GET, POST } from '@/app/api/parties/route';
import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { connectToDatabase, closeDatabaseConnection } from '@/lib/db';
import User from '@/lib/models/User';
import Party from '@/lib/models/Party';
import { TEST_USER_ID } from '@/lib/services/__tests__/test-utils';

// Mock Clerk's auth function
jest.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: TEST_USER_ID }),
}));

describe('/api/parties integration tests', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Party.deleteMany({});
    await User.create({ clerkId: TEST_USER_ID, email: 'test@example.com' });
  });

  describe('POST /api/parties', () => {
    it('should create a new party successfully', async () => {
      const { req } = createMocks({
        method: 'POST',
        json: () => Promise.resolve({ name: 'The Fellowship' }),
      });

      const response = await POST(req as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.party.name).toBe('The Fellowship');
    });
  });

  describe('GET /api/parties', () => {
    it('should return an empty array when no parties exist', async () => {
      const { req } = createMocks({
        method: 'GET',
      });

      const response = await GET(req as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.parties).toEqual([]);
    });

    it('should return parties for the current user', async () => {
      await Party.create({
        name: 'The Fellowship',
        ownerId: TEST_USER_ID,
        members: [],
      });

      const { req } = createMocks({
        method: 'GET',
      });

      const response = await GET(req as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.parties.length).toBe(1);
      expect(data.parties[0].name).toBe('The Fellowship');
    });
  });
});
