/**
 * Combat readiness utilities and types
 */

import type { Encounter } from '@/lib/validations/encounter';

export interface ReadinessCheck {
  category: string;
  status: 'ready' | 'warning' | 'error';
  message: string;
  details?: string;
}

export type ReadinessStatus = 'ready' | 'warning' | 'error';

/**
 * Check participant readiness
 */
export const checkParticipants = (participants: Encounter['participants']): ReadinessCheck => {
  const count = participants.length;

  if (count === 0) {
    return {
      category: 'Participants',
      status: 'error',
      message: 'No participants added',
      details: 'Add at least one participant to start combat',
    };
  }

  if (count < 2) {
    return {
      category: 'Participants',
      status: 'warning',
      message: 'Only one participant',
      details: 'Combat works better with multiple participants',
    };
  }

  return {
    category: 'Participants',
    status: 'ready',
    message: `${count} participants ready`,
  };
};

/**
 * Check initiative readiness
 */
export const checkInitiative = (participants: Encounter['participants']): ReadinessCheck => {
  const totalCount = participants.length;
  const withInitiative = participants.filter(p => p.initiative !== undefined).length;

  if (totalCount === 0) {
    return {
      category: 'Initiative',
      status: 'ready',
      message: 'No participants to check',
    };
  }

  if (withInitiative === 0) {
    return {
      category: 'Initiative',
      status: 'warning',
      message: 'No initiative set',
      details: 'Initiative will be rolled automatically if not set',
    };
  }

  if (withInitiative < totalCount) {
    return {
      category: 'Initiative',
      status: 'warning',
      message: 'Partial initiative set',
      details: `${withInitiative}/${totalCount} participants have initiative`,
    };
  }

  return {
    category: 'Initiative',
    status: 'ready',
    message: 'All initiative set',
  };
};

/**
 * Check settings readiness
 */
export const checkSettings = (settings: Encounter['settings']): ReadinessCheck => {
  const hasRequiredSettings = settings.autoRollInitiative !== undefined;

  if (hasRequiredSettings) {
    return {
      category: 'Settings',
      status: 'ready',
      message: 'Configuration complete',
    };
  }

  return {
    category: 'Settings',
    status: 'warning',
    message: 'Review settings',
    details: 'Check combat configuration options',
  };
};

/**
 * Get all readiness checks for an encounter
 */
export const getReadinessChecks = (encounter: Encounter): ReadinessCheck[] => {
  const participants = encounter.participants || [];

  return [
    checkParticipants(participants),
    checkInitiative(participants),
    checkSettings(encounter.settings),
  ];
};

/**
 * Determine overall readiness status
 */
export const getOverallStatus = (checks: ReadinessCheck[]): ReadinessStatus => {
  if (checks.some(check => check.status === 'error')) {
    return 'error';
  }

  if (checks.some(check => check.status === 'warning')) {
    return 'warning';
  }

  return 'ready';
};