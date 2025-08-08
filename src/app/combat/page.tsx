'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// Types for combat data
interface CombatParticipant {
  characterId: string;
  name: string;
  type: 'pc' | 'npc' | 'monster';
  currentHitPoints?: number;
  maxHitPoints?: number;
  armorClass?: number;
}

interface InitiativeEntry {
  participantId: string;
  initiative: number;
  isActive: boolean;
  hasActed: boolean;
}

interface CombatState {
  isActive: boolean;
  currentRound: number;
  currentTurn: number;
  initiativeOrder: InitiativeEntry[];
}

interface ActiveEncounter {
  _id: string;
  name: string;
  combatState: CombatState;
  participants: CombatParticipant[];
}

interface ActiveCombatSessionsProps {
  encounters: ActiveEncounter[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onStartNewCombat: () => void;
}

// Active Combat Sessions component with real functionality
function ActiveCombatSessions({ encounters, isLoading, error, onRefresh, onStartNewCombat }: ActiveCombatSessionsProps) {
  if (isLoading) {
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
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading active combat sessions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
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
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error loading combat sessions</h3>
            <p className="text-muted-foreground mb-4">
              Unable to load active combat sessions. Please try again.
            </p>
            <Button onClick={onRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (encounters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Active Combat Sessions
            <Button onClick={onRefresh} variant="ghost" size="sm" className="ml-auto">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No active combat sessions</h3>
            <p className="text-muted-foreground mb-4">
              Start a new encounter to begin combat tracking
            </p>
            <Button onClick={onStartNewCombat} className="gap-2" title="Select an encounter to start combat">
              <Plus className="h-4 w-4" />
              Start New Combat
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5" />
          Active Combat Sessions ({encounters.length})
          <Button onClick={onRefresh} variant="ghost" size="sm" className="ml-auto">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {encounters.map((encounter) => (
            <CombatSessionCard key={encounter._id} encounter={encounter} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Individual combat session card component
function CombatSessionCard({ encounter }: { encounter: ActiveEncounter }) {
  const activeParticipant = encounter.combatState.initiativeOrder.find(p => p.isActive);
  const activeParticipantName = activeParticipant
    ? encounter.participants.find(p => p.characterId === activeParticipant.participantId)?.name
    : 'Unknown';

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{encounter.name}</h4>
        <Badge variant="secondary">Round {encounter.combatState.currentRound}</Badge>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Participants: {encounter.participants.length}</span>
        <span>Active: {activeParticipantName}</span>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <Timer className="h-3 w-3" />
          Turn {encounter.combatState.currentTurn + 1}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          Initiative Order: {encounter.combatState.initiativeOrder.length}
        </Badge>
      </div>
    </div>
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [encounters, setEncounters] = useState<ActiveEncounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch active combat sessions
  const fetchActiveCombatSessions = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/encounters?status=active&combat=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setEncounters(data.encounters || []);
    } catch (err) {
      console.error('Error fetching active combat sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch combat sessions');
      setEncounters([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Load data on mount and when session changes
  useEffect(() => {
    if (status === 'authenticated') {
      fetchActiveCombatSessions();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [session, status, fetchActiveCombatSessions]);

  // Handle starting new combat
  const handleStartNewCombat = () => {
    router.push('/encounters');
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchActiveCombatSessions();
  };

  // Authentication states
  if (status === 'loading') {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access combat tracking</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Combat Tracker</h1>
        <p className="text-muted-foreground mt-2">
          Manage active combat encounters and initiative tracking
        </p>
      </header>

      <div className="grid gap-6">
        <ActiveCombatSessions
          encounters={encounters}
          isLoading={isLoading}
          error={error}
          onRefresh={handleRefresh}
          onStartNewCombat={handleStartNewCombat}
        />

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