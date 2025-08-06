import React from 'react';
import type { Character } from '@/lib/validations/character';
import { SectionCard } from './components/SectionCard';

interface CharacterNotesProps {
  character: Character;
}

const NoteSection = ({ title, content }: { title: string; content: string }) => (
  <SectionCard title={title}>
    <div className="whitespace-pre-wrap">{content}</div>
  </SectionCard>
);

export function CharacterNotes({ character }: CharacterNotesProps) {
  const hasNotes = character.notes || character.backstory;

  if (!hasNotes) {
    return <p className="text-muted-foreground">No notes or backstory recorded.</p>;
  }

  return (
    <div className="space-y-6">
      {character.notes && <NoteSection title="Notes" content={character.notes} />}
      {character.backstory && <NoteSection title="Backstory" content={character.backstory} />}
    </div>
  );
}