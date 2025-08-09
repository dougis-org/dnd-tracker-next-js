'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, User, Shield, Heart, AlertCircle } from 'lucide-react';
import { CharacterServiceClient } from '@/lib/services/CharacterServiceClient';
import type { Character } from '@/lib/validations/character';

interface CharacterLibraryInterfaceProps {
  onImportCharacters: (_characters: Character[]) => void;
  isLoading: boolean;
  userId: string;
}

interface CharacterFilters {
  search: string;
  type: string;
  class: string;
  race: string;
}

export function CharacterLibraryInterface({
  onImportCharacters,
  isLoading,
  userId,
}: CharacterLibraryInterfaceProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [filters, setFilters] = useState<CharacterFilters>({
    search: '',
    type: 'all',
    class: 'all',
    race: 'all',
  });
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'searching' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadCharacters = useCallback(async () => {
    setLoadingState('loading');
    setError(null);

    try {
      const result = await CharacterServiceClient.getCharactersByOwner(userId, 1, 20);

      if (result.success) {
        setCharacters(result.data.items);
      } else {
        setError(String(result.error) || 'Failed to load characters');
      }
    } catch {
      setError('Error loading characters');
    } finally {
      setLoadingState('idle');
    }
  }, [userId]);

  const handleSearch = useCallback(async () => {
    if (!filters.search.trim()) return;

    setLoadingState('searching');
    setError(null);

    try {
      const result = await CharacterServiceClient.searchCharacters(filters.search, userId);

      if (result.success) {
        setCharacters(result.data);
      } else {
        setError(String(result.error) || 'Search failed');
      }
    } catch {
      setError('Error searching characters');
    } finally {
      setLoadingState('idle');
    }
  }, [filters.search, userId]);

  const handleFilter = useCallback(async () => {
    setLoadingState('loading');
    setError(null);

    try {
      let result;

      if (filters.type !== 'all') {
        result = await CharacterServiceClient.getCharactersByType(filters.type as any, userId);
      } else if (filters.class !== 'all') {
        result = await CharacterServiceClient.getCharactersByClass(filters.class as any, userId);
      } else if (filters.race !== 'all') {
        result = await CharacterServiceClient.getCharactersByRace(filters.race as any, userId);
      } else {
        result = await CharacterServiceClient.getCharactersByOwner(userId, 1, 20);
      }

      if (result.success) {
        const data = 'items' in result.data ? result.data.items : result.data;
        setCharacters(data);
      } else {
        setError(String(result.error) || 'Filter failed');
      }
    } catch {
      setError('Error filtering characters');
    } finally {
      setLoadingState('idle');
    }
  }, [filters.type, filters.class, filters.race, userId]);

  // Load characters on mount
  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.search.trim()) {
        handleSearch();
      } else {
        loadCharacters();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters.search, handleSearch, loadCharacters]);

  // Handle filter changes
  useEffect(() => {
    if (filters.type !== 'all' || filters.class !== 'all' || filters.race !== 'all') {
      handleFilter();
    } else if (!filters.search.trim()) {
      loadCharacters();
    }
  }, [filters.type, filters.class, filters.race, filters.search, handleFilter, loadCharacters]);

  const handleCharacterSelect = (character: Character) => {
    if (!character._id) {
      return; // Do not allow selecting characters without an ID
    }
    setSelectedCharacters(prev =>
      prev.find(c => c._id === character._id)
        ? prev.filter(c => c._id !== character._id)
        : [...prev, character]
    );
  };

  const handleSelectAll = () => {
    const selectableCharacters = characters.filter(c => c._id);
    if (selectedCharacters.length === selectableCharacters.length) {
      setSelectedCharacters([]);
    } else {
      setSelectedCharacters([...selectableCharacters]);
    }
  };

  const handleImport = () => {
    onImportCharacters(selectedCharacters);
  };

  const isCharacterSelected = (character: Character) =>
    selectedCharacters.some(c => c._id === character._id);

  const getCharacterClassDisplay = (character: Character): string => {
    if (character.classes.length === 1) {
      return character.classes[0].class;
    }
    return character.classes.map(c => c.class).join('/');
  };

  const getCharacterLevelDisplay = (character: Character): string => {
    const totalLevel = character.classes.reduce((sum, c) => sum + c.level, 0);
    return `Level ${totalLevel}`;
  };

  if (loadingState === 'loading' && characters.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading characters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">Error loading characters</p>
          <p className="text-xs text-gray-500 mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadCharacters}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No characters found</p>
          <p className="text-xs text-gray-400 mt-1">
            Create your first character to import into encounters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search characters..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="type-filter" className="text-xs text-gray-500">Type</Label>
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger id="type-filter" className="h-8">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pc">PC</SelectItem>
                <SelectItem value="npc">NPC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="class-filter" className="text-xs text-gray-500">Class</Label>
            <Select value={filters.class} onValueChange={(value) => setFilters(prev => ({ ...prev, class: value }))}>
              <SelectTrigger id="class-filter" className="h-8">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="fighter">Fighter</SelectItem>
                <SelectItem value="wizard">Wizard</SelectItem>
                <SelectItem value="rogue">Rogue</SelectItem>
                <SelectItem value="ranger">Ranger</SelectItem>
                <SelectItem value="barbarian">Barbarian</SelectItem>
                <SelectItem value="paladin">Paladin</SelectItem>
                <SelectItem value="cleric">Cleric</SelectItem>
                <SelectItem value="druid">Druid</SelectItem>
                <SelectItem value="bard">Bard</SelectItem>
                <SelectItem value="sorcerer">Sorcerer</SelectItem>
                <SelectItem value="warlock">Warlock</SelectItem>
                <SelectItem value="monk">Monk</SelectItem>
                <SelectItem value="artificer">Artificer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="race-filter" className="text-xs text-gray-500">Race</Label>
            <Select value={filters.race} onValueChange={(value) => setFilters(prev => ({ ...prev, race: value }))}>
              <SelectTrigger id="race-filter" className="h-8">
                <SelectValue placeholder="Filter by race" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Races</SelectItem>
                <SelectItem value="human">Human</SelectItem>
                <SelectItem value="elf">Elf</SelectItem>
                <SelectItem value="dwarf">Dwarf</SelectItem>
                <SelectItem value="halfling">Halfling</SelectItem>
                <SelectItem value="dragonborn">Dragonborn</SelectItem>
                <SelectItem value="gnome">Gnome</SelectItem>
                <SelectItem value="half-elf">Half-Elf</SelectItem>
                <SelectItem value="half-orc">Half-Orc</SelectItem>
                <SelectItem value="tiefling">Tiefling</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bulk Selection */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectedCharacters.length === characters.filter(c => c._id).length}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="select-all" className="text-sm">
            Select all ({characters.filter(c => c._id).length})
          </Label>
        </div>

        <div className="text-sm text-gray-500">
          {selectedCharacters.length} selected
        </div>
      </div>

      {/* Character List */}
      <div className="max-h-96 overflow-y-auto">
        <div className="space-y-2">
          {characters.map((character) => (
            <Card key={character._id?.toString() || character.name} className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`character-${character._id?.toString() || character.name}`}
                    checked={isCharacterSelected(character)}
                    onCheckedChange={() => handleCharacterSelect(character)}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-sm truncate">{character.name}</h4>
                        <Badge variant={character.type === 'pc' ? 'default' : 'secondary'} className="text-xs">
                          {character.type.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Heart className="h-3 w-3" />
                          <span>HP: {character.hitPoints.maximum}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Shield className="h-3 w-3" />
                          <span>AC: {character.armorClass}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-gray-600">
                      {getCharacterLevelDisplay(character)} {character.race.charAt(0).toUpperCase() + character.race.slice(1)} {getCharacterClassDisplay(character)}
                    </div>

                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>STR: {character.abilityScores.strength}</span>
                      <span>DEX: {character.abilityScores.dexterity}</span>
                      <span>CON: {character.abilityScores.constitution}</span>
                      <span>INT: {character.abilityScores.intelligence}</span>
                      <span>WIS: {character.abilityScores.wisdom}</span>
                      <span>CHA: {character.abilityScores.charisma}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Import Actions */}
      <div className="pt-4 border-t">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {selectedCharacters.length} character{selectedCharacters.length !== 1 ? 's' : ''} selected
          </div>

          <Button
            onClick={handleImport}
            disabled={selectedCharacters.length === 0 || isLoading}
            className="min-w-32"
          >
            {isLoading ? 'Importing...' : `Import Selected (${selectedCharacters.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}