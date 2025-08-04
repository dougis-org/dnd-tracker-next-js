import { Types } from 'mongoose';
import { Party, type IParty } from '@/lib/models/Party';
import {
  ServiceResult,
  PartyServiceError,
  handleServiceError,
} from './PartyServiceErrors';
import type {
  PartyFilters,
  PartySortBy,
  SortOrder,
  PaginationParams,
  PartyListItem,
  PaginationInfo,
} from '@/lib/validations/party';

/**
 * Search and filtering operations for party management
 * Handles complex queries, filtering, sorting, and pagination
 */
export class PartyServiceSearch {
  /**
   * Get paginated list of parties for a user with filtering and sorting
   */
  static async getPartiesForUser(
    userId: string,
    filters: PartyFilters = {},
    sortBy: PartySortBy = 'name',
    sortOrder: SortOrder = 'asc',
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<ServiceResult<{ parties: PartyListItem[]; pagination: PaginationInfo }>> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Build the base query for user access
      const baseQuery = this.buildUserAccessQuery(userObjectId, filters);

      // Build search query if provided
      const searchQuery = this.buildSearchQuery(baseQuery, filters.search);

      // Build filter query
      const filterQuery = this.buildFilterQuery(searchQuery, filters);

      // Execute count query for pagination
      const totalCount = await Party.countDocuments(filterQuery);

      // Calculate pagination
      const { skip, limit } = this.calculatePagination(pagination);
      const totalPages = Math.ceil(totalCount / limit);

      // Build sort query
      const sortQuery = this.buildSortQuery(sortBy, sortOrder);

      // Execute the main query with sorting and pagination
      const parties = await Party.find(filterQuery)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean();

      // Convert to response format
      const partyList = await Promise.all(
        parties.map(party => this.convertToPartyListItem(party))
      );

      const paginationInfo: PaginationInfo = {
        currentPage: pagination.page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
      };

      return {
        success: true,
        data: {
          parties: partyList,
          pagination: paginationInfo,
        },
      };
    } catch (error) {
      return handleServiceError(error, 'Failed to search parties', 'PARTY_SEARCH_ERROR');
    }
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
    try {
      // Base query for public parties
      let query: any = { isPublic: true };

      // Add search if provided
      if (searchQuery && searchQuery.trim()) {
        query = this.buildSearchQuery(query, searchQuery);
      }

      // Execute count query for pagination
      const totalCount = await Party.countDocuments(query);

      // Calculate pagination
      const { skip, limit } = this.calculatePagination(pagination);
      const totalPages = Math.ceil(totalCount / limit);

      // Build sort query
      const sortQuery = this.buildSortQuery(sortBy, sortOrder);

      // Execute the main query
      const parties = await Party.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean();

      // Convert to response format
      const partyList = await Promise.all(
        parties.map(party => this.convertToPartyListItem(party))
      );

      const paginationInfo: PaginationInfo = {
        currentPage: pagination.page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
      };

      return {
        success: true,
        data: {
          parties: partyList,
          pagination: paginationInfo,
        },
      };
    } catch (error) {
      return handleServiceError(error, 'Failed to search public parties', 'PARTY_PUBLIC_SEARCH_ERROR');
    }
  }

  /**
   * Build base query for user access (owned + shared + public)
   */
  private static buildUserAccessQuery(userId: Types.ObjectId, filters: PartyFilters): any {
    const accessConditions = [
      { ownerId: userId }, // User owns the party
      { sharedWith: userId }, // Party is shared with user
    ];

    // Include public parties unless explicitly filtered out
    if (filters.isPublic !== false) {
      accessConditions.push({ isPublic: true });
    }

    // If filtering for specific ownership
    if (filters.ownerId) {
      const ownerObjectId = new Types.ObjectId(filters.ownerId);
      return { ownerId: ownerObjectId };
    }

    // If filtering for parties shared with specific user
    if (filters.sharedWith) {
      const sharedUserObjectId = new Types.ObjectId(filters.sharedWith);
      return { sharedWith: sharedUserObjectId };
    }

    return { $or: accessConditions };
  }

  /**
   * Build search query for text search
   */
  private static buildSearchQuery(baseQuery: any, searchTerm?: string): any {
    if (!searchTerm || !searchTerm.trim()) {
      return baseQuery;
    }

    const searchConditions = [
      { name: { $regex: searchTerm.trim(), $options: 'i' } },
      { description: { $regex: searchTerm.trim(), $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm.trim(), 'i')] } },
    ];

    return {
      ...baseQuery,
      $and: [
        baseQuery.$or ? { $or: baseQuery.$or } : baseQuery,
        { $or: searchConditions },
      ],
    };
  }

  /**
   * Build filter query for specific filters
   */
  private static buildFilterQuery(baseQuery: any, filters: PartyFilters): any {
    let query = { ...baseQuery };

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    // Filter by member count (requires aggregation pipeline for accuracy)
    if (filters.memberCount && filters.memberCount.length > 0) {
      // For now, we'll use a simple approach
      // In a full implementation, this would use aggregation pipeline to count actual members
      // query.memberCount = { $in: filters.memberCount };
    }

    // Filter by public status
    if (filters.isPublic !== undefined) {
      query.isPublic = filters.isPublic;
    }

    return query;
  }

  /**
   * Build sort query object
   */
  private static buildSortQuery(sortBy: PartySortBy, sortOrder: SortOrder): any {
    const direction = sortOrder === 'desc' ? -1 : 1;

    switch (sortBy) {
      case 'name':
        return { name: direction };
      case 'createdAt':
        return { createdAt: direction };
      case 'updatedAt':
        return { updatedAt: direction };
      case 'lastActivity':
        return { lastActivity: direction };
      case 'memberCount':
        // For now, use a default sort since memberCount is virtual
        // In a full implementation, this would use aggregation pipeline
        return { createdAt: direction };
      case 'playerCharacterCount':
        // For now, use a default sort since playerCharacterCount is virtual
        return { createdAt: direction };
      case 'averageLevel':
        // For now, use a default sort since averageLevel is virtual
        return { createdAt: direction };
      default:
        return { name: 1 };
    }
  }

  /**
   * Calculate skip and limit for pagination
   */
  private static calculatePagination(pagination: PaginationParams): { skip: number; limit: number } {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    return { skip, limit };
  }

  /**
   * Convert Party document to PartyListItem format
   */
  private static async convertToPartyListItem(party: any): Promise<PartyListItem> {
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
      sharedWith: party.sharedWith.map((id: Types.ObjectId) => id.toString()),
      settings: party.settings,
      createdAt: party.createdAt,
      updatedAt: party.updatedAt,
      lastActivity: party.lastActivity,
      memberCount,
      playerCharacterCount,
      averageLevel,
    };
  }

  /**
   * Get suggested tags based on user's parties
   */
  static async getSuggestedTags(userId: string): Promise<ServiceResult<string[]>> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Aggregate to get unique tags from user's accessible parties
      const tagAggregation = await Party.aggregate([
        {
          $match: {
            $or: [
              { ownerId: userObjectId },
              { sharedWith: userObjectId },
              { isPublic: true },
            ],
          },
        },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
        { $project: { _id: 0, tag: '$_id' } },
      ]);

      const tags = tagAggregation.map(item => item.tag);

      return {
        success: true,
        data: tags,
      };
    } catch (error) {
      return handleServiceError(error, 'Failed to get suggested tags', 'PARTY_TAGS_ERROR');
    }
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
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Get counts for different party types
      const [totalParties, ownedParties, sharedParties, publicParties, recentActivity] = await Promise.all([
        // Total accessible parties
        Party.countDocuments({
          $or: [
            { ownerId: userObjectId },
            { sharedWith: userObjectId },
            { isPublic: true },
          ],
        }),
        // Owned parties
        Party.countDocuments({ ownerId: userObjectId }),
        // Shared parties
        Party.countDocuments({ sharedWith: userObjectId }),
        // Public parties (that user doesn't own)
        Party.countDocuments({
          isPublic: true,
          ownerId: { $ne: userObjectId },
        }),
        // Parties with recent activity (last 7 days)
        Party.countDocuments({
          $or: [
            { ownerId: userObjectId },
            { sharedWith: userObjectId },
          ],
          lastActivity: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        }),
      ]);

      return {
        success: true,
        data: {
          totalParties,
          ownedParties,
          sharedParties,
          publicParties,
          recentActivity,
        },
      };
    } catch (error) {
      return handleServiceError(error, 'Failed to get party statistics', 'PARTY_STATS_ERROR');
    }
  }
}