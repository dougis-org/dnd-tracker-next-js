'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { Dashboard } from '@/components/dashboard';
import { Metadata } from 'next';

// Note: Metadata export won't work in client components, but keeping for reference
const _metadata: Metadata = {
  title: 'Dashboard - D&D Encounter Tracker',
  description: 'Your D&D campaign dashboard',
};

export default function DashboardPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Please sign in to view your dashboard.</div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}!
        </p>
      </header>

      <Dashboard />
    </main>
  );
}