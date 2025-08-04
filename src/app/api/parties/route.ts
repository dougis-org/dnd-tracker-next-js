import { NextRequest } from 'next/server';
import { PartyService } from '@/lib/services/PartyService';
import {
  withAuth,
  createSuccessResponse,
  handleServiceError,
} from '@/lib/api/route-helpers';
import {
  partyCreateSchema,
  partyQuerySchema,
  type PartyCreate,
} from '@/lib/validations/party';
import { ZodError } from 'zod';

/**
 * GET /api/parties
 * Get paginated list of parties for the authenticated user
 * Supports filtering, sorting, and pagination via query parameters
 */
export async function GET(request: NextRequest) {
  return withAuth(async (userId) => {
    try {
      const url = new URL(request.url);
      const searchParams = Object.fromEntries(url.searchParams.entries());

      // Parse query parameters
      const queryData = {
        filters: {
          search: searchParams.search || undefined,
          tags: searchParams.tags ? searchParams.tags.split(',') : [],
          memberCount: searchParams.memberCount
            ? searchParams.memberCount.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n))
            : [],
          isPublic: searchParams.isPublic ? searchParams.isPublic === 'true' : undefined,
          ownerId: searchParams.ownerId || undefined,
          sharedWith: searchParams.sharedWith || undefined,
        },
        sortBy: searchParams.sortBy || 'name',
        sortOrder: searchParams.sortOrder || 'asc',
        pagination: {
          page: parseInt(searchParams.page || '1', 10),
          limit: Math.min(parseInt(searchParams.limit || '20', 10), 100), // Cap at 100
        },
      };

      // Validate query parameters
      const validatedQuery = partyQuerySchema.parse(queryData);

      // Get parties using the service
      const result = await PartyService.getPartiesForUser(
        userId,
        validatedQuery.filters,
        validatedQuery.sortBy,
        validatedQuery.sortOrder,
        validatedQuery.pagination
      );

      if (!result.success) {
        return handleServiceError(result, 'Failed to get parties');
      }

      return createSuccessResponse({
        parties: result.data?.parties || [],
        pagination: result.data?.pagination || {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 20,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return handleServiceError(
          { error: { message: 'Invalid query parameters', details: error.errors } },
          'Invalid query parameters'
        );
      }

      console.error('GET /api/parties error:', error);
      return handleServiceError(
        { error: { message: 'Internal server error' } },
        'Failed to get parties',
        500
      );
    }
  });
}

/**
 * POST /api/parties
 * Create a new party for the authenticated user
 */
export async function POST(request: NextRequest) {
  return withAuth(async (userId) => {
    try {
      const body = await request.json();

      // Validate request body
      const validatedData: PartyCreate = partyCreateSchema.parse(body);

      // Create party using the service
      const result = await PartyService.createParty(userId, validatedData);

      if (!result.success) {
        return handleServiceError(result, 'Failed to create party');
      }

      return createSuccessResponse(
        { party: result.data },
        'Party created successfully'
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return handleServiceError(
          { error: { message: 'Invalid party data', details: error.errors } },
          'Invalid party data'
        );
      }

      console.error('POST /api/parties error:', error);
      return handleServiceError(
        { error: { message: 'Internal server error' } },
        'Failed to create party',
        500
      );
    }
  });
}