/**
 * Utility functions for encounter management
 */

import type { Types } from 'mongoose';
import type { Encounter } from '@/lib/validations/encounter';

/**
 * Format duration in minutes to human-readable string
 */
export const formatDuration = (minutes?: number): string => {
  if (!minutes) return 'Not specified';
  return `${minutes} minutes`;
};

/**
 * Format difficulty string with proper capitalization
 */
export const formatDifficulty = (difficulty?: string): string => {
  if (!difficulty) return 'Unknown';
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
};

/**
 * Format status string with proper capitalization
 */
export const formatStatus = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

/**
 * Generate share link for encounter
 */
export const generateShareLink = (encounterId: string | Types.ObjectId): string => {
  return `${window.location.origin}/encounters/${encounterId.toString()}/shared`;
};

/**
 * Copy text to clipboard with error handling
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Check if encounter can start combat
 */
export const canStartCombat = (encounter: Encounter): boolean => {
  return encounter.participants.length > 0 && encounter.status !== 'active';
};

/**
 * Get encounter statistics
 */
export const getEncounterStats = (encounter: Encounter) => {
  const participants = encounter.participants || [];

  return {
    totalHitPoints: participants.reduce((sum, p) => sum + p.maxHitPoints, 0),
    averageArmorClass: participants.length > 0
      ? Math.round(participants.reduce((sum, p) => sum + p.armorClass, 0) / participants.length)
      : 0,
    playerCount: participants.filter(p => p.isPlayer).length,
    enemyCount: participants.filter(p => !p.isPlayer).length,
    totalParticipants: participants.length
  };
};