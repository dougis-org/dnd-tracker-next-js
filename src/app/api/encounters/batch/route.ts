import { NextRequest, NextResponse } from 'next/server';
import { EncounterServiceImportExport } from '@/lib/services/EncounterServiceImportExport';
import { EncounterService } from '@/lib/services/EncounterService';
import { withAuth } from '@/lib/api/route-helpers';
import { handleApiError, processBatchItems, createBatchResponse, performExportOperation, validateEncounterOwnership } from '../shared-route-helpers';
import { z } from 'zod';

const batchOperationSchema = z.object({
  operation: z.enum(['export', 'template', 'delete', 'archive', 'publish', 'duplicate']),
  encounterIds: z.array(z.string()).min(1, 'At least one encounter ID is required').max(50, 'Maximum 50 encounters allowed'),
  options: z.object({
    // Export options
    format: z.enum(['json', 'xml']).default('json'),
    includeCharacterSheets: z.boolean().default(false),
    includePrivateNotes: z.boolean().default(false),
    stripPersonalData: z.boolean().default(true),

    // Template options
    templatePrefix: z.string().max(50).default('Template'),

    // Archive options
    archiveReason: z.string().max(200).optional(),

    // Publish options
    makePublic: z.boolean().default(true),

    // Duplicate options
    namePrefix: z.string().max(50).default('Copy of'),
  }).default({}),
});

export async function POST(request: NextRequest) {
  return withAuth(async (userId: string) => {
    try {
      const body = await request.json();
      const validatedBody = batchOperationSchema.parse(body);

      const { operation, encounterIds, options } = validatedBody;
      const { results, errors } = await processBatchItems(
        encounterIds,
        async (encounterId: string) => await executeBatchOperation(operation, encounterId, userId, options)
      );

      const response = createBatchResponse(operation, results, errors, encounterIds.length);
      return NextResponse.json(response);
    } catch (error) {
      return handleApiError(error);
    }
  });
}


async function executeBatchOperation(operation: string, encounterId: string, userId: string, options: any) {
  // Use explicit mapping instead of dynamic property access to prevent command injection
  switch (operation) {
    case 'export':
      return await handleBatchExport(encounterId, userId, options);
    case 'template':
      return await handleBatchTemplate(encounterId, userId, options);
    case 'delete':
      return await handleBatchDelete(encounterId, userId);
    case 'archive':
      return await handleBatchArchive(encounterId, userId, options);
    case 'publish':
      return await handleBatchPublish(encounterId, userId, options);
    case 'duplicate':
      return await handleBatchDuplicate(encounterId, userId, options);
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

async function handleBatchExport(encounterId: string, userId: string, options: any) {
  const exportOptions = {
    includeCharacterSheets: options.includeCharacterSheets,
    includePrivateNotes: options.includePrivateNotes,
    includeIds: true,
    stripPersonalData: options.stripPersonalData,
  };

  return await performExportOperation(encounterId, userId, options.format, exportOptions);
}

async function handleBatchTemplate(encounterId: string, userId: string, options: any) {
  // Get encounter details for naming
  const encounterResult = await EncounterService.getEncounterById(encounterId);
  if (!encounterResult.success) {
    return encounterResult;
  }

  const encounter = (encounterResult as any).data!;
  const templateName = `${options.templatePrefix} - ${encounter.name}`;

  return await EncounterServiceImportExport.createTemplate(encounterId, userId, templateName);
}


async function handleBatchDelete(encounterId: string, userId: string) {
  const ownershipCheck = await validateEncounterOwnership(encounterId, userId, 'delete');
  if (!ownershipCheck.success) {
    return ownershipCheck;
  }

  return await EncounterService.deleteEncounter(encounterId);
}

async function handleBatchArchive(encounterId: string, userId: string, options: any) {
  const ownershipCheck = await validateEncounterOwnership(encounterId, userId, 'archive');
  if (!ownershipCheck.success) {
    return ownershipCheck;
  }

  const encounter = (ownershipCheck as any).data!;
  const updateData = {
    status: 'archived' as const,
    description: options.archiveReason
      ? `${encounter.description}\n\n[Archived: ${options.archiveReason}]`
      : encounter.description,
  };

  return await EncounterService.updateEncounter(encounterId, updateData);
}

async function handleBatchPublish(encounterId: string, userId: string, options: any) {
  const ownershipCheck = await validateEncounterOwnership(encounterId, userId, 'publish');
  if (!ownershipCheck.success) {
    return ownershipCheck;
  }

  const updateData = {
    isPublic: options.makePublic,
  };

  return await EncounterService.updateEncounter(encounterId, updateData);
}

async function handleBatchDuplicate(encounterId: string, userId: string, options: any) {
  const ownershipCheck = await validateEncounterOwnership(encounterId, userId, 'duplicate');
  if (!ownershipCheck.success) {
    return ownershipCheck;
  }

  const encounter = (ownershipCheck as any).data!;
  const newName = `${options.namePrefix} ${encounter.name}`;

  return await EncounterService.cloneEncounter(encounterId, newName);
}