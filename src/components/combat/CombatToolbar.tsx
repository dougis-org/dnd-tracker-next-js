'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { SecureKeyboardActionHandler } from '../../test-utils/secure-method-calls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Download,
  Share2,
} from 'lucide-react';

import { IEncounter } from '@/lib/models/encounter/interfaces';
import { useCombatTimer } from '@/hooks/useCombatTimer';
import { QuickActions } from './QuickActions';
import { CombatTimer } from './CombatTimer';
import { CombatStatus } from './CombatStatus';
import { CombatControlsSection } from './CombatControls';

interface CombatActions {
  onNextTurn?: () => void;
  onPreviousTurn?: () => void;
  onPauseCombat?: () => void;
  onResumeCombat?: () => void;
  onEndCombat?: () => void;
  onExportInitiative?: () => void;
  onShareInitiative?: () => void;
}

interface InitiativeActions {
  onEditInitiative?: () => void;
  onDelayAction?: () => void;
  onReadyAction?: () => void;
  onRollInitiative?: () => void;
}

interface QuickActionsConfig {
  onMassHeal?: () => void;
  onMassDamage?: () => void;
  onClearConditions?: () => void;
  onAddParticipant?: () => void;
  onEncounterSettings?: () => void;
}

interface CustomAction {
  id: string;
  label: string;
  icon: string;
  handler: () => void;
}

interface ToolbarSettings {
  showTimer?: boolean;
  showQuickActions?: boolean;
  enableKeyboardShortcuts?: boolean;
  customActions?: CustomAction[];
}

interface CombatToolbarProps {
  encounter: IEncounter;
  combatActions?: CombatActions;
  initiativeActions?: InitiativeActions;
  quickActions?: QuickActionsConfig;
  settings?: ToolbarSettings;
}

// Header badges component
function HeaderBadges({ currentRound, isActive, currentTurn, initiativeOrder }: {
  currentRound: number;
  isActive: boolean;
  currentTurn: number;
  initiativeOrder: any[];
}) {
  return (
    <div className="flex items-center space-x-2">
      <Badge variant="secondary">Round {currentRound}</Badge>
      {isActive && (
        <Badge variant="outline">
          Turn {Math.min(currentTurn + 1, initiativeOrder.length)} of {initiativeOrder.length}
        </Badge>
      )}
    </div>
  );
}

// Toolbar action buttons component
function ToolbarActionButtons({ onExportInitiative, onShareInitiative, onEncounterSettings }: {
  onExportInitiative?: () => void;
  onShareInitiative?: () => void;
  onEncounterSettings?: () => void;
}) {
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={onExportInitiative}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Download initiative data"
      >
        <Download className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onShareInitiative}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Share initiative data"
      >
        <Share2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onEncounterSettings}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Combat Settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </>
  );
}

export function CombatToolbar({
  encounter,
  combatActions = {},
  initiativeActions = {},
  quickActions = {},
  settings = {},
}: CombatToolbarProps) {
  const {
    showTimer = true,
    showQuickActions = true,
    enableKeyboardShortcuts = true,
    customActions = [],
  } = settings;

  const {
    onNextTurn,
    onPreviousTurn,
    onPauseCombat,
    onResumeCombat,
    onEndCombat,
    onExportInitiative,
    onShareInitiative,
  } = combatActions;

  const { onRollInitiative } = initiativeActions;

  const combatState = encounter?.combatState;
  const participants = encounter?.participants || [];
  const isActive = combatState?.isActive || false;
  const isPaused = Boolean(combatState?.pausedAt);
  const currentRound = combatState?.currentRound || 0;
  const currentTurn = combatState?.currentTurn || 0;
  const initiativeOrder = combatState?.initiativeOrder || [];
  const canGoPrevious = !(currentRound === 1 && currentTurn === 0);

  const timerData = useCombatTimer({
    startedAt: combatState?.startedAt,
    pausedAt: combatState?.pausedAt,
    isActive,
    roundTimeLimit: encounter?.settings?.roundTimeLimit,
  });

  const participantStats = {
    total: participants.length,
    pcs: participants.filter(p => p.isPlayer).length,
    npcs: participants.filter(p => !p.isPlayer).length,
  };

  const getActiveParticipantName = () => {
    if (!isActive || currentTurn >= initiativeOrder.length) return undefined;
    const currentParticipant = participants.find(p =>
      p.characterId.toString() === initiativeOrder[currentTurn]?.participantId.toString()
    );
    return currentParticipant?.name;
  };

  const getCombatPhase = () => {
    if (!isActive) return 'inactive';
    return isPaused ? 'paused' : 'active';
  };

  const activeParticipantName = getActiveParticipantName();
  const combatPhase = getCombatPhase();

  const isInputElement = (target: EventTarget | null) => {
    const element = target as Element;
    return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
  };

  const keyActions = useMemo(() => ({
    Space: () => onNextTurn?.(),
    Backspace: () => canGoPrevious && onPreviousTurn?.(),
    KeyP: () => isPaused ? onResumeCombat?.() : onPauseCombat?.(),
    KeyE: () => onEndCombat?.(),
  }), [onNextTurn, onPreviousTurn, onPauseCombat, onResumeCombat, onEndCombat, canGoPrevious, isPaused]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isInputElement(event.target)) return;

    const action = SecureKeyboardActionHandler.getKeyAction(keyActions, event.code);
    if (action) {
      event.preventDefault();
      action();
    }
  }, [keyActions]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, handleKeyDown]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2>
              <CardTitle className="text-lg">Initiative Tracker</CardTitle>
            </h2>
            <HeaderBadges
              currentRound={currentRound}
              isActive={isActive}
              currentTurn={currentTurn}
              initiativeOrder={initiativeOrder}
            />
          </div>
          <div className="flex items-center space-x-2">
            {/* Combat Timer */}
            {showTimer && isActive && (
              <CombatTimer
                formattedDuration={timerData.formattedDuration}
                hasRoundTimer={timerData.hasRoundTimer}
                formattedRoundTime={timerData.formattedRoundTime}
                isRoundWarning={timerData.isRoundWarning}
                isRoundCritical={timerData.isRoundCritical}
                isPaused={timerData.isPaused}
              />
            )}
            <ToolbarActionButtons
              onExportInitiative={onExportInitiative}
              onShareInitiative={onShareInitiative}
              onEncounterSettings={quickActions.onEncounterSettings}
            />
          </div>
        </div>

        {/* Status Display */}
        <CombatStatus
          participantStats={participantStats}
          activeParticipantName={activeParticipantName}
          combatPhase={combatPhase}
        />
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Essential Controls */}
        <CombatControlsSection
          actions={{
            onNextTurn,
            onPreviousTurn,
            onPauseCombat,
            onResumeCombat,
            onEndCombat,
          }}
          state={{
            canGoPrevious,
            isPaused,
            enableKeyboardShortcuts,
          }}
        />

        {/* Quick Actions */}
        {showQuickActions && (
          <>
            <Separator />
            <QuickActions
              actions={{
                onRollInitiative,
                ...quickActions,
              }}
              disabled={!isActive}
              participantCount={participantStats.total}
              settings={{
                showRollInitiative: true,
                showMassActions: true,
                showParticipantManagement: true,
                showSettings: false, // Settings already in header
                customActions,
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}