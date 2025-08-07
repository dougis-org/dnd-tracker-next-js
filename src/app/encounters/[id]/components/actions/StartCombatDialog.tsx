import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Encounter } from '@/lib/validations/encounter';

interface StartCombatDialogProps {
  open: boolean;
  encounter: Encounter;
  onConfirm: () => void;
  onCancel: () => void;
}

interface SettingDisplayProps {
  label: string;
  value: string | number;
}

/**
 * Display a single setting in the combat dialog
 */
function SettingDisplay({ label, value }: SettingDisplayProps) {
  return (
    <p className="text-sm">
      <strong>{label}:</strong> {value}
    </p>
  );
}

interface CombatSummaryProps {
  encounter: Encounter;
}

/**
 * Display combat settings summary
 */
function CombatSummary({ encounter }: CombatSummaryProps) {
  return (
    <div className="space-y-2">
      <SettingDisplay
        label="Participants"
        value={encounter.participants.length}
      />
      <SettingDisplay
        label="Auto-roll Initiative"
        value={encounter.settings.autoRollInitiative ? 'Yes' : 'No'}
      />
      <SettingDisplay
        label="Track Resources"
        value={encounter.settings.trackResources ? 'Yes' : 'No'}
      />
      {encounter.settings.enableLairActions && (
        <SettingDisplay
          label="Lair Actions"
          value={`Initiative ${encounter.settings.lairActionInitiative || 20}`}
        />
      )}
    </div>
  );
}

/**
 * Confirmation dialog for starting combat
 */
export function StartCombatDialog({ open, encounter, onConfirm, onCancel }: StartCombatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Combat Session?</DialogTitle>
          <DialogDescription>
            This will initialize combat and roll initiative for all participants.
            {encounter.settings.autoRollInitiative && ' Initiative will be rolled automatically.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <CombatSummary encounter={encounter} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Start Combat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}