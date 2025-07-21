'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Swords,
  Users,
  Timer,
  Heart,
  Plus,
  AlertCircle
} from 'lucide-react';

// Active Combat Sessions empty state component
function ActiveCombatSessions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5" />
          Active Combat Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No active combat sessions</h3>
          <p className="text-muted-foreground mb-4">
            Start a new encounter to begin combat tracking
          </p>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Start New Combat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Initiative Tracker feature card
function InitiativeTrackerCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Initiative Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Track turn order and manage combat flow
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Turn Order</span>
            <Badge variant="outline">Ready</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Round Counter</span>
            <Badge variant="outline">Ready</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Participant Management feature card
function ParticipantManagementCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Participants
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Manage characters and NPCs in combat
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>HP/AC Tracking</span>
            <Badge variant="outline">Ready</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Status Effects</span>
            <Badge variant="outline">Ready</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Combat Actions feature card
function CombatActionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Combat Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Apply damage and healing to participants
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Damage/Healing</span>
            <Badge variant="outline">Ready</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Quick Actions</span>
            <Badge variant="outline">Ready</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Real-time Updates feature card
function RealTimeUpdatesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Real-time Updates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Collaborate with other DMs and players in real-time
            </p>
          </div>
          <Badge variant="secondary" className="gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            Connected
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CombatPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Combat Tracker</h1>
        <p className="text-muted-foreground mt-2">
          Manage active combat encounters and initiative tracking
        </p>
      </header>

      <div className="grid gap-6">
        <ActiveCombatSessions />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InitiativeTrackerCard />
          <ParticipantManagementCard />
          <CombatActionsCard />
        </div>

        <RealTimeUpdatesCard />
      </div>
    </main>
  );
}