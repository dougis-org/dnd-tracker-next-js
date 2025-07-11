'use client';

import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { characterCreationSchema, CharacterCreation } from '@/lib/validations/character';
import { useFormValidation } from '@/lib/validations/form-integration';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { BasicInfoValidationSection } from '@/components/forms/character/sections/BasicInfoValidationSection';
import { AbilityScoresValidationSection } from '@/components/forms/character/sections/AbilityScoresValidationSection';
import { ClassesValidationSection } from '@/components/forms/character/sections/ClassesValidationSection';
import { CombatStatsValidationSection } from '@/components/forms/character/sections/CombatStatsValidationSection';
import type { ICharacter } from '@/lib/models/Character';

interface FormError {
  message: string;
  details?: string;
}

function ErrorAlert({ error }: { error: FormError }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {error.message}
        {error.details && (
          <div className="text-xs mt-1">
            Details: {error.details}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg text-destructive mb-2">{error}</div>
            <Button onClick={onBack}>Go Back</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormActions({
  onCancel,
  onSubmit,
  isSubmitting,
  isValid
}: {
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isValid: boolean;
}) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-6 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
        className="mb-2 sm:mb-0"
      >
        Cancel
      </Button>
      <Button
        type="button"
        onClick={onSubmit}
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? 'Updating...' : 'Update Character'}
      </Button>
    </div>
  );
}

function transformCharacterToFormData(character: ICharacter): CharacterCreation {
  return {
    name: character.name,
    type: character.type,
    race: character.race as any, // Type assertion needed for DB vs validation schema mismatch
    customRace: character.customRace,
    size: character.size,
    classes: character.classes.map(cls => ({
      class: cls.class as any, // Type assertion needed for DB vs validation schema mismatch
      level: cls.level,
      hitDie: cls.hitDie,
      subclass: cls.subclass,
    })),
    abilityScores: character.abilityScores,
    hitPoints: character.hitPoints,
    armorClass: character.armorClass,
    speed: character.speed,
    proficiencyBonus: character.proficiencyBonus,
    savingThrows: character.savingThrows,
    skills: character.skills instanceof Map ? Object.fromEntries(character.skills) : character.skills || {},
    equipment: character.equipment || [],
    spells: (character.spells || []).map(spell => ({
      ...spell,
      prepared: spell.isPrepared, // Map isPrepared to prepared for validation schema
      components: {
        verbal: spell.components?.includes('V') || false,
        somatic: spell.components?.includes('S') || false,
        material: spell.components?.includes('M') || false,
        materialComponent: spell.components,
      },
      school: spell.school as any, // Type assertion needed for DB vs validation schema mismatch
    })),
    backstory: character.backstory,
    notes: character.notes,
    imageUrl: character.imageUrl,
  };
}

export default function CharacterEditPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const characterId = params?.id as string;

  const [character, setCharacter] = useState<ICharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<FormError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resolver } = useFormValidation(characterCreationSchema);

  const form = useForm<CharacterCreation>({
    resolver,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (!characterId || !session?.user?.id) return;

    const fetchCharacter = async () => {
      try {
        const response = await fetch(`/api/characters/${characterId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch character');
        }

        if (!data.character) {
          throw new Error('Character not found');
        }

        const characterData = data.character;
        setCharacter(characterData);

        // Populate form with character data
        const formData = transformCharacterToFormData(characterData);
        form.reset(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load character');
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [characterId, session?.user?.id, form]);

  const handleCancel = () => {
    router.push(`/characters/${characterId}`);
  };

  const handleBack = () => {
    router.push(`/characters/${characterId}`);
  };

  const onSubmit = async (data: CharacterCreation) => {
    if (!characterId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/characters/${characterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update character');
      }

      // Redirect to character detail page on success
      router.push(`/characters/${characterId}`);
    } catch (err) {
      setSubmitError({
        message: err instanceof Error ? err.message : 'Failed to update character',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = () => {
    form.handleSubmit(onSubmit)();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onBack={handleBack} />;
  if (!character) return <ErrorState error="Character not found" onBack={handleBack} />;

  const isFormValid = form.formState.isValid;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={handleBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Character
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Character</h1>
            <p className="text-muted-foreground">
              Update your character&apos;s information
            </p>
          </div>

          <Form {...form}>
            <div className="space-y-6">
              {submitError && <ErrorAlert error={submitError} />}

              <div className="space-y-6">
                <BasicInfoValidationSection form={form} />
                <AbilityScoresValidationSection form={form} />
                <ClassesValidationSection form={form} />
                <CombatStatsValidationSection form={form} />
              </div>
            </div>
          </Form>

          <FormActions
            onCancel={handleCancel}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
            isValid={isFormValid}
          />
        </div>
      </div>
    </div>
  );
}