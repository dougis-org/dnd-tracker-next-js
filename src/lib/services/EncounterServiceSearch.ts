import { Types } from 'mongoose';
import { Encounter } from '@/lib/models/encounter';
import type { IEncounter } from '@/lib/models/encounter/interfaces';
import type { ServiceResult } from './UserServiceErrors';
import {
  handleEncounterServiceError,
  InvalidEncounterIdError,
} from './EncounterServiceErrors';
import { EncounterServiceValidation } from './EncounterServiceValidation';

/**
 * Encounter Service - Search and Filtering Module
 *
 * Handles encounter search functionality including filtering by various
 * criteria and retrieving encounters by ownership and permissions.
 */
export class EncounterServiceSearch {

  /**
   * Search encounters with various filters
   */
  static async searchEncounters(criteria: {
    query?: string;
    name?: string;
    difficulty?: string | string[];
    targetLevel?: number;
    targetLevelMin?: number;
    targetLevelMax?: number;
    status?: string | string[];
    tags?: string[];
    ownerId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<ServiceResult<{
    encounters: IEncounter[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
  }>> {
    try {
      const searchParams = EncounterServiceSearch.normalizeSearchParams(criteria);
      const mongoQuery = EncounterServiceSearch.buildMongoQuery(searchParams);
      const { sortOption, skip } = EncounterServiceSearch.buildPaginationAndSort(searchParams);

      const [encounters, totalItems] = await Promise.all([
        Encounter.find(mongoQuery)
          .sort(sortOption)
          .skip(skip)
          .limit(searchParams.limit)
          .exec(),
        Encounter.countDocuments(mongoQuery),
      ]);

      const totalPages = Math.ceil(totalItems / searchParams.limit);

      return {
        success: true,
        data: {
          encounters,
          currentPage: searchParams.page,
          totalPages,
          totalItems,
        },
      };
    } catch (error) {
      return handleEncounterServiceError(
        error,
        'Failed to search encounters',
        'ENCOUNTER_SEARCH_FAILED'
      );
    }
  }

  private static normalizeSearchParams(criteria: any) {
    return {
      query: criteria.query,
      name: criteria.name,
      difficulty: criteria.difficulty,
      targetLevel: criteria.targetLevel,
      targetLevelMin: criteria.targetLevelMin,
      targetLevelMax: criteria.targetLevelMax,
      status: criteria.status,
      tags: criteria.tags,
      ownerId: criteria.ownerId,
      sortBy: criteria.sortBy || 'updatedAt',
      sortOrder: criteria.sortOrder || 'desc',
      page: criteria.page || 1,
      limit: criteria.limit || 20,
    };
  }

  private static buildMongoQuery(params: any): any {
    const mongoQuery: any = {};

    EncounterServiceSearch.addTextSearchFilter(mongoQuery, params);
    EncounterServiceSearch.addDifficultyFilter(mongoQuery, params);
    EncounterServiceSearch.addTargetLevelFilter(mongoQuery, params);
    EncounterServiceSearch.addStatusFilter(mongoQuery, params);
    EncounterServiceSearch.addTagsFilter(mongoQuery, params);
    EncounterServiceSearch.addOwnerFilter(mongoQuery, params);

    return mongoQuery;
  }

  private static addTextSearchFilter(mongoQuery: any, params: any): void {
    if (params.query || params.name) {
      mongoQuery.name = { $regex: params.query || params.name, $options: 'i' };
    }
  }

  private static addDifficultyFilter(mongoQuery: any, params: any): void {
    if (params.difficulty) {
      if (Array.isArray(params.difficulty) && params.difficulty.length > 0) {
        mongoQuery.difficulty = { $in: params.difficulty };
      } else if (typeof params.difficulty === 'string') {
        mongoQuery.difficulty = params.difficulty;
      }
    }
  }

  private static addTargetLevelFilter(mongoQuery: any, params: any): void {
    if (params.targetLevel) {
      mongoQuery.targetLevel = params.targetLevel;
    } else if (params.targetLevelMin !== undefined || params.targetLevelMax !== undefined) {
      mongoQuery.targetLevel = {};
      if (params.targetLevelMin !== undefined) {
        mongoQuery.targetLevel.$gte = params.targetLevelMin;
      }
      if (params.targetLevelMax !== undefined) {
        mongoQuery.targetLevel.$lte = params.targetLevelMax;
      }
    }
  }

  private static addStatusFilter(mongoQuery: any, params: any): void {
    if (params.status) {
      if (Array.isArray(params.status) && params.status.length > 0) {
        mongoQuery.status = { $in: params.status };
      } else if (typeof params.status === 'string') {
        mongoQuery.status = params.status;
      }
    }
  }

  private static addTagsFilter(mongoQuery: any, params: any): void {
    if (params.tags && Array.isArray(params.tags) && params.tags.length > 0) {
      mongoQuery.tags = { $in: params.tags };
    }
  }

  private static addOwnerFilter(mongoQuery: any, params: any): void {
    if (params.ownerId) {
      if (!EncounterServiceValidation.isValidObjectId(params.ownerId)) {
        throw new InvalidEncounterIdError(params.ownerId);
      }
      mongoQuery.ownerId = params.ownerId;
    }
  }

  private static buildPaginationAndSort(params: any) {
    const skip = (params.page - 1) * params.limit;
    const sortOption: any = {};
    sortOption[params.sortBy] = params.sortOrder === 'asc' ? 1 : -1;

    return { sortOption, skip };
  }

  /**
   * Get encounters by owner
   */
  static async getEncountersByOwner(
    ownerId: string,
    includeShared: boolean = false
  ): Promise<ServiceResult<IEncounter[]>> {
    try {
      if (!EncounterServiceValidation.isValidObjectId(ownerId)) {
        throw new InvalidEncounterIdError(ownerId);
      }

      const encounters = await Encounter.findByOwnerId(
        new Types.ObjectId(ownerId),
        includeShared
      );

      return {
        success: true,
        data: encounters,
      };
    } catch (error) {
      return handleEncounterServiceError(
        error,
        'Failed to get encounters by owner',
        'ENCOUNTERS_BY_OWNER_FAILED'
      );
    }
  }
}