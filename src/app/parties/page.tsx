import { Metadata } from 'next';
import { getAuthenticatedUserId } from '@/lib/auth';
import { PartyListView } from '@/components/party/PartyListView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Parties - D&D Encounter Tracker',
  description: 'Manage and organize your D&D parties',
};

export default async function PartiesPage() {
  // Use centralized authentication - automatically handles redirect if not authenticated
  const userId = await getAuthenticatedUserId('/parties');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Parties</h1>
        <p className="text-muted-foreground">
          Manage and organize your D&D parties
        </p>
      </div>
      <PartyListView userId={userId} />
    </div>
  );
}