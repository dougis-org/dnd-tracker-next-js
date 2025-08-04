import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import type { Character } from '@/lib/validations/character';

interface CharacterComparisonProps {
  originalCharacter: Character;
  updatedCharacter: Character;
  onAcceptChanges: () => void;
  onRejectChanges: () => void;
}

interface ChangeDetail {
  field: string;
  label: string;
  originalValue: any;
  updatedValue: any;
  hasChanged: boolean;
}

export function CharacterComparison({
  originalCharacter,
  updatedCharacter,
  onAcceptChanges,
  onRejectChanges
}: CharacterComparisonProps) {
  const changes = analyzeChanges(originalCharacter, updatedCharacter);
  const totalChanges = changes.filter(change => change.hasChanged).length;

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'None';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return String(value);
  };

  const _renderChangeRow = (change: ChangeDetail) => {
    if (!change.hasChanged) return null;

    return (
      <div key={change.field} data-testid={`${change.field}-change`} className="p-3 border rounded">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">{change.label}</span>
          <Badge variant="outline" className="text-xs">Changed</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center text-sm">
          <div className="text-muted-foreground">
            <div className="text-xs font-medium mb-1">Original</div>
            <div className="bg-red-50 border border-red-200 p-2 rounded">
              {formatValue(change.originalValue)}
            </div>
          </div>
          <div className="text-center">
            <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
          </div>
          <div className="text-muted-foreground">
            <div className="text-xs font-medium mb-1">Updated</div>
            <div className="bg-green-50 border border-green-200 p-2 rounded">
              {formatValue(change.updatedValue)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAbilityScoreChanges = () => {
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const changedAbilities = abilities.filter(ability => {
      const original = originalCharacter.abilityScores[ability as keyof typeof originalCharacter.abilityScores];
      const updated = updatedCharacter.abilityScores[ability as keyof typeof updatedCharacter.abilityScores];
      return original !== updated;
    });

    if (changedAbilities.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ability Score Changes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {changedAbilities.map(ability => {
            const original = originalCharacter.abilityScores[ability as keyof typeof originalCharacter.abilityScores];
            const updated = updatedCharacter.abilityScores[ability as keyof typeof updatedCharacter.abilityScores];

            return (
              <div key={ability} data-testid={`${ability}-change`} className="flex items-center justify-between p-2 border rounded">
                <span className="capitalize font-medium">{ability}</span>
                <div className="flex items-center gap-2">
                  <span className="text-red-600">{original}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-green-600">{updated}</span>
                  <Badge variant="secondary" className="text-xs ml-2">
                    {updated > original ? `+${updated - original}` : `${updated - original}`}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const renderDerivedStatsChanges = () => {
    const derivedChanges = [];

    if (originalCharacter.hitPoints.maximum !== updatedCharacter.hitPoints.maximum) {
      derivedChanges.push({
        label: 'Hit Points',
        testId: 'hp-change',
        original: originalCharacter.hitPoints.maximum,
        updated: updatedCharacter.hitPoints.maximum
      });
    }

    if (originalCharacter.armorClass !== updatedCharacter.armorClass) {
      derivedChanges.push({
        label: 'Armor Class',
        testId: 'ac-change',
        original: originalCharacter.armorClass,
        updated: updatedCharacter.armorClass
      });
    }

    if (derivedChanges.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Combat Stats Changes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {derivedChanges.map(change => (
            <div key={change.testId} data-testid={change.testId} className="flex items-center justify-between p-2 border rounded">
              <span className="font-medium">{change.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-red-600">{change.original}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-green-600">{change.updated}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  if (totalChanges === 0) {
    return (
      <div data-testid="character-comparison" className="space-y-6">
        <div data-testid="no-changes-message" className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No changes detected</h3>
          <p className="text-muted-foreground">The character is identical to the original version.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="character-comparison" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Character Comparison</h2>
          <div data-testid="changes-summary" className="text-muted-foreground">
            {totalChanges} changes detected
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            data-testid="reject-changes-button"
            variant="outline"
            onClick={onRejectChanges}
            className="flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            Reject Changes
          </Button>
          <Button
            data-testid="accept-changes-button"
            onClick={onAcceptChanges}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Accept Changes
          </Button>
        </div>
      </div>

      {/* Character Names */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Character Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Original</div>
              <div data-testid="original-name" className="font-medium">{originalCharacter.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Updated</div>
              <div data-testid="updated-name" className="font-medium">{updatedCharacter.name}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ability Score Changes */}
      {renderAbilityScoreChanges()}

      {/* Derived Stats Changes */}
      {renderDerivedStatsChanges()}

      {/* Backstory Changes */}
      {originalCharacter.backstory !== updatedCharacter.backstory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Backstory Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid="backstory-change" className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Original</div>
                <div className="bg-red-50 border border-red-200 p-3 rounded">
                  {originalCharacter.backstory || 'No backstory'}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground mb-1">Updated</div>
                <div className="bg-green-50 border border-green-200 p-3 rounded">
                  {updatedCharacter.backstory || 'No backstory'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes Changes */}
      {originalCharacter.notes !== updatedCharacter.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid="notes-change" className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Original</div>
                <div className="bg-red-50 border border-red-200 p-3 rounded">
                  {originalCharacter.notes || 'No notes'}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground mb-1">Updated</div>
                <div className="bg-green-50 border border-green-200 p-3 rounded">
                  {updatedCharacter.notes || 'No notes'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function analyzeChanges(original: Character, updated: Character): ChangeDetail[] {
  const changes: ChangeDetail[] = [];

  // Name
  changes.push({
    field: 'name',
    label: 'Name',
    originalValue: original.name,
    updatedValue: updated.name,
    hasChanged: original.name !== updated.name
  });

  // Ability Scores
  const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  abilities.forEach(ability => {
    const originalScore = original.abilityScores[ability as keyof typeof original.abilityScores];
    const updatedScore = updated.abilityScores[ability as keyof typeof updated.abilityScores];

    changes.push({
      field: ability,
      label: ability.charAt(0).toUpperCase() + ability.slice(1),
      originalValue: originalScore,
      updatedValue: updatedScore,
      hasChanged: originalScore !== updatedScore
    });
  });

  // Backstory
  changes.push({
    field: 'backstory',
    label: 'Backstory',
    originalValue: original.backstory,
    updatedValue: updated.backstory,
    hasChanged: original.backstory !== updated.backstory
  });

  // Notes
  changes.push({
    field: 'notes',
    label: 'Notes',
    originalValue: original.notes,
    updatedValue: updated.notes,
    hasChanged: original.notes !== updated.notes
  });

  // Hit Points
  changes.push({
    field: 'hitPoints',
    label: 'Hit Points',
    originalValue: original.hitPoints.maximum,
    updatedValue: updated.hitPoints.maximum,
    hasChanged: original.hitPoints.maximum !== updated.hitPoints.maximum
  });

  // Armor Class
  changes.push({
    field: 'armorClass',
    label: 'Armor Class',
    originalValue: original.armorClass,
    updatedValue: updated.armorClass,
    hasChanged: original.armorClass !== updated.armorClass
  });

  return changes;
}