import React from 'react';
import type { Character } from '@/lib/validations/character';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Share2, Heart, Shield, Zap } from 'lucide-react';

interface CharacterOverviewProps {
  character: Character;
  onEdit: (_character: Character) => void;
  onShare: (_character: Character) => void;
}

export function CharacterOverview({ character, onEdit, onShare }: CharacterOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Character Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{character.name}</h1>
          <p className="text-lg text-muted-foreground">
            {character.race} • Level {character.classes.reduce((total, cls) => total + cls.level, 0)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onEdit(character)} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Character
          </Button>
          <Button onClick={() => onShare(character)} variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Core Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Heart className="h-4 w-4 mr-2" />
              Hit Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {character.hitPoints.current} / {character.hitPoints.maximum}
            </div>
            {character.hitPoints.temporary > 0 && (
              <div className="text-sm text-muted-foreground">
                +{character.hitPoints.temporary} temp
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Armor Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{character.armorClass}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Speed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{character.speed} ft</div>
          </CardContent>
        </Card>
      </div>

      {/* Classes */}
      <Card>
        <CardHeader>
          <CardTitle>Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {character.classes.map((classInfo, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="font-medium">
                  {classInfo.class} ({classInfo.subclass}) - Level {classInfo.level}
                </span>
                <Badge variant="secondary">d{classInfo.hitDie}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Proficiency Bonus */}
      <Card>
        <CardHeader>
          <CardTitle>Proficiency Bonus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{character.proficiencyBonus}</div>
        </CardContent>
      </Card>
    </div>
  );
}