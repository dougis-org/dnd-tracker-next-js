'use client';

import React, { useState } from 'react';
import { QuickAddModal } from '@/components/modals/FormModal';
import { PartyCreateForm } from './PartyCreateForm';
import { type PartyCreate } from '@/lib/validations/party';
import { useToast } from '@/hooks/use-toast';

export interface PartyCreateModalProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onPartyCreated?: () => void;
}

export function PartyCreateModal({ open, onOpenChange, onPartyCreated }: PartyCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    toast({ title, description, variant });
  };

  const handleSuccess = (data: PartyCreate) => {
    showToast('Party created successfully', `"${data.name}" has been created and is ready for members.`);
    onPartyCreated?.();
    onOpenChange(false);
  };

  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    showToast('Failed to create party', message, 'destructive');
  };

  const handleSubmit = async (data: PartyCreate) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || `Failed to create party: ${response.status}`);
      }

      handleSuccess(data);
    } catch (error) {
      handleError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <QuickAddModal
      open={open}
      onOpenChange={onOpenChange}
      config={{
        title: 'Create New Party',
        description: 'Set up a new party for your D&D campaign.',
        submitText: 'Create Party',
        cancelText: 'Cancel',
        size: 'lg',
      }}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    >
      <PartyCreateForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </QuickAddModal>
  );
}

// Hook for easier party creation modal usage
export function usePartyCreateModal(onPartyCreated?: () => void) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const PartyCreateModalComponent = () => (
    <PartyCreateModal
      open={isOpen}
      onOpenChange={setIsOpen}
      onPartyCreated={onPartyCreated}
    />
  );

  return {
    isOpen,
    openModal,
    closeModal,
    PartyCreateModal: PartyCreateModalComponent,
  };
}