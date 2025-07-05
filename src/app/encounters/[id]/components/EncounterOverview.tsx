import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BasicInfoGrid } from './overview/BasicInfoGrid';
import { TagsDisplay } from './overview/TagsDisplay';
import { DescriptionDisplay } from './overview/DescriptionDisplay';
import type { IEncounter } from '@/lib/models/encounter/interfaces';

interface EncounterOverviewProps {
  encounter: IEncounter;
}

/**
 * Display basic encounter information and metadata
 */
export function EncounterOverview({ encounter }: EncounterOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Encounter Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <BasicInfoGrid encounter={encounter} />
        <TagsDisplay tags={encounter.tags} />
        <DescriptionDisplay description={encounter.description} />
      </CardContent>
    </Card>
  );
}