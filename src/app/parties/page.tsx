import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PartyListView } from '@/components/party/PartyListView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Parties - D&D Encounter Tracker',
  description: 'Manage and organize your D&D parties',
};

export default async function PartiesPage() {
  // Check authentication using Clerk directly
  const session = await auth();

  if (!session?.userId) {
    redirect('/sign-in?redirect_url=/parties');
  }

  const userId = session.userId;

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