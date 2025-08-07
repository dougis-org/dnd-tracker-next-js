import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEncounterSettings } from '@/lib/hooks/useEncounterSettings';
import type { Encounter } from '@/lib/validations/encounter';

interface SettingRowProps {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (_checked: boolean) => void;
}

/**
 * Reusable setting row component for encounter settings
 */
function SettingRow({ id, label, checked, disabled, onChange }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string | number;
  suffix?: string;
}

/**
 * Reusable info display row
 */
function InfoRow({ label, value, suffix = '' }: InfoRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="text-sm">{value}{suffix}</span>
    </div>
  );
}

interface EncounterSettingsProps {
  encounter: Encounter;
}

/**
 * Display and allow editing of encounter settings and configuration
 */
export function EncounterSettings({ encounter }: EncounterSettingsProps) {
  const settings = encounter.settings;
  const { loading, error, updateSettings, retry } = useEncounterSettings(encounter._id?.toString() || '');

  const handleSettingChange = (key: string, value: boolean) => {
    updateSettings({ [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Encounter Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={retry}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Combat Settings */}
        <div className="space-y-3">
          <SettingRow
            id="auto-roll-initiative"
            label="Auto-roll Initiative"
            checked={settings.autoRollInitiative}
            disabled={loading}
            onChange={(checked) => handleSettingChange('autoRollInitiative', checked)}
          />

          <SettingRow
            id="track-resources"
            label="Track Resources"
            checked={settings.trackResources}
            disabled={loading}
            onChange={(checked) => handleSettingChange('trackResources', checked)}
          />

          <SettingRow
            id="enable-lair-actions"
            label="Enable Lair Actions"
            checked={settings.enableLairActions}
            disabled={loading}
            onChange={(checked) => handleSettingChange('enableLairActions', checked)}
          />

          <SettingRow
            id="player-visibility"
            label="Allow Player Visibility"
            checked={settings.allowPlayerVisibility}
            disabled={loading}
            onChange={(checked) => handleSettingChange('allowPlayerVisibility', checked)}
          />

          <SettingRow
            id="grid-movement"
            label="Enable Grid Movement"
            checked={settings.enableGridMovement}
            disabled={loading}
            onChange={(checked) => handleSettingChange('enableGridMovement', checked)}
          />
        </div>

        {/* Additional Settings Information */}
        <div className="pt-3 border-t space-y-2">
          {settings.gridSize && (
            <InfoRow label="Grid Size" value={settings.gridSize} suffix=" ft" />
          )}

          {settings.lairActionInitiative && (
            <InfoRow label="Lair Action Initiative" value={settings.lairActionInitiative} />
          )}

          {settings.roundTimeLimit && (
            <InfoRow label="Round Time Limit" value={settings.roundTimeLimit} suffix="s" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}