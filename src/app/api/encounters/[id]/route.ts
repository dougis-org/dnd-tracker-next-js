import { NextRequest, NextResponse } from 'next/server';
import { EncounterService } from '@/lib/services/EncounterService';
import { updateEncounterSchema } from '@/lib/validations/encounter';
import { 
  validateEncounterId as validateEncounterIdUtil,
  validateEncounterAccess as validateEncounterAccessUtil,
  validateRequestBody,
  handleServiceResult
} from '@/lib/api/route-helpers';
import { withAuth, withAuthAndAccess } from '@/lib/api/session-route-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const encounterId = await validateEncounterIdUtil(params);
  
  return withAuth(async (userId) => {
    const encounter = await validateEncounterAccessUtil(encounterId, userId, EncounterService);
    return handleServiceResult({ success: true, data: encounter });
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuthAndAccess(params, async (userId, encounterId) => {
    const updateData = await validateRequestBody(request, []);
    const validatedData = updateEncounterSchema.parse(updateData);
    
    const result = await EncounterService.updateEncounter(encounterId, validatedData);
    return handleServiceResult(result, 'Encounter updated successfully');
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuthAndAccess(params, async (userId, encounterId) => {
    const result = await EncounterService.deleteEncounter(encounterId);
    return handleServiceResult(result, 'Encounter deleted successfully');
  });
}