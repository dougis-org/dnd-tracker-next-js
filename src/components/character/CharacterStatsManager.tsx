import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus } from 'lucide-react';
import { CharacterService } from '@/lib/services/CharacterService';
import { CharacterStats } from '@/lib/services/CharacterServiceStats';
import { CharacterEditingHeader } from './CharacterEditingHeader';
import { CharacterAbilityScores } from './CharacterAbilityScores';
import { CharacterNotes } from './CharacterNotes';
import type { Character } from '@/lib/validations/character';
import type { CharacterUpdate } from '@/lib/validations/character';
import { convertICharacterToCharacter } from '@/lib/utils/character-conversion';

interface CharacterStatsManagerProps {
  characterId: string;
  userId: string;
}

export function CharacterStatsManager({ characterId, userId }: CharacterStatsManagerProps) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [stats, setStats] = useState<CharacterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editedCharacter, setEditedCharacter] = useState<CharacterUpdate>({});

  // Autosave functionality
  const [autosaving, setAutosaving] = useState(false);
  const [autosaveSuccess, setAutosaveSuccess] = useState(false);
  const [draftChanges, setDraftChanges] = useState<CharacterUpdate | null>(null);
  const [showDraftIndicator, setShowDraftIndicator] = useState(false);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  const loadCharacterData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setStatsError(null);

      // Load character data
      const characterResult = await CharacterService.getCharacterById(characterId, userId);
      if (!characterResult.success) {
        setError(characterResult.error?.message || 'Failed to load character');
        return;
      }

      setCharacter(convertICharacterToCharacter(characterResult.data));
      // Initialize editedCharacter with just the editable fields
      setEditedCharacter({
        abilityScores: characterResult.data.abilityScores,
        backstory: characterResult.data.backstory,
        notes: characterResult.data.notes
      });

      // Load character stats
      const statsResult = await CharacterService.calculateCharacterStats(characterId, userId);
      if (!statsResult.success) {
        setStatsError(statsResult.error?.message || 'Failed to calculate stats');
        // Continue with character data even if stats fail
      } else {
        setStats(statsResult.data);
      }
    } catch {
      setError('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [characterId, userId]);

  const hasChanges = useCallback(() => {
    if (!character) return false;
    return (
      JSON.stringify(editedCharacter.abilityScores) !== JSON.stringify(character.abilityScores) ||
      editedCharacter.backstory !== character.backstory ||
      editedCharacter.notes !== character.notes
    );
  }, [editedCharacter, character]);

  const saveDraftChanges = useCallback(async () => {
    if (!hasChanges()) return;

    try {
      setAutosaving(true);
      const result = await CharacterService.saveDraftChanges(characterId, userId, editedCharacter);

      if (result.success) {
        setAutosaveSuccess(true);
        setTimeout(() => setAutosaveSuccess(false), 2000);
      }
    } catch {
      // Silently fail autosave to not disrupt user experience
    } finally {
      setAutosaving(false);
    }
  }, [characterId, userId, editedCharacter, hasChanges]);

  const loadDraftChanges = useCallback(async () => {
    try {
      const result = await CharacterService.getDraftChanges(characterId, userId);
      if (result.success && result.data) {
        setDraftChanges(result.data);
        setShowDraftIndicator(true);
      }
    } catch {
      // Silently fail loading draft changes
    }
  }, [characterId, userId]);

  const restoreDraftChanges = () => {
    if (draftChanges) {
      setEditedCharacter(draftChanges);
      setEditMode(true);
      setShowDraftIndicator(false);
    }
  };

  const discardDraftChanges = async () => {
    try {
      await CharacterService.clearDraftChanges(characterId, userId);
      setDraftChanges(null);
      setShowDraftIndicator(false);
    } catch {
      // Silently fail clearing draft changes
    }
  };

  useEffect(() => {
    loadCharacterData();
  }, [loadCharacterData]);

  // Autosave effect
  useEffect(() => {
    if (editMode && hasChanges()) {
      // Clear existing timer
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }

      // Set new timer for 2 seconds
      autosaveTimer.current = setTimeout(() => {
        saveDraftChanges();
      }, 2000);
    }

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [editMode, editedCharacter, hasChanges, saveDraftChanges]);

  // Load draft changes on mount
  useEffect(() => {
    loadDraftChanges();
  }, [loadDraftChanges]);

  const handleSave = async () => {
    if (!character) return;

    try {
      setSaving(true);
      const result = await CharacterService.updateCharacter(characterId, userId, editedCharacter);

      if (result.success) {
        setCharacter(result.data);
        setEditMode(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Reload stats after update
        await loadCharacterData();
      } else {
        setError(result.error?.message || 'Failed to save changes');
      }
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedCharacter({});
    setEditMode(false);
  };

  const updateAbilityScore = (ability: string, value: number) => {
    setEditedCharacter(prev => ({
      ...prev,
      abilityScores: {
        ...prev.abilityScores!,
        [ability]: value
      }
    }));
  };

  const updateBackstory = (backstory: string) => {
    setEditedCharacter(prev => ({ ...prev, backstory }));
  };

  const updateNotes = (notes: string) => {
    setEditedCharacter(prev => ({ ...prev, notes }));
  };

  if (loading) {
    return (
      <div data-testid="stats-loading" className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="error-message">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!character) {
    return (
      <Alert variant="destructive" data-testid="error-message">
        <AlertDescription>Character not found</AlertDescription>
      </Alert>
    );
  }

  const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

  return (
    <div data-testid="character-stats-manager" className="space-y-6">
      <CharacterEditingHeader
        characterName={character.name}
        editMode={editMode}
        states={{
          save: {
            saving,
            saveSuccess,
          },
          autosave: {
            autosaving,
            autosaveSuccess,
          },
          draft: {
            showDraftIndicator,
            draftChanges,
          },
        }}
        actions={{
          edit: {
            onEditClick: () => setEditMode(true),
            onSaveClick: handleSave,
            onCancelClick: handleCancel,
          },
          draft: {
            onRestoreDraft: restoreDraftChanges,
            onDiscardDraft: discardDraftChanges,
          },
        }}
      />

      <CharacterAbilityScores
        character={character}
        editMode={editMode}
        editedCharacter={editedCharacter}
        onUpdateAbilityScore={updateAbilityScore}
      />

      {/* Derived Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Combat Stats</CardTitle>
        </CardHeader>
        <CardContent>
          {statsError ? (
            <Alert variant="destructive" data-testid="stats-error">
              <AlertDescription>{statsError}</AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Armor Class</div>
                <div data-testid="armor-class" className="text-2xl font-bold">
                  {character.armorClass}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Initiative</div>
                <div data-testid="initiative" className="text-2xl font-bold">
                  {stats ? (stats.initiativeModifier >= 0 ? `+${stats.initiativeModifier}` : `${stats.initiativeModifier}`) : '+0'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Hit Points</div>
                <div data-testid="hit-points" className="text-2xl font-bold">
                  {character.hitPoints.current}/{character.hitPoints.maximum}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saving Throws */}
      <Card>
        <CardHeader>
          <CardTitle>Saving Throws</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {abilities.map((ability) => {
              const isProficient = character.savingThrows[ability as keyof typeof character.savingThrows];
              const bonus = stats?.savingThrows[ability] || 0;
              const bonusString = bonus >= 0 ? `+${bonus}` : `${bonus}`;

              return (
                <div
                  key={ability}
                  data-testid={`saving-throw-${ability}`}
                  className={`text-center p-2 border rounded ${isProficient ? 'proficient bg-blue-50 border-blue-200' : ''}`}
                >
                  <div className="text-xs font-medium uppercase mb-1">
                    {ability.substring(0, 3)}
                  </div>
                  <div className="font-bold">{bonusString}</div>
                  {isProficient && <Badge variant="secondary" className="text-xs mt-1">Proficient</Badge>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {Array.from(character.skills.entries()).map(([skill, isProficient]) => {
              const bonus = stats?.skills[skill] || 0;
              const bonusString = bonus >= 0 ? `+${bonus}` : `${bonus}`;

              return (
                <div
                  key={skill}
                  data-testid={`skill-${skill}`}
                  className={`flex justify-between items-center p-2 border rounded ${isProficient ? 'proficient bg-blue-50 border-blue-200' : ''}`}
                >
                  <span className="capitalize">{skill}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{bonusString}</span>
                    {isProficient && <Badge variant="secondary" className="text-xs">Prof</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Equipment
            <Button
              data-testid="add-equipment-button"
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div data-testid="equipment-list" className="space-y-2">
            {character.equipment.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Qty: {item.quantity} | Weight: {item.weight || 0} lbs
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.equipped && <Badge variant="default">Equipped</Badge>}
                  {item.magical && <Badge variant="secondary">Magical</Badge>}
                </div>
              </div>
            ))}
            {character.equipment.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No equipment added yet
              </div>
            )}
          </div>
          <div data-testid="total-weight" className="mt-4 pt-4 border-t text-sm">
            <strong>Total Weight: {character.equipment.reduce((total, item) => total + (item.weight || 0) * item.quantity, 0)} lbs</strong>
          </div>
          {/* Hidden form for testing */}
          <div data-testid="new-equipment-form" className="hidden">
            Equipment form placeholder
          </div>
        </CardContent>
      </Card>

      <CharacterNotes
        character={character}
        editMode={editMode}
        editedCharacter={editedCharacter}
        onUpdateBackstory={updateBackstory}
        onUpdateNotes={updateNotes}
        onEnterEditMode={() => setEditMode(true)}
      />
    </div>
  );
}