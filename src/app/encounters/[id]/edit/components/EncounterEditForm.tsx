'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateEncounter } from '@/lib/validations/encounter';
import { formEncounterSchema } from '../schemas/encounterEditSchema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Form } from '@/components/ui/form';
import { BasicInfoSection } from './BasicInfoSection';
import { ParticipantsSection } from './ParticipantsSection';
import { SettingsSection } from './SettingsSection';
import { Save, RotateCcw, X } from 'lucide-react';

// Helper component to reduce Card structure duplication
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <span>{title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
);

interface EncounterEditFormProps {
  encounter: UpdateEncounter;
  onSubmit: (_data: UpdateEncounter) => Promise<void>;
  onCancel: () => void;
  onReset: () => void;
  onChange?: () => void;
  isSubmitting: boolean;
}

export function EncounterEditForm({
  encounter,
  onSubmit,
  onCancel,
  onReset,
  onChange,
  isSubmitting,
}: EncounterEditFormProps) {
  const [isDirty, setIsDirty] = useState(false);

  const form = useForm<UpdateEncounter>({
    resolver: zodResolver(formEncounterSchema) as any,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      name: encounter.name,
      description: encounter.description,
      tags: encounter.tags,
      difficulty: encounter.difficulty,
      estimatedDuration: encounter.estimatedDuration,
      targetLevel: encounter.targetLevel,
      participants: encounter.participants,
      settings: encounter.settings,
    },
  });

  const {
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = form;

  // Watch for form changes

  useEffect(() => {
    const subscription = watch(() => {
      if (!isDirty) {
        setIsDirty(true);
        onChange?.();
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, isDirty, onChange]);

  const handleFormSubmit = async (data: UpdateEncounter) => {
    try {
      await onSubmit(data);
      setIsDirty(false);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Form submission error:', error);
    }
  };

  const handleReset = () => {
    reset(encounter);
    setIsDirty(false);
    onReset();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="space-y-6"
        role="form"
        aria-label="Edit encounter form"
      >
      {/* Basic Information Section */}
      <FormSection title="Basic Information">
        <BasicInfoSection form={form} />
      </FormSection>

      {/* Participants Section */}
      <FormSection title="Participants">
        <ParticipantsSection form={form} />
      </FormSection>

      {/* Settings Section */}
      <FormSection title="Combat Settings">
        <SettingsSection form={form} />
      </FormSection>

      {/* Form Actions */}
      <FormSection title="Form Actions">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting || !isDirty}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Encounter</span>
                </>
              )}
            </Button>
          </div>

          {/* Form Validation Summary */}
          {Object.keys(errors).length > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-md">
              <p className="text-sm text-destructive font-medium mb-2">
                Please fix the following errors:
              </p>
              <ul className="text-sm text-destructive space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field} className="list-disc list-inside">
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </FormSection>
      </form>
    </Form>
  );
}