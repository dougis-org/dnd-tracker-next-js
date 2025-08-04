import {
  type PartyCreate,
  type PartyUpdate,
  type PartyFilters,
  type PartySortBy,
  type SortOrder,
  type PaginationParams,
  type PartyListItem,
  type PaginationInfo,
} from '@/lib/validations/party';

import { ServiceResult } from './PartyServiceErrors';
import { PartyServiceCRUD } from './PartyServiceCRUD';
import { PartyServiceSearch } from './PartyServiceSearch';

/**
 * Party Service Layer for D&D Encounter Tracker
 *
 * Provides comprehensive business logic for party management including
 * CRUD operations, search functionality, and data access control.
 *
 * This class acts as a coordination layer, delegating operations
 * to specialized modules for better organization and maintainability.
 *
 * Architecture follows the established UserService pattern with:
 * - Main service class as facade/coordinator
 * - Specialized modules for different concerns
 * - Consistent error handling and validation
 * - Comprehensive access control
 */
export class PartyService {
  // ================================
  // CRUD Operations
  // ================================

  /**
   * Create a new party
   */
  static async createParty(
    ownerId: string,
    partyData: PartyCreate
  ): Promise<ServiceResult<PartyListItem>> {
    return PartyServiceCRUD.createParty(ownerId, partyData);
  }

  /**
   * Get party by ID with access control
   */
  static async getPartyById(
    partyId: string,
    userId: string
  ): Promise<ServiceResult<PartyListItem>> {
    return PartyServiceCRUD.getPartyById(partyId, userId);
  }

  /**
   * Update party (owner only)
   */
  static async updateParty(
    partyId: string,
    userId: string,
    updateData: PartyUpdate
  ): Promise<ServiceResult<PartyListItem>> {
    return PartyServiceCRUD.updateParty(partyId, userId, updateData);
  }

  /**
   * Delete party (owner only)
   */
  static async deleteParty(
    partyId: string,
    userId: string
  ): Promise<ServiceResult<void>> {
    return PartyServiceCRUD.deleteParty(partyId, userId);
  }

  // ================================
  // Search and Filtering Operations
  // ================================

  /**
   * Get paginated list of parties for a user with filtering and sorting
   */
  static async getPartiesForUser(
    userId: string,
    filters: PartyFilters = { tags: [], memberCount: [] },
    sortBy: PartySortBy = 'name',
    sortOrder: SortOrder = 'asc',
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<ServiceResult<{ parties: PartyListItem[]; pagination: PaginationInfo }>> {
    return PartyServiceSearch.getPartiesForUser(userId, filters, sortBy, sortOrder, pagination);
  }

  /**
   * Search public parties (for discovery)
   */
  static async searchPublicParties(
    searchQuery?: string,
    sortBy: PartySortBy = 'name',
    sortOrder: SortOrder = 'asc',
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<ServiceResult<{ parties: PartyListItem[]; pagination: PaginationInfo }>> {
    return PartyServiceSearch.searchPublicParties(searchQuery, sortBy, sortOrder, pagination);
  }

  /**
   * Get suggested tags based on user's parties
   */
  static async getSuggestedTags(userId: string): Promise<ServiceResult<string[]>> {
    return PartyServiceSearch.getSuggestedTags(userId);
  }

  /**
   * Get party statistics for a user
   */
  static async getPartyStats(userId: string): Promise<ServiceResult<{
    totalParties: number;
    ownedParties: number;
    sharedParties: number;
    publicParties: number;
    recentActivity: number;
  }>> {
    return PartyServiceSearch.getPartyStats(userId);
  }

  // ================================
  // Utility Methods
  // ================================

  /**
   * Validate if user has access to a party
   */
  static validatePartyAccess(party: any, userId: string): boolean {
    return PartyServiceCRUD.validatePartyAccess(party, userId);
  }

  /**
   * Validate if user owns a party
   */
  static validatePartyOwnership(party: any, userId: string): boolean {
    return PartyServiceCRUD.validatePartyOwnership(party, userId);
  }
}