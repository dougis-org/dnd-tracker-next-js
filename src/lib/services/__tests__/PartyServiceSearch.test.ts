import { Types } from 'mongoose';
import { PartyServiceSearch } from '../PartyServiceSearch';
import type { PartyFilters, PaginationParams } from '@/lib/validations/party';

// Mock the Party model
jest.mock('@/lib/models/Party', () => ({
  Party: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
}));

import { Party } from '@/lib/models/Party';

describe('PartyServiceSearch', () => {
  const userId = new Types.ObjectId().toString();

  const mockParty = {
    _id: new Types.ObjectId(),
    ownerId: new Types.ObjectId(userId),
    name: 'Test Party',
    description: 'A test party',
    tags: ['test', 'adventure'],
    isPublic: false,
    sharedWith: [],
    settings: {
      allowJoining: false,
      requireApproval: true,
      maxMembers: 6,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivity: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPartiesForUser', () => {
    it('should return paginated parties for user', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockParty]),
      };

      (Party.find as jest.Mock).mockReturnValue(mockQuery);
      (Party.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await PartyServiceSearch.getPartiesForUser(userId);

      expect(result.success).toBe(true);
      expect(result.data?.parties).toHaveLength(1);
      expect(result.data?.pagination.totalItems).toBe(1);
      expect(result.data?.pagination.currentPage).toBe(1);
    });

    it('should apply search filters', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockParty]),
      };

      (Party.find as jest.Mock).mockReturnValue(mockQuery);
      (Party.countDocuments as jest.Mock).mockResolvedValue(1);

      const filters: PartyFilters = {
        search: 'test',
        tags: ['adventure'],
      };

      const result = await PartyServiceSearch.getPartiesForUser(userId, filters);

      expect(result.success).toBe(true);
      expect(Party.find).toHaveBeenCalled();
    });

    it('should apply pagination correctly', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockParty]),
      };

      (Party.find as jest.Mock).mockReturnValue(mockQuery);
      (Party.countDocuments as jest.Mock).mockResolvedValue(50);

      const pagination: PaginationParams = { page: 2, limit: 10 };

      const result = await PartyServiceSearch.getPartiesForUser(userId, {}, 'name', 'asc', pagination);

      expect(result.success).toBe(true);
      expect(mockQuery.skip).toHaveBeenCalledWith(10); // (page - 1) * limit
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result.data?.pagination.totalPages).toBe(5); // 50 / 10
    });

    it('should apply sorting correctly', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockParty]),
      };

      (Party.find as jest.Mock).mockReturnValue(mockQuery);
      (Party.countDocuments as jest.Mock).mockResolvedValue(1);

      await PartyServiceSearch.getPartiesForUser(userId, {}, 'lastActivity', 'desc');

      expect(mockQuery.sort).toHaveBeenCalledWith({ lastActivity: -1 });
    });

    it('should handle database errors', async () => {
      (Party.find as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await PartyServiceSearch.getPartiesForUser(userId);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Failed to search parties');
    });
  });

  describe('searchPublicParties', () => {
    it('should search public parties only', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ ...mockParty, isPublic: true }]),
      };

      (Party.find as jest.Mock).mockReturnValue(mockQuery);
      (Party.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await PartyServiceSearch.searchPublicParties('test');

      expect(result.success).toBe(true);
      expect(Party.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isPublic: true,
        })
      );
    });

    it('should handle search query for public parties', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (Party.find as jest.Mock).mockReturnValue(mockQuery);
      (Party.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await PartyServiceSearch.searchPublicParties('adventure');

      expect(result.success).toBe(true);
      expect(Party.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isPublic: true,
          $and: expect.any(Array),
        })
      );
    });
  });

  describe('getSuggestedTags', () => {
    it('should return suggested tags based on user parties', async () => {
      const mockAggregation = [
        { tag: 'adventure' },
        { tag: 'combat' },
        { tag: 'roleplay' },
      ];

      (Party.aggregate as jest.Mock).mockResolvedValue(mockAggregation);

      const result = await PartyServiceSearch.getSuggestedTags(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(['adventure', 'combat', 'roleplay']);
      expect(Party.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              $or: expect.any(Array),
            }),
          }),
        ])
      );
    });

    it('should handle empty tag results', async () => {
      (Party.aggregate as jest.Mock).mockResolvedValue([]);

      const result = await PartyServiceSearch.getSuggestedTags(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getPartyStats', () => {
    it('should return comprehensive party statistics', async () => {
      // Mock the Promise.all results
      (Party.countDocuments as jest.Mock)
        .mockResolvedValueOnce(10) // totalParties
        .mockResolvedValueOnce(5)  // ownedParties
        .mockResolvedValueOnce(3)  // sharedParties
        .mockResolvedValueOnce(2)  // publicParties
        .mockResolvedValueOnce(1); // recentActivity

      const result = await PartyServiceSearch.getPartyStats(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalParties: 10,
        ownedParties: 5,
        sharedParties: 3,
        publicParties: 2,
        recentActivity: 1,
      });
      expect(Party.countDocuments).toHaveBeenCalledTimes(5);
    });

    it('should handle database errors in stats', async () => {
      (Party.countDocuments as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await PartyServiceSearch.getPartyStats(userId);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Failed to get party statistics');
    });
  });

  describe('private methods through public interface', () => {
    it('should handle different sort options', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockParty]),
      };

      (Party.find as jest.Mock).mockReturnValue(mockQuery);
      (Party.countDocuments as jest.Mock).mockResolvedValue(1);

      // Test different sort options
      const sortOptions = [
        ['name', 'asc', { name: 1 }],
        ['createdAt', 'desc', { createdAt: -1 }],
        ['updatedAt', 'asc', { updatedAt: 1 }],
        ['lastActivity', 'desc', { lastActivity: -1 }],
      ] as const;

      for (const [sortBy, sortOrder, expectedSort] of sortOptions) {
        jest.clearAllMocks();
        await PartyServiceSearch.getPartiesForUser(userId, {}, sortBy, sortOrder);
        expect(mockQuery.sort).toHaveBeenCalledWith(expectedSort);
      }
    });

    it('should handle virtual field sorts with fallback', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockParty]),
      };

      (Party.find as jest.Mock).mockReturnValue(mockQuery);
      (Party.countDocuments as jest.Mock).mockResolvedValue(1);

      // Test virtual field sorts (should fallback to createdAt)
      const virtualSorts = ['memberCount', 'playerCharacterCount', 'averageLevel'] as const;

      for (const sortBy of virtualSorts) {
        jest.clearAllMocks();
        await PartyServiceSearch.getPartiesForUser(userId, {}, sortBy, 'desc');
        expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      }
    });
  });
});