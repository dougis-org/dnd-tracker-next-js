import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import type { Character } from '@/lib/validations/character';

export const useCharacterData = (id: string) => {
  const { user } = useUser();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user?.id) {
      setLoading(false);
      return;
    }

    const fetchCharacter = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/characters/${id}`, {
          headers: {
            'x-user-id': user.id,
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setCharacter(data.data);
        } else {
          setError(data.error || 'Character not found');
        }
      } catch (err) {
        console.error('Error fetching character:', err);
        setError(err instanceof Error ? err.message : 'Character not found');
      }

      setLoading(false);
    };

    fetchCharacter();
  }, [id, user?.id]);

  return { character, loading, error };
};