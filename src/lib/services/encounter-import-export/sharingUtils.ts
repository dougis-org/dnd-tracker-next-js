/**
 * Sharing utilities for encounter import/export
 */

import crypto from 'crypto';
import type { ServiceResult } from '../UserServiceErrors';
import { handleEncounterServiceError } from '../EncounterServiceErrors';
import { Encounter } from '@/lib/models/encounter';
import { Types } from 'mongoose';

import type { EncounterExportData } from './types';
import { prepareExportData } from './dataBuilder';
import {SESSION_TIMEOUTS} from "@/lib/constants/session-constants";

/**
 * Generate shareable encounter link
 */
export async function generateShareableLink(
  encounterId: string,
  userId: string,
  expiresIn: number = SESSION_TIMEOUTS.UPDATE_AGE * 1000 // 24 hours
): Promise<ServiceResult<string>> {
  try {
    const encounter = await Encounter.findById(encounterId);
    if (!encounter) {
      return {
        success: false,
        error: {
          message: 'Encounter not found',
          code: 'ENCOUNTER_NOT_FOUND',
          statusCode: 404,
        },
      };
    }

    // Check if user has permission to share
    if (encounter.ownerId.toString() !== userId && !encounter.sharedWith.includes(new Types.ObjectId(userId))) {
      return {
        success: false,
        error: {
          message: 'You do not have permission to share this encounter',
          code: 'INSUFFICIENT_PERMISSIONS',
          statusCode: 403,
        },
      };
    }

    // Generate sharing token and URL
    const shareToken = generateShareToken(encounterId, userId, expiresIn);
    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/encounters/shared/${shareToken}`;

    return {
      success: true,
      data: shareUrl,
    };
  } catch (error) {
    return handleEncounterServiceError(
      error,
      'Failed to generate shareable link',
      'ENCOUNTER_SHARE_LINK_FAILED'
    );
  }
}

/**
 * Create encounter template for reuse
 */
export async function createTemplate(
  encounterId: string,
  userId: string,
  templateName: string
): Promise<ServiceResult<EncounterExportData>> {
  try {
    const exportOptions = {
      includeCharacterSheets: false,
      includePrivateNotes: false,
      includeIds: false,
      stripPersonalData: true,
    };

    const exportData = await prepareExportData(encounterId, userId, 'json', exportOptions);
    if (!exportData.success) {
      return exportData;
    }

    const templateData = exportData.data!;
    templateData.encounter.name = templateName;
    templateData.encounter.description = `Template created from: ${templateData.encounter.name}`;
    templateData.encounter.status = 'draft';
    templateData.encounter.isPublic = false;

    // Clear combat state for templates
    templateData.encounter.combatState = {
      isActive: false,
      currentRound: 0,
      currentTurn: 0,
      totalDuration: 0,
      initiativeOrder: [],
    };

    // Reset participant combat data
    templateData.encounter.participants = templateData.encounter.participants.map(p => ({
      ...p,
      currentHitPoints: p.maxHitPoints,
      temporaryHitPoints: 0,
      initiative: undefined,
      conditions: [],
      notes: '',
    }));

    return {
      success: true,
      data: templateData,
    };
  } catch (error) {
    return handleEncounterServiceError(
      error,
      'Failed to create encounter template',
      'ENCOUNTER_TEMPLATE_CREATION_FAILED'
    );
  }
}

/**
 * Generate sharing token for encounter links
 */
function generateShareToken(encounterId: string, userId: string, expiresIn: number): string {
  const payload = {
    encounterId,
    userId,
    expiresAt: Date.now() + expiresIn,
  };

  // Use cryptographically secure random bytes for token
  const randomBytes = crypto.randomBytes(32);
  const payloadString = JSON.stringify(payload);

  // Create HMAC with random key for security
  const hmac = crypto.createHmac('sha256', randomBytes);
  hmac.update(payloadString);
  const signature = hmac.digest('hex');

  // Combine payload and signature
  const token = Buffer.from(payloadString).toString('base64') + '.' + signature;
  return token.replace(/[+/=]/g, '').slice(0, 64);
}
