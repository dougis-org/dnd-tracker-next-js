import { Types } from 'mongoose';
import { PartyServiceCRUD } from '../PartyServiceCRUD';
import type { PartyCreate, PartyUpdate } from '@/lib/validations/party';

// Mock the Party model
jest.mock('@/lib/models/Party', () => ({
  Party: {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

import { Party } from '@/lib/models/Party';

describe('PartyServiceCRUD', () => {
  const userId = new Types.ObjectId().toString();
  const partyId = new Types.ObjectId().toString();
  const otherUserId = new Types.ObjectId().toString();

  const mockPartyData: PartyCreate = {
    name: 'Test Party',
    description: 'A test party for adventures',
    tags: ['test', 'adventure'],
    isPublic: false,
    sharedWith: [],
    settings: {
      allowJoining: false,
      requireApproval: true,
      maxMembers: 6,
    },
  };

  const createMockObjectId = (id: string) => ({
    toString: () => id,
    equals: (other: any) => other && other.toString() === id,
  });

  const mockParty = {
    _id: createMockObjectId(partyId),
    ownerId: createMockObjectId(userId),
    name: 'Test Party',
    description: 'A test party for adventures',
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
    save: jest.fn(),
    updateActivity: jest.fn(),
    toString: () => partyId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createParty', () => {
    it('should successfully create a party', async () => {
      (Party.create as jest.Mock).mockResolvedValue(mockParty);

      const result = await PartyServiceCRUD.createParty(userId, mockPartyData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe(mockPartyData.name);
      expect(Party.create).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const invalidData = { ...mockPartyData, name: '' };

      const result = await PartyServiceCRUD.createParty(userId, invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARTY_VALIDATION_ERROR');
    });

    it('should handle database errors', async () => {
      (Party.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await PartyServiceCRUD.createParty(userId, mockPartyData);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Failed to create party');
    });
  });

  describe('getPartyById', () => {
    it('should return party when user is owner', async () => {
      (Party.findById as jest.Mock).mockResolvedValue(mockParty);

      const result = await PartyServiceCRUD.getPartyById(partyId, userId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe(mockParty.name);
    });

    it('should return party when user has shared access', async () => {
      const sharedParty = {
        ...mockParty,
        ownerId: createMockObjectId(otherUserId),
        sharedWith: [createMockObjectId(userId)],
      };
      (Party.findById as jest.Mock).mockResolvedValue(sharedParty);

      const result = await PartyServiceCRUD.getPartyById(partyId, userId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return party when party is public', async () => {
      const publicParty = {
        ...mockParty,
        ownerId: createMockObjectId(otherUserId),
        isPublic: true,
        sharedWith: [],
      };
      (Party.findById as jest.Mock).mockResolvedValue(publicParty);

      const result = await PartyServiceCRUD.getPartyById(partyId, userId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should deny access when user has no permission', async () => {
      const privateParty = {
        ...mockParty,
        ownerId: createMockObjectId(otherUserId),
        isPublic: false,
        sharedWith: [],
      };
      (Party.findById as jest.Mock).mockResolvedValue(privateParty);

      const result = await PartyServiceCRUD.getPartyById(partyId, userId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARTY_ACCESS_DENIED');
    });

    it('should return not found error when party does not exist', async () => {
      (Party.findById as jest.Mock).mockResolvedValue(null);

      const result = await PartyServiceCRUD.getPartyById(partyId, userId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARTY_NOT_FOUND');
    });
  });

  describe('updateParty', () => {
    const updateData: PartyUpdate = {
      name: 'Updated Party Name',
      description: 'Updated description',
    };

    it('should successfully update party when user is owner', async () => {
      const updatedParty = { ...mockParty, ...updateData };
      (Party.findById as jest.Mock).mockResolvedValue(mockParty);
      mockParty.save = jest.fn().mockResolvedValue(updatedParty);

      const result = await PartyServiceCRUD.updateParty(partyId, userId, updateData);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(updateData.name);
      expect(mockParty.save).toHaveBeenCalled();
      expect(mockParty.updateActivity).toHaveBeenCalled();
    });

    it('should deny update when user is not owner', async () => {
      const otherUserParty = {
        ...mockParty,
        ownerId: createMockObjectId(otherUserId),
      };
      (Party.findById as jest.Mock).mockResolvedValue(otherUserParty);

      const result = await PartyServiceCRUD.updateParty(partyId, userId, updateData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARTY_OWNERSHIP_REQUIRED');
    });

    it('should return not found error when party does not exist', async () => {
      (Party.findById as jest.Mock).mockResolvedValue(null);

      const result = await PartyServiceCRUD.updateParty(partyId, userId, updateData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARTY_NOT_FOUND');
    });
  });

  describe('deleteParty', () => {
    it('should successfully delete party when user is owner', async () => {
      (Party.findById as jest.Mock).mockResolvedValue(mockParty);
      (Party.findByIdAndDelete as jest.Mock).mockResolvedValue(mockParty);

      const result = await PartyServiceCRUD.deleteParty(partyId, userId);

      expect(result.success).toBe(true);
      expect(Party.findByIdAndDelete).toHaveBeenCalledWith(partyId);
    });

    it('should deny deletion when user is not owner', async () => {
      const otherUserParty = {
        ...mockParty,
        ownerId: createMockObjectId(otherUserId),
      };
      (Party.findById as jest.Mock).mockResolvedValue(otherUserParty);

      const result = await PartyServiceCRUD.deleteParty(partyId, userId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARTY_OWNERSHIP_REQUIRED');
    });

    it('should return not found error when party does not exist', async () => {
      (Party.findById as jest.Mock).mockResolvedValue(null);

      const result = await PartyServiceCRUD.deleteParty(partyId, userId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARTY_NOT_FOUND');
    });
  });

  describe('validatePartyAccess', () => {
    it('should allow access for party owner', () => {
      const hasAccess = PartyServiceCRUD.validatePartyAccess(mockParty as any, userId);
      expect(hasAccess).toBe(true);
    });

    it('should allow access for shared users', () => {
      const sharedParty = {
        ...mockParty,
        ownerId: createMockObjectId(otherUserId),
        sharedWith: [createMockObjectId(userId)],
        isPublic: false,
      };
      const hasAccess = PartyServiceCRUD.validatePartyAccess(sharedParty as any, userId);
      expect(hasAccess).toBe(true);
    });

    it('should allow access for public parties', () => {
      const publicParty = {
        ...mockParty,
        ownerId: createMockObjectId(otherUserId),
        sharedWith: [],
        isPublic: true,
      };
      const hasAccess = PartyServiceCRUD.validatePartyAccess(publicParty as any, userId);
      expect(hasAccess).toBe(true);
    });

    it('should deny access for private parties without permission', () => {
      const privateParty = {
        ...mockParty,
        ownerId: createMockObjectId(otherUserId),
        sharedWith: [],
        isPublic: false,
      };
      const hasAccess = PartyServiceCRUD.validatePartyAccess(privateParty as any, userId);
      expect(hasAccess).toBe(false);
    });
  });

  describe('validatePartyOwnership', () => {
    it('should return true for party owner', () => {
      const isOwner = PartyServiceCRUD.validatePartyOwnership(mockParty as any, userId);
      expect(isOwner).toBe(true);
    });

    it('should return false for non-owner', () => {
      const otherUserParty = {
        ...mockParty,
        ownerId: createMockObjectId(otherUserId),
      };
      const isOwner = PartyServiceCRUD.validatePartyOwnership(otherUserParty as any, userId);
      expect(isOwner).toBe(false);
    });
  });
});