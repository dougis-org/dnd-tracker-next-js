import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { TEST_USER_ID } from '@/lib/services/__tests__/test-utils';

// Minimal in-memory model mocks for this test file
const users: any[] = [];
const parties: any[] = [];

jest.mock('@/lib/models/User', () => {
  return {
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
  };
});

jest.mock('@/lib/models/Party', () => {
  return {
    __esModule: true,
    default: {
      deleteMany: async () => {
        parties.length = 0;
      },
      create: async (data: any) => {
        const p = makeParty(data);
        parties.push(p);
        return p;
      },
      findById: async (id: string) => {
        const p = parties.find(p => p._id === id);
        return p || null;
      },
      findByIdAndUpdate: async (id: string, update: any) => {
        const idx = parties.findIndex(p => p._id === id);
        if (idx !== -1) {
          Object.assign(parties[idx], update);
          parties[idx].updatedAt = new Date();
          return parties[idx];
        }
        return null;
      },
      findByIdAndDelete: async (id: string) => {
        const idx = parties.findIndex(p => p._id === id);
        if (idx !== -1) {
          const [removed] = parties.splice(idx, 1);
          return removed;
        }
        return null;
      },
    },
    Party: {
      create: async (data: any) => {
        const p = makeParty(data);
        parties.push(p);
        return p;
      },
    },
  };
});

import { createMockPartyData } from '@/lib/services/__tests__/test-utils';

function makeParty(data: any) {
  const now = new Date();
  const partyData = createMockPartyData({ ...data });
  const mongoose = require('mongoose');
  const ObjectId = mongoose.Types.ObjectId;
  return {
    _id: 'party' + (parties.length + 1),
    name: partyData.name,
    description: partyData.description,
    ownerId: new ObjectId(
      data.ownerId ?? partyData.ownerId ?? '507f1f77bcf86cd799439011'
    ),
    members: partyData.members ?? [],
    sharedWith:
      partyData.sharedWith?.map((id: string) => new ObjectId(id)) ?? [],
    tags: partyData.tags ?? [],
    isPublic: partyData.isPublic ?? false,
    settings: partyData.settings ?? {
      allowJoining: false,
      requireApproval: true,
      maxMembers: 6,
    },
    createdAt: now,
    updatedAt: now,
    lastActivity: now,
    updateActivity() {
      this.lastActivity = new Date();
    },
    save: async function () {
      this.updatedAt = new Date();
      return this;
    },
  };
}

// Mock Clerk's auth function
jest.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: TEST_USER_ID }),
}));

// NOTE: Temporarily skipping this suite. See issue #727 to replace these mocked tests
// with real integration tests using a live (in-memory) MongoDB instance. The current
// mock-based approach reimplements model behavior and provides limited assurance.
// TODO(issue-727): Implement real integration tests and unskip.
describe.skip('/api/parties/[id] integration tests (skipped, see https://github.com/dougis-org/dnd-tracker-next-js/issues/731)', () => {
  let testParty: any;
  let GET: any, PUT: any, DELETE: any;

  beforeAll(async () => {
    // Import route handlers after mocks
    ({ GET, PUT, DELETE } = await import('../route'));
  });

  beforeEach(async () => {
    parties.length = 0; // Ensure clean state
    const Party = require('@/lib/models/Party').default;
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

      if (response.status !== 200) {
        // Log error for debugging

        console.error('GET /api/parties/[id] error:', data);
      }
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

      if (response.status !== 200) {
        // Log error for debugging

        console.error('PUT /api/parties/[id] error:', data);
      }
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

      if (response.status !== 200) {
        // Log error for debugging

        console.error('DELETE /api/parties/[id] error:', data);
      }
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
