import { useCallback } from 'react';
import { Trigger, getDueTriggers, getUpcomingTriggers } from '../round-utils';

interface TriggerManagementHook {
  addTrigger: (_triggerData: Omit<Trigger, 'id' | 'isActive'>) => void;
  activateTrigger: (_triggerId: string) => void;
  getDueTriggers: () => Trigger[];
  getUpcomingTriggers: () => Trigger[];
}

/**
 * Hook for managing triggers during round tracking
 */
export function useTriggerManagement(
  triggers: Trigger[],
  currentRound: number,
  setState: React.Dispatch<React.SetStateAction<any>>,
  onTriggerActivation?: (_triggerId: string, _trigger: Trigger) => void
): TriggerManagementHook {
  // Helper to find and validate trigger
  const findActiveTrigger = useCallback((triggers: Trigger[], triggerId: string) => {
    return triggers.find(t => t.id === triggerId && t.isActive);
  }, []);

  // Helper to update trigger state
  const updateTriggerState = useCallback((triggers: Trigger[], triggerId: string, currentRound: number) => {
    return triggers.map(t =>
      t.id === triggerId
        ? { ...t, isActive: false, triggeredRound: currentRound }
        : t
    );
  }, []);

  const addTrigger = useCallback((triggerData: Omit<Trigger, 'id' | 'isActive'>) => {
    const newTrigger: Trigger = {
      ...triggerData,
      id: `trigger-${Date.now()}-${require('crypto').randomBytes(5).toString('hex')}`,
      isActive: true,
    };

    setState((prev: any) => ({
      ...prev,
      triggers: [...prev.triggers, newTrigger],
    }));
  }, [setState]);

  const activateTrigger = useCallback((triggerId: string) => {
    setState((prev: any) => {
      const trigger = findActiveTrigger(prev.triggers, triggerId);
      if (!trigger) {
        return prev;
      }

      if (onTriggerActivation) {
        onTriggerActivation(triggerId, trigger);
      }

      return {
        ...prev,
        triggers: updateTriggerState(prev.triggers, triggerId, prev.currentRound),
      };
    });
  }, [findActiveTrigger, updateTriggerState, onTriggerActivation, setState]);

  const getDueTriggersCallback = useCallback((): Trigger[] => {
    return getDueTriggers(triggers, currentRound);
  }, [triggers, currentRound]);

  const getUpcomingTriggersCallback = useCallback((): Trigger[] => {
    return getUpcomingTriggers(triggers, currentRound);
  }, [triggers, currentRound]);

  return {
    addTrigger,
    activateTrigger,
    getDueTriggers: getDueTriggersCallback,
    getUpcomingTriggers: getUpcomingTriggersCallback,
  };
}