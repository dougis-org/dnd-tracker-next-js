<<<<<<< HEAD
import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { connectToDatabase, closeDatabaseConnection } from '@/lib/db';
import { TEST_USER_ID } from '@/lib/services/__tests__/test-utils';

// Minimal in-memory model mocks (isolated for this test file)
const users: any[] = [];
const parties: any[] = [];

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    deleteMany: async () => {
      users.length = 0;
    },
    create: async (data: any) => {
      const u = { _id: 'user1', ...data };
      users.push(u);
      return u;
    },
  },
}));

jest.mock('@/lib/models/Party', () => {
  function makeDoc(data: any) {
    const id = 'party' + (parties.length + 1);
    const now = new Date();
    const doc: any = {
      _id: { toString: () => id },
      ownerId:
        data.ownerId && data.ownerId.toString
          ? data.ownerId
          : { toString: () => String(data.ownerId) },
      name: data.name,
      description: data.description ?? '',
      tags: data.tags ?? [],
      isPublic: data.isPublic ?? false,
      sharedWith: data.sharedWith ?? [],
      settings: data.settings ?? {},
      createdAt: now,
      updatedAt: now,
      lastActivity: now,
      save: async () => doc,
      updateActivity: () => {
        doc.lastActivity = new Date();
      },
    };
    return doc;
  }

  const api = {
    deleteMany: async () => {
      parties.length = 0;
    },
    create: async (data: any) => {
      const p = makeDoc(data);
      parties.push(p);
      return p;
    },
    countDocuments: async () => parties.length,
    find: (_query: any = {}) => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () =>
              parties.map(p => ({
                _id: p._id.toString(),
                ownerId: p.ownerId.toString(),
                name: p.name,
                description: p.description,
                tags: p.tags,
                isPublic: p.isPublic,
                sharedWith: p.sharedWith.map((u: any) => u.toString()),
                settings: p.settings,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                lastActivity: p.lastActivity,
              })),
          }),
        }),
      }),
    }),
    findById: async (id: string) =>
      parties.find(p => p._id.toString() === id) || null,
  };

  return {
    __esModule: true,
    default: api,
    Party: api,
  };
});

// Import route handlers after mocks
const { GET, POST } = require('@/app/api/parties/route');

// Mock Clerk's auth function
jest.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: TEST_USER_ID }),
}));

=======
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

>>>>>>> origin/main
describe('/api/parties integration tests', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  beforeEach(async () => {
<<<<<<< HEAD
    const User = require('@/lib/models/User').default;
    const Party = require('@/lib/models/Party').default;
=======
>>>>>>> origin/main
    await User.deleteMany({});
    await Party.deleteMany({});
    await User.create({ clerkId: TEST_USER_ID, email: 'test@example.com' });
  });

  describe('POST /api/parties', () => {
    it('should create a new party successfully', async () => {
      const { req } = createMocks({
        method: 'POST',
<<<<<<< HEAD
        json: () =>
          Promise.resolve({
            name: 'The Fellowship',
            description: '',
            tags: [],
            isPublic: false,
            sharedWith: [],
            settings: {
              allowJoining: false,
              requireApproval: true,
              maxMembers: 6,
            },
          }),
=======
        json: () => Promise.resolve({ name: 'The Fellowship' }),
>>>>>>> origin/main
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
<<<<<<< HEAD
        url: 'http://localhost/api/parties',
=======
>>>>>>> origin/main
      });

      const response = await GET(req as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.parties).toEqual([]);
    });

    it('should return parties for the current user', async () => {
<<<<<<< HEAD
      const Party = require('@/lib/models/Party').default;
=======
>>>>>>> origin/main
      await Party.create({
        name: 'The Fellowship',
        ownerId: TEST_USER_ID,
        members: [],
      });

      const { req } = createMocks({
        method: 'GET',
<<<<<<< HEAD
        url: 'http://localhost/api/parties',
=======
>>>>>>> origin/main
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
