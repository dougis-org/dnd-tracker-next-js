'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { partyCreateSchema, type PartyCreate } from '@/lib/validations/party';

export interface PartyCreateFormProps {
  onSubmit: (_data: PartyCreate) => Promise<void> | void;
  isSubmitting?: boolean;
  defaultValues?: Partial<PartyCreate>;
}

export function PartyCreateForm({ onSubmit, isSubmitting = false, defaultValues }: PartyCreateFormProps) {
  const form = useForm<PartyCreate>({
    resolver: zodResolver(partyCreateSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      tags: [],
      isPublic: false,
      sharedWith: [],
      settings: {
        allowJoining: false,
        requireApproval: true,
        maxMembers: 6,
      },
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: PartyCreate) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const tagsValue = form.watch('tags');

  const handleTagsChange = (value: string) => {
    const tags = value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 10); // Max 10 tags as per validation
    form.setValue('tags', tags);
  };

  const SectionHeader = ({ title, description }: { title: string; description: string }) => (
    <div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );

  const SwitchField = ({ name, label, description }: { name: string; label: string; description: string }) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FormLabel className="text-base">{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" data-testid="party-create-form">
      {/* Basic Information */}
      <div className="space-y-4">
        <SectionHeader
          title="Basic Information"
          description="Set up the basic details for your new party."
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Party Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter party name..." maxLength={100} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your party, campaign setting, or goals..."
                  maxLength={1000}
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional description to help organize your campaigns.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={() => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., fantasy, homebrew, beginner-friendly"
                  value={tagsValue.join(', ')}
                  onChange={(e) => handleTagsChange(e.target.value)}
                />
              </FormControl>
              <FormDescription>
                Separate tags with commas. Maximum 10 tags, 50 characters each.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />

      {/* Privacy Settings */}
      <div className="space-y-4">
        <SectionHeader
          title="Privacy Settings"
          description="Control who can see and join your party."
        />
        <SwitchField
          name="isPublic"
          label="Public Party"
          description="Make this party visible to other users in the community."
        />
      </div>

      <Separator />

      {/* Party Settings */}
      <div className="space-y-4">
        <SectionHeader
          title="Party Settings"
          description="Configure how members can join your party."
        />
        <SwitchField
          name="settings.allowJoining"
          label="Allow Joining"
          description="Let other users request to join this party."
        />
        <SwitchField
          name="settings.requireApproval"
          label="Require Approval"
          description="New members must be approved before joining."
        />

        <FormField
          control={form.control}
          name="settings.maxMembers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Members</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="6"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 6)}
                />
              </FormControl>
              <FormDescription>
                Set the maximum number of members allowed in this party.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Hidden submit button - FormModal handles the actual submit button */}
      <button type="submit" className="hidden" disabled={isSubmitting} />
    </form>
  );
}