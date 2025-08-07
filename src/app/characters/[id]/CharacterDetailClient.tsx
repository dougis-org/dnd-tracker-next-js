'use client';

import { useRouter } from 'next/navigation';
import type { Character } from '@/lib/validations/character';
import CharacterDetailView from '@/components/characters/CharacterDetailView';
import { BackButton, LoadingState, ErrorState, NotFoundState } from './components/CharacterStates';
import { useCharacterData } from './hooks/useCharacterData';

interface CharacterDetailClientProps {
  id: string;
}

export function CharacterDetailClient({ id }: CharacterDetailClientProps) {
  const router = useRouter();
  const { character, loading, error } = useCharacterData(id);

  const handleEdit = (character: Character) => {
    if (!character._id) return;
    router.push(`/characters/${character._id.toString()}/edit` as any);
  };

  const handleShare = async (character: Character) => {
    if (!character._id) return;
    try {
      // Create shareable URL
      const shareUrl = `${window.location.origin}/characters/${character._id}`;

      // Try to use the native Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `${character.name} - D&D Character`,
          text: `Check out my D&D character: ${character.name}`,
          url: shareUrl,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        // You could add a toast notification here
        alert('Character link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing character:', error);
      // Fallback: just show the URL
      prompt('Share this character link:', `${window.location.origin}/characters/${character._id}`);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) return <LoadingState onBack={handleBack} />;
  if (error) return <ErrorState error={error} onBack={handleBack} />;
  if (!character) return <NotFoundState onBack={handleBack} />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <BackButton onClick={handleBack} />
        <CharacterDetailView
          character={character}
          onEdit={handleEdit}
          onShare={handleShare}
        />
      </div>
    </div>
  );
}