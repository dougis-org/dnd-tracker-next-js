/**
 * Character Access Control Utilities
 *
 * Centralized access control logic to eliminate duplication across Character service modules.
 * Handles ownership checking, access permissions, and authorization logic.
 */

import { Types } from 'mongoose';
import { Character } from '../../models/Character';
import type { ICharacter } from '../../models/Character';
import {
  ServiceResult,
  createSuccessResult,
  createErrorResult,
  CharacterServiceErrors
} from '../CharacterServiceErrors';

export interface CharacterPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isOwner: boolean;
  isPublic: boolean;
}

export class CharacterAccessUtils {

  /**
   * Check if user owns the character
   */
  static async checkOwnership(characterId: string, userId: string): Promise<ServiceResult<ICharacter>> {
    try {
      const character = await Character.findById(characterId);
      if (!character) {
        return createErrorResult(CharacterServiceErrors.characterNotFound(characterId));
      }

      const isOwner = character.ownerId.toString() === userId;
      if (!isOwner) {
        return createErrorResult(CharacterServiceErrors.unauthorizedAccess(characterId, userId));
      }

      return createSuccessResult(character);
    } catch (error) {
      return createErrorResult(CharacterServiceErrors.databaseError('check character ownership', error));
    }
  }

  /**
   * Check if user has access to view/read the character (owner or public)
   */
  static async checkAccess(characterId: string, userId: string): Promise<ServiceResult<ICharacter>> {
    try {
      const character = await Character.findById(characterId);
      if (!character) {
        return createErrorResult(CharacterServiceErrors.characterNotFound(characterId));
      }

      const hasAccess = character.ownerId.toString() === userId || character.isPublic;
      if (!hasAccess) {
        return createErrorResult(CharacterServiceErrors.unauthorizedAccess(characterId, userId));
      }

      return createSuccessResult(character);
    } catch (error) {
      return createErrorResult(CharacterServiceErrors.databaseError('check character access', error));
    }
  }

  /**
   * Get detailed permissions for a character and user
   */
  static async getPermissions(characterId: string, userId: string): Promise<ServiceResult<CharacterPermissions>> {
    try {
      const character = await Character.findById(characterId);
      if (!character) {
        return createErrorResult(CharacterServiceErrors.characterNotFound(characterId));
      }

      const isOwner = character.ownerId.toString() === userId;
      const canView = isOwner || character.isPublic;

      const permissions: CharacterPermissions = {
        canView,
        canEdit: isOwner,
        canDelete: isOwner,
        isOwner,
        isPublic: character.isPublic,
      };

      return createSuccessResult(permissions);
    } catch (error) {
      return createErrorResult(CharacterServiceErrors.databaseError('get character permissions', error));
    }
  }

  /**
   * Batch check access for multiple characters
   */
  static async checkMultipleAccess(
    characterIds: string[],
    userId: string
  ): Promise<ServiceResult<{ accessible: ICharacter[]; denied: string[] }>> {
    try {
      const characters = await Character.find({
        _id: { $in: characterIds }
      });

      const accessible: ICharacter[] = [];
      const denied: string[] = [];

      for (const characterId of characterIds) {
        const character = characters.find(c => c._id.toString() === characterId);
        if (!character) {
          denied.push(characterId);
          continue;
        }

        const hasAccess = character.ownerId.toString() === userId || character.isPublic;
        if (hasAccess) {
          accessible.push(character);
        } else {
          denied.push(characterId);
        }
      }

      return createSuccessResult({ accessible, denied });
    } catch (error) {
      return createErrorResult(CharacterServiceErrors.databaseError('check multiple character access', error));
    }
  }

  /**
   * Check ownership for multiple characters (bulk operations)
   */
  static async checkMultipleOwnership(
    characterIds: string[],
    userId: string
  ): Promise<ServiceResult<{ owned: ICharacter[]; denied: string[] }>> {
    try {
      const ownerFilter = this.createOwnershipFilter(userId);
      const characters = await Character.find({
        _id: { $in: characterIds },
        ownerId: ownerFilter.ownerId
      });

      const ownedIds = characters.map(c => c._id.toString());
      const denied = characterIds.filter(id => !ownedIds.includes(id));

      return createSuccessResult({ owned: characters, denied });
    } catch (error) {
      return createErrorResult(CharacterServiceErrors.databaseError('check multiple character ownership', error));
    }
  }

  /**
   * Create MongoDB filter for user access (owner or public)
   */
  static createUserAccessFilter(userId: string): object {
    try {
      const userObjectId = new Types.ObjectId(userId);
      return {
        $or: [
          { ownerId: userObjectId },
          { isPublic: true },
        ],
      };
    } catch {
      // Fallback for testing environments
      return {
        $or: [
          { ownerId: userId },
          { isPublic: true },
        ],
      };
    }
  }

  /**
   * Create MongoDB filter for user ownership only
   */
  static createOwnershipFilter(userId: string): { ownerId: Types.ObjectId | string } {
    try {
      return { ownerId: new Types.ObjectId(userId) };
    } catch {
      // Fallback for testing environments where Types.ObjectId might not work
      return { ownerId: userId };
    }
  }

  /**
   * Validate and prepare user access query
   */
  static async prepareUserAccessQuery(
    baseFilter: object,
    userId: string
  ): Promise<ServiceResult<object>> {
    try {
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return createErrorResult(CharacterServiceErrors.invalidOwnerId(userId));
      }

      const accessFilter = this.createUserAccessFilter(userId);
      const combinedFilter = {
        $and: [accessFilter, baseFilter],
      };

      return createSuccessResult(combinedFilter);
    } catch (error) {
      return createErrorResult(CharacterServiceErrors.databaseError('prepare user access query', error));
    }
  }

  /**
   * Check if character is in use (for deletion safety)
   */
  static async checkCharacterInUse(_characterId: string): Promise<ServiceResult<{ inUse: boolean; usage?: string }>> {
    try {
      // Note: This would typically check encounters, parties, active combat sessions, etc.
      // For now, we'll just return not in use, but this can be expanded later
      // when we have encounter and party models implemented

      return createSuccessResult({ inUse: false });
    } catch (error) {
      return createErrorResult(CharacterServiceErrors.databaseError('check character usage', error));
    }
  }
}