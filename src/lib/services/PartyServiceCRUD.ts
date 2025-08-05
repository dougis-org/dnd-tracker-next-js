import { Types } from 'mongoose';
import { Party, type IParty } from '@/lib/models/Party';
import {
  ServiceResult,
  PartyNotFoundError,
  PartyAccessDeniedError,
  PartyOwnershipError,
  PartyValidationError,
  handleServiceError,
} from './PartyServiceErrors';
import {
  partyCreateSchema,
  partyUpdateSchema,
  type PartyCreate,
  type PartyUpdate,
  type PartyListItem,
} from '@/lib/validations/party';

/**
 * CRUD operations for party management
 * Handles basic Create, Read, Update, Delete operations with proper access control
 */
export class PartyServiceCRUD {

  /**
   * Create a new party
   */
  static async createParty(ownerId: string, partyData: PartyCreate): Promise<ServiceResult<PartyListItem>> {
    try {
      // Validate party name is not empty before schema validation
      if (!partyData.name || !partyData.name.trim()) {
        throw new PartyValidationError('name', 'Party name cannot be empty');
      }

      // Validate input data
      const validatedData = partyCreateSchema.parse(partyData);

      // Create party with owner ID
      const party = await Party.create({
        ...validatedData,
        ownerId: new Types.ObjectId(ownerId),
      });

      // Convert to response format
      const partyResponse = await this.convertToPartyListItem(party);

      return {
        success: true,
        data: partyResponse,
      };
    } catch (error) {
      return handleServiceError(error, 'Failed to create party', 'PARTY_CREATE_ERROR');
    }
  }

  /**
   * Get party by ID with access control
   */
  static async getPartyById(partyId: string, userId: string): Promise<ServiceResult<PartyListItem>> {
    try {
      // Find party by ID
      const party = await Party.findById(partyId);

      if (!party) {
        throw new PartyNotFoundError(partyId);
      }

      // Check access permissions
      if (!this.validatePartyAccess(party, userId)) {
        throw new PartyAccessDeniedError(partyId, userId);
      }

      // Convert to response format
      const partyResponse = await this.convertToPartyListItem(party);

      return {
        success: true,
        data: partyResponse,
      };
    } catch (error) {
      return handleServiceError(error, 'Failed to get party', 'PARTY_GET_ERROR');
    }
  }

  /**
   * Update party (owner only)
   */
  static async updateParty(
    partyId: string,
    userId: string,
    updateData: PartyUpdate
  ): Promise<ServiceResult<PartyListItem>> {
    try {
      // Validate input data
      const validatedData = partyUpdateSchema.parse(updateData);

      // Find party by ID
      const party = await Party.findById(partyId);

      if (!party) {
        throw new PartyNotFoundError(partyId);
      }

      // Check ownership (only owner can update)
      if (!this.validatePartyOwnership(party, userId)) {
        throw new PartyOwnershipError('update this party');
      }

      // Validate party name if provided
      if (validatedData.name !== undefined && !validatedData.name.trim()) {
        throw new PartyValidationError('name', 'Party name cannot be empty');
      }

      // Apply updates
      Object.assign(party, validatedData);

      // Update activity timestamp
      party.updateActivity();

      // Save changes
      await party.save();

      // Convert to response format
      const partyResponse = await this.convertToPartyListItem(party);

      return {
        success: true,
        data: partyResponse,
      };
    } catch (error) {
      return handleServiceError(error, 'Failed to update party', 'PARTY_UPDATE_ERROR');
    }
  }

  /**
   * Delete party (owner only)
   */
  static async deleteParty(partyId: string, userId: string): Promise<ServiceResult<void>> {
    try {
      // Find party by ID
      const party = await Party.findById(partyId);

      if (!party) {
        throw new PartyNotFoundError(partyId);
      }

      // Check ownership (only owner can delete)
      if (!this.validatePartyOwnership(party, userId)) {
        throw new PartyOwnershipError('delete this party');
      }

      // Delete the party
      await Party.findByIdAndDelete(partyId);

      return {
        success: true,
      };
    } catch (error) {
      return handleServiceError(error, 'Failed to delete party', 'PARTY_DELETE_ERROR');
    }
  }

  /**
   * Validate if user has access to a party (read access)
   * Access is granted if:
   * - User is the owner
   * - Party is public
   * - User is in the sharedWith list
   */
  static validatePartyAccess(party: IParty, userId: string): boolean {
    const userObjectId = new Types.ObjectId(userId);

    // Owner always has access
    if (party.ownerId.equals(userObjectId)) {
      return true;
    }

    // Public parties are accessible to everyone
    if (party.isPublic) {
      return true;
    }

    // Check if user is in shared list
    return party.sharedWith.some(sharedUserId => sharedUserId.equals(userObjectId));
  }

  /**
   * Validate if user owns the party (write access)
   */
  static validatePartyOwnership(party: IParty, userId: string): boolean {
    const userObjectId = new Types.ObjectId(userId);
    return party.ownerId.equals(userObjectId);
  }

  /**
   * Convert Party document to PartyListItem format for frontend
   */
  private static async convertToPartyListItem(party: IParty): Promise<PartyListItem> {
    // For now, we'll use placeholder values for virtual fields
    // In a real implementation, these would be calculated from the Character collection
    const memberCount = 0; // Will be calculated when Character integration is complete
    const playerCharacterCount = 0; // Will be calculated when Character integration is complete
    const averageLevel = 0; // Will be calculated when Character integration is complete

    return {
      id: party._id.toString(),
      ownerId: party.ownerId.toString(),
      name: party.name,
      description: party.description,
      members: [], // Members will be populated separately if needed
      tags: party.tags,
      isPublic: party.isPublic,
      sharedWith: party.sharedWith.map(id => id.toString()),
      settings: party.settings,
      createdAt: party.createdAt,
      updatedAt: party.updatedAt,
      lastActivity: party.lastActivity,
      memberCount,
      playerCharacterCount,
      averageLevel,
    };
  }
}