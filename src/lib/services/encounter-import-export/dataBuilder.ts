/**
 * Data building utilities for encounter import/export
 */

import type { IEncounter } from '@/lib/models/encounter/interfaces';
import type { ServiceResult } from '../UserServiceErrors';
import { handleEncounterServiceError } from '../EncounterServiceErrors';
import { Character } from '@/lib/models/Character';
import { Encounter } from '@/lib/models/encounter';
import { Types } from 'mongoose';

import type { ExportFormat, ExportOptions, EncounterExportData } from './types';

/**
 * Constants for export versioning
 */
const EXPORT_VERSION = '1.0.0';
const APP_VERSION = '1.0.0';

/**
 * Validate export request and return encounter
 */
async function validateExportRequest(encounterId: string, userId: string): Promise<ServiceResult<IEncounter>> {
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

  if (encounter.ownerId.toString() !== userId && !encounter.sharedWith.includes(new Types.ObjectId(userId))) {
    return {
      success: false,
      error: {
        message: 'You do not have permission to export this encounter',
        code: 'INSUFFICIENT_PERMISSIONS',
        statusCode: 403,
      },
    };
  }

  return { success: true, data: encounter };
}

/**
 * Enhance export data with combat state and character sheets
 */
async function enhanceExportData(exportData: EncounterExportData, encounter: IEncounter, options: ExportOptions) {
  if (encounter.combatState?.isActive) {
    exportData.encounter.combatState = buildCombatStateData(encounter, options);
  }

  if (options.includeCharacterSheets) {
    const characterSheets = await buildCharacterSheetsData(encounter, options);
    if (characterSheets) {
      exportData.encounter.characterSheets = characterSheets;
    }
  }
}

/**
 * Prepare export data with all encounter information
 */
export async function prepareExportData(
  encounterId: string,
  userId: string,
  format: ExportFormat,
  options: ExportOptions
): Promise<ServiceResult<EncounterExportData>> {
  try {
    const validation = await validateExportRequest(encounterId, userId);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error,
      };
    }

    const encounter = validation.data!;
    const exportData = buildBaseExportData(encounter, userId, format, options);

    await enhanceExportData(exportData, encounter, options);

    return {
      success: true,
      data: exportData,
    };
  } catch (error) {
    return handleEncounterServiceError(
      error,
      'Failed to prepare export data',
      'ENCOUNTER_EXPORT_DATA_PREPARATION_FAILED'
    );
  }
}

/**
 * Build base export data structure
 */
function buildBaseExportData(
  encounter: IEncounter,
  userId: string,
  format: ExportFormat,
  options: ExportOptions
): EncounterExportData {
  return {
    metadata: {
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
      format,
      version: EXPORT_VERSION,
      appVersion: APP_VERSION,
    },
    encounter: {
      name: encounter.name,
      description: encounter.description,
      tags: encounter.tags,
      difficulty: encounter.difficulty,
      estimatedDuration: encounter.estimatedDuration,
      targetLevel: encounter.targetLevel,
      status: encounter.status,
      isPublic: encounter.isPublic,
      settings: encounter.settings,
      participants: encounter.participants.map(p => ({
        id: options.includeIds ? p.characterId.toString() : generateTempId(),
        name: p.name,
        type: p.type,
        maxHitPoints: p.maxHitPoints,
        currentHitPoints: p.currentHitPoints,
        temporaryHitPoints: p.temporaryHitPoints,
        armorClass: p.armorClass,
        initiative: p.initiative,
        isPlayer: p.isPlayer,
        isVisible: p.isVisible,
        notes: options.includePrivateNotes ? p.notes : '',
        conditions: p.conditions,
        position: p.position,
      })),
    },
  };
}

/**
 * Build combat state data for export
 */
function buildCombatStateData(encounter: IEncounter, options: ExportOptions) {
  return {
    isActive: encounter.combatState!.isActive,
    currentRound: encounter.combatState!.currentRound,
    currentTurn: encounter.combatState!.currentTurn,
    totalDuration: encounter.combatState!.totalDuration,
    startedAt: encounter.combatState!.startedAt?.toISOString(),
    pausedAt: encounter.combatState!.pausedAt?.toISOString(),
    endedAt: encounter.combatState!.endedAt?.toISOString(),
    initiativeOrder: encounter.combatState!.initiativeOrder.map(i => ({
      participantId: options.includeIds ? i.participantId.toString() : generateTempId(),
      initiative: i.initiative,
      dexterity: i.dexterity,
      isActive: i.isActive,
      hasActed: i.hasActed,
      isDelayed: i.isDelayed,
      readyAction: i.readyAction || undefined,
    })),
  };
}

/**
 * Build character sheets data for export
 */
async function buildCharacterSheetsData(encounter: IEncounter, options: ExportOptions) {
  const characterIds = encounter.participants.map(p => p.characterId);
  const characters = await Character.find({ _id: { $in: characterIds } });

  return characters.map(char => ({
    id: options.includeIds ? char._id.toString() : generateTempId(),
    name: char.name,
    type: char.type,
    race: char.race,
    customRace: char.customRace,
    size: char.size,
    classes: char.classes,
    abilityScores: char.abilityScores,
    hitPoints: char.hitPoints,
    armorClass: char.armorClass,
    speed: char.speed,
    proficiencyBonus: char.proficiencyBonus,
    savingThrows: char.savingThrows,
    skills: Object.fromEntries(char.skills),
    equipment: char.equipment,
    spells: char.spells,
    backstory: options.stripPersonalData ? '' : char.backstory,
    notes: options.includePrivateNotes && !options.stripPersonalData ? char.notes : '',
    imageUrl: char.imageUrl,
  }));
}

/**
 * Generate temporary ID for data without persistent IDs
 */
function generateTempId(): string {
  return `temp_${Date.now()}_${require('crypto').randomBytes(5).toString('hex')}`;
}