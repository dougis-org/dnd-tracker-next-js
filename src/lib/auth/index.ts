// Re-export auth functions for backwards compatibility
export { useAuth } from './AuthProvider';
export { AuthProvider } from './AuthProvider';

// For backwards compatibility with existing code that imports from '@/lib/auth'
export async function auth() {
  // This is a server-side compatibility function
  // In the new system, auth state is managed client-side
  return null;
}

// Legacy function for getting user info server-side
export async function getServerUser() {
  // In the new system, user info should be checked via middleware headers
  return null;
}