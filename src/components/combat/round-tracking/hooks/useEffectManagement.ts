import { useCallback } from 'react';
import {
  Effect,
  calculateEffectRemainingDuration,
  getExpiredEffects,
  getExpiringEffects,
} from '../round-utils';

interface EffectManagementHook {
  addEffect: (_effectData: Omit<Effect, 'id' | 'startRound'>) => void;
  removeEffect: (_effectId: string) => void;
  getEffectRemainingDuration: (_effect: Effect) => number;
  getExpiringEffects: () => Effect[];
  processExpiredEffects: (_effects: Effect[], _round: number) => Effect[];
}

/**
 * Hook for managing effects during round tracking
 */
export function useEffectManagement(
  effects: Effect[],
  currentRound: number,
  setState: React.Dispatch<React.SetStateAction<any>>,
  onEffectExpiry?: (_expiredEffectIds: string[]) => void
): EffectManagementHook {
  // Helper to process expired effects
  const processExpiredEffects = useCallback((effects: Effect[], round: number) => {
    const expiredEffects = getExpiredEffects(effects, round);
    if (expiredEffects.length > 0 && onEffectExpiry) {
      onEffectExpiry(expiredEffects.map(e => e.id));
    }
    return effects.filter(effect => calculateEffectRemainingDuration(effect, round) > 0);
  }, [onEffectExpiry]);

  const addEffect = useCallback((effectData: Omit<Effect, 'id' | 'startRound'>) => {
    setState((prev: any) => {
      const newEffect: Effect = {
        ...effectData,
        id: `effect-${Date.now()}-${require('crypto').randomBytes(5).toString('hex')}`,
        startRound: prev.currentRound,
      };

      return {
        ...prev,
        effects: [...prev.effects, newEffect],
      };
    });
  }, [setState]);

  const removeEffect = useCallback((effectId: string) => {
    setState((prev: any) => ({
      ...prev,
      effects: prev.effects.filter((effect: Effect) => effect.id !== effectId),
    }));
  }, [setState]);

  const getEffectRemainingDuration = useCallback((effect: Effect): number => {
    return calculateEffectRemainingDuration(effect, currentRound);
  }, [currentRound]);

  const getExpiringEffectsCallback = useCallback((): Effect[] => {
    return getExpiringEffects(effects, currentRound);
  }, [effects, currentRound]);

  return {
    addEffect,
    removeEffect,
    getEffectRemainingDuration,
    getExpiringEffects: getExpiringEffectsCallback,
    processExpiredEffects,
  };
}