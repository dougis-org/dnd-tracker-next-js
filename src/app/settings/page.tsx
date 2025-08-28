'use client';

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import { Settings } from '@/components/settings';
import { LoadingState, UnauthenticatedState, SettingsContent } from './components/SettingsPageStates';

export default function SettingsPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoadingState />;
  }

  if (!isSignedIn) {
    return <UnauthenticatedState />;
  }

  return (
    <SettingsContent>
      <Settings />
    </SettingsContent>
  );
}