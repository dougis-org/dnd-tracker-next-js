import { Metadata } from 'next';
import { Dashboard } from '@/components/dashboard';
import AuthenticatedServerPage, { getServerSession } from '@/components/layout/AuthenticatedServerPage';

export const metadata: Metadata = {
  title: 'Dashboard - D&D Encounter Tracker',
  description: 'Your D&D campaign dashboard',
};

/**
 * Server-rendered Dashboard page with proper authentication
 *
 * This approach eliminates the need for client-side useSession() checks
 * since the middleware and AuthenticatedServerPage handle authentication.
 *
 * Benefits:
 * - No loading states for authentication
 * - Consistent server-side rendering
 * - Better SEO and performance
 * - Cleaner component architecture
 */
export default async function DashboardServerPage() {
  // Get authenticated session (guaranteed to exist due to AuthenticatedServerPage wrapper)
  const session = await getServerSession();

  return (
    <AuthenticatedServerPage>
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {session.user?.name || session.user?.email}!
          </p>
        </header>

        <Dashboard />
      </main>
    </AuthenticatedServerPage>
  );
}