'use client';

import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { UpdateEncounter } from '@/lib/validations/encounter';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

interface BasicInfoSectionProps {
  form: UseFormReturn<UpdateEncounter>;
}

const difficultyOptions = [
  { value: 'trivial', label: 'Trivial' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'deadly', label: 'Deadly' },
] as const;

export function BasicInfoSection({ form }: BasicInfoSectionProps) {
  const [newTag, setNewTag] = useState('');
  const { control, watch, setValue } = form;
  const tags = watch('tags') || [];

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) {
      const updatedTags = [...tags, newTag.trim().toLowerCase()];
      setValue('tags', updatedTags, { shouldDirty: true });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setValue('tags', updatedTags, { shouldDirty: true });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Encounter Name */}
      <div className="md:col-span-2">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="encounter-name">Encounter Name</FormLabel>
              <FormControl>
                <Input
                  id="encounter-name"
                  placeholder="Enter encounter name..."
                  {...field}
                  className="text-lg"
                  aria-describedby="encounter-name-error"
                />
              </FormControl>
              <FormMessage id="encounter-name-error" />
            </FormItem>
          )}
        />
      </div>

      {/* Description */}
      <div className="md:col-span-2">
        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="encounter-description">Description</FormLabel>
              <FormControl>
                <Textarea
                  id="encounter-description"
                  placeholder="Describe the encounter scenario, setting, and objectives..."
                  className="min-h-[100px] resize-y"
                  {...field}
                  aria-describedby="encounter-description-error"
                />
              </FormControl>
              <FormMessage id="encounter-description-error" />
            </FormItem>
          )}
        />
      </div>

      {/* Difficulty */}
      <FormField
        control={control}
        name="difficulty"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="encounter-difficulty">Difficulty</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              aria-describedby="encounter-difficulty-error"
            >
              <FormControl>
                <SelectTrigger id="encounter-difficulty">
                  <SelectValue placeholder="Select difficulty..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {difficultyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage id="encounter-difficulty-error" />
          </FormItem>
        )}
      />

      {/* Target Level */}
      <FormField
        control={control}
        name="targetLevel"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="target-level">Target Level</FormLabel>
            <FormControl>
              <Input
                id="target-level"
                type="number"
                placeholder="1-20"
                {...field}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  field.onChange(value);
                }}
                aria-describedby="target-level-error"
              />
            </FormControl>
            <FormMessage id="target-level-error" />
          </FormItem>
        )}
      />

      {/* Estimated Duration */}
      <FormField
        control={control}
        name="estimatedDuration"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="estimated-duration">Estimated Duration (minutes)</FormLabel>
            <FormControl>
              <Input
                id="estimated-duration"
                type="number"
                placeholder="60"
                {...field}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  field.onChange(value);
                }}
                aria-describedby="estimated-duration-error"
              />
            </FormControl>
            <FormMessage id="estimated-duration-error" />
          </FormItem>
        )}
      />

      {/* Tags */}
      <div className="md:col-span-2">
        <FormField
          control={control}
          name="tags"
          render={() => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <div className="space-y-3">
                {/* Existing Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center space-x-1 px-2 py-1"
                      >
                        <span>{tag}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1 hover:bg-transparent"
                          onClick={() => handleRemoveTag(tag)}
                          aria-label={`Remove tag ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add New Tag */}
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    aria-label="New tag input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTag}
                    disabled={!newTag.trim() || tags.includes(newTag.trim().toLowerCase())}
                    className="flex items-center space-x-1"
                    aria-label="Add tag"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}