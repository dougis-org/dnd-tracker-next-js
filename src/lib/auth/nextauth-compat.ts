// Compatibility layer for next-auth/react to make existing components work
import { useAuth } from './AuthProvider';

export function useSession() {
  const auth = useAuth();
  return {
    data: auth.user ? { user: auth.user } : null,
    status: auth.loading ? 'loading' : (auth.user ? 'authenticated' : 'unauthenticated'),
    update: () => Promise.resolve()
  };
}

export function signIn(_provider?: string, _options?: any) {
  if (typeof window !== 'undefined') {
    window.location.href = '/signin';
  }
  return Promise.resolve({ error: null, status: 200, ok: true, url: '/signin' });
}

export function signOut(_options?: any) {
  if (typeof window !== 'undefined') {
    fetch('/api/auth/signout', { method: 'POST' })
      .then(() => {
        window.location.href = '/';
      })
      .catch(console.error);
  }
  return Promise.resolve({ url: '/' });
}

export function getSession() {
  if (typeof window !== 'undefined') {
    return fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => data.authenticated ? { user: data.user } : null)
      .catch(() => null);
  }
  return Promise.resolve(null);
}