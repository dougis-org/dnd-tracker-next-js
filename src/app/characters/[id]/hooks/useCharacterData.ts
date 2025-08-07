import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Character } from '@/lib/validations/character';

export const useCharacterData = (id: string) => {
  const { data: session } = useSession();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !session?.user?.id) {
      setLoading(false);
      return;
    }

    const fetchCharacter = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/characters/${id}`, {
          headers: {
            'x-user-id': session.user.id,
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
  }, [id, session?.user?.id]);

  return { character, loading, error };
};