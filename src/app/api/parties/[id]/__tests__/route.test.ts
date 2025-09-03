import { GET, PUT, DELETE } from '@/app/api/parties/[id]/route';
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

describe('/api/parties/[id] integration tests', () => {
  let testParty: any;

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
    testParty = await Party.create({
      name: 'The Fellowship',
      ownerId: TEST_USER_ID,
      members: [],
    });
  });

  describe('GET /api/parties/[id]', () => {
    it('should return a party by ID successfully', async () => {
      const { req } = createMocks({
        method: 'GET',
      });
      const context = { params: { id: testParty._id.toString() } };

      const response = await GET(req as unknown as NextRequest, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.party.name).toBe('The Fellowship');
    });
  });

  describe('PUT /api/parties/[id]', () => {
    it('should update a party successfully', async () => {
      const { req } = createMocks({
        method: 'PUT',
        json: () => Promise.resolve({ name: 'The Updated Fellowship' }),
      });
      const context = { params: { id: testParty._id.toString() } };

      const response = await PUT(req as unknown as NextRequest, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.party.name).toBe('The Updated Fellowship');
    });
  });

  describe('DELETE /api/parties/[id]', () => {
    it('should delete a party successfully', async () => {
      const { req } = createMocks({
        method: 'DELETE',
      });
      const context = { params: { id: testParty._id.toString() } };

      const response = await DELETE(req as unknown as NextRequest, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
