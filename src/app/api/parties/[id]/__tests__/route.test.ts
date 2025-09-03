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

function makeParty(data: any) {
  const now = new Date();
  return {
    _id: 'party' + (parties.length + 1),
    name: data.name,
    description: data.description ?? null,
    ownerId: {
      toString: () => data.ownerId,
      equals: (other: any) => other === data.ownerId,
    },
    members: data.members || [],
    sharedWith:
      data.sharedWith?.map((id: string) => ({
        toString: () => id,
        equals: (other: any) => other === id,
      })) || [],
    tags: data.tags || [],
    isPublic: data.isPublic || false,
    settings: data.settings || {},
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

// Import route handlers after mocks
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GET, PUT, DELETE } = require('@/app/api/parties/[id]/route');

// Mock Clerk's auth function
jest.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: TEST_USER_ID }),
}));

// NOTE: Temporarily skipping this suite. See issue #727 to replace these mocked tests
// with real integration tests using a live (in-memory) MongoDB instance. The current
// mock-based approach reimplements model behavior and provides limited assurance.
// TODO(issue-727): Implement real integration tests and unskip.
describe.skip('/api/parties/[id] integration tests', () => {
  let testParty: any;
  beforeEach(async () => {
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
  });

import { TEST_USER_ID } from '@/lib/services/__tests__/test-utils';

// Minimal in-memory model mocks for this test file
const users: any[] = [];
const parties: any[] = [];


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

  function makeParty(data: any) {
    const now = new Date();
    return {
      _id: 'party' + (parties.length + 1),
      name: data.name,
      description: data.description ?? null,
      ownerId: {
        toString: () => data.ownerId,
        equals: (other: any) => other === data.ownerId,
      },
      members: data.members || [],
      sharedWith:
        data.sharedWith?.map((id: string) => ({
          toString: () => id,
          equals: (other: any) => other === id,
        })) || [],
      tags: data.tags || [],
      isPublic: data.isPublic || false,
      settings: data.settings || {},
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

  // Import route handlers after mocks
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GET, PUT, DELETE } = require('@/app/api/parties/[id]/route');

  // Mock Clerk's auth function
  jest.mock('@clerk/nextjs/server', () => ({
    auth: () => Promise.resolve({ userId: TEST_USER_ID }),
  }));

  // NOTE: Temporarily skipping this suite. See issue #727 to replace these mocked tests
  // with real integration tests using a live (in-memory) MongoDB instance. The current
  // mock-based approach reimplements model behavior and provides limited assurance.
  // TODO(issue-727): Implement real integration tests and unskip.
  describe.skip('/api/parties/[id] integration tests', () => {
    let testParty: any;
    beforeEach(async () => {
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
