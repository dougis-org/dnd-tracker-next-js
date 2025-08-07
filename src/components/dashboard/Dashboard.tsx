'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SummaryCards } from './SummaryCards';
import { QuickActions } from './QuickActions';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';

export function Dashboard() {
  const router = useRouter();
  const { stats, isLoading, error } = useDashboardStats();

  // Map the stats to match SummaryCards interface
  const dashboardStats = {
    characters: stats.characters,
    encounters: stats.encounters,
    activeSessions: stats.parties, // Map parties to activeSessions for now
  };

  // Real navigation handlers
  const handleCreateCharacter = () => {
    router.push('/characters');
  };

  const handleCreateEncounter = () => {
    router.push('/encounters/create');
  };

  const handleStartCombat = () => {
    router.push('/combat');
  };

  const handleCustomizeDashboard = () => {
    console.log('Customize dashboard clicked');
    // TODO: Implement dashboard customization modal in future
  };

  return (
    <div data-testid="dashboard" className="p-6 space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={handleCustomizeDashboard} variant="outline">
          Customize Dashboard
        </Button>
      </div>

      {/* Summary Cards */}
      <SummaryCards stats={dashboardStats} isLoading={isLoading} error={error} />

      {/* Dashboard Grid */}
      <div data-testid="dashboard-widgets" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <QuickActions
          onCreateCharacter={handleCreateCharacter}
          onCreateEncounter={handleCreateEncounter}
          onStartCombat={handleStartCombat}
        />

        {/* Recent Activity */}
        <Card data-testid="recent-activity-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid="activity-feed" className="text-center text-muted-foreground py-8">
              No recent activity to display
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifications Widget */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-4">
              <p className="text-sm">No new notifications</p>
            </div>
          </CardContent>
        </Card>

        {/* Tips Widget */}
        <Card>
          <CardHeader>
            <CardTitle>Tips & Tricks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-4">
              <p className="text-sm">Coming Soon</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Widget */}
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-4">
              <p className="text-sm">Coming Soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}