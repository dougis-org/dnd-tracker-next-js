'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/components/dashboard';

export default function DashboardPage() {
  const { data: session, status } = useSession();

  return (
    <AppLayout>
      {status === 'loading' && (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      )}

      {status === 'unauthenticated' && (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Please sign in to view your dashboard.</div>
        </div>
      )}

      {status === 'authenticated' && session?.user && (
        <main className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {session.user.name || session.user.email}!
            </p>
          </header>

          <Dashboard />
        </main>
      )}
    </AppLayout>
  );
}