import { NextRequest } from 'next/server';
import { PartyService } from '@/lib/services/PartyService';
import {
  withAuth,
  createSuccessResponse,
  handleServiceError,
} from '@/lib/api/route-helpers';
import {
  partyUpdateSchema,
  type PartyUpdate,
} from '@/lib/validations/party';
import { ZodError } from 'zod';

/**
 * GET /api/parties/[id]
 * Get a specific party by ID (with access control)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (userId) => {
    try {
      const { id: partyId } = await params;

      // Get party using the service
      const result = await PartyService.getPartyById(partyId, userId);

      if (!result.success) {
        return handleServiceError(result, 'Failed to get party');
      }

      return createSuccessResponse({ party: result.data });
    } catch (error) {
      console.error('GET /api/parties/[id] error:', error);
      return handleServiceError(
        { error: { message: 'Internal server error' } },
        'Failed to get party',
        500
      );
    }
  });
}

/**
 * PUT /api/parties/[id]
 * Update a specific party (owner only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (userId) => {
    try {
      const { id: partyId } = await params;
      const body = await request.json();

      // Validate request body
      const validatedData: PartyUpdate = partyUpdateSchema.parse(body);

      // Update party using the service
      const result = await PartyService.updateParty(partyId, userId, validatedData);

      if (!result.success) {
        return handleServiceError(result, 'Failed to update party');
      }

      return createSuccessResponse(
        { party: result.data },
        'Party updated successfully'
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return handleServiceError(
          { error: { message: 'Invalid party data', details: error.errors } },
          'Invalid party data'
        );
      }

      console.error('PUT /api/parties/[id] error:', error);
      return handleServiceError(
        { error: { message: 'Internal server error' } },
        'Failed to update party',
        500
      );
    }
  });
}

/**
 * DELETE /api/parties/[id]
 * Delete a specific party (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (userId) => {
    try {
      const { id: partyId } = await params;

      // Delete party using the service
      const result = await PartyService.deleteParty(partyId, userId);

      if (!result.success) {
        return handleServiceError(result, 'Failed to delete party');
      }

      return createSuccessResponse({}, 'Party deleted successfully');
    } catch (error) {
      console.error('DELETE /api/parties/[id] error:', error);
      return handleServiceError(
        { error: { message: 'Internal server error' } },
        'Failed to delete party',
        500
      );
    }
  });
}