'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Session } from 'next-auth';
import {
  hasRequiredTier,
  getUserTier,
  extractUserId,
  extractUserEmail,
} from './session-shared';

/**
 * Authentication state interface
 */
export interface AuthState {
  session: Session | null;
  user: Session['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  status: string;
}

/**
 * Redirect configuration for authentication guards
 */
export interface RedirectConfig {
  redirectTo: string;
  replace?: boolean;
  includeCallbackUrl?: boolean;
}

/**
 * Options for useRequireAuth hook
 */
export interface RequireAuthOptions {
  redirectTo?: string;
  replace?: boolean;
}

/**
 * Hook to get current authentication state
 */
export function useAuthState(): AuthState {
  const { data: session, status } = useSession();

  return {
    session,
    user: session?.user || null,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    status: status,
  };
}

/**
 * Build redirect URL with optional callback
 */
function buildRedirectUrl(baseUrl: string, includeCallback?: boolean): string {
  if (!includeCallback) return baseUrl;

  const currentUrl = encodeURIComponent(
    window.location.pathname + window.location.search
  );
  return `${baseUrl}?callbackUrl=${currentUrl}`;
}

/**
 * Perform navigation based on config
 */
function performRedirect(router: any, url: string, replace?: boolean): void {
  if (replace) {
    router.replace(url);
  } else {
    router.push(url);
  }
}

/**
 * Hook to guard routes with authentication requirements
 */
export function useSessionGuard(config: RedirectConfig): void {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'unauthenticated') return;

    const redirectUrl = buildRedirectUrl(
      config.redirectTo,
      config.includeCallbackUrl
    );
    performRedirect(router, redirectUrl, config.replace);
  }, [status, router, config]);
}

/**
 * Hook that requires authentication and redirects if not authenticated
 */
export function useRequireAuth(options: RequireAuthOptions = {}): {
  session: Session | null;
  isLoading: boolean;
} {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      const redirectTo = options.redirectTo || '/signin';
      performRedirect(router, redirectTo, options.replace);
    }
  }, [status, router, options]);

  return {
    session: status === 'authenticated' ? session : null,
    isLoading: status === 'loading',
  };
}

/**
 * Utility functions for client-side session management
 */
export class ClientSessionUtils {

  /**
   * Check if user has required subscription tier
   */
  static hasSubscriptionTier(
    session: Session | null,
    requiredTier: string
  ): boolean {
    if (!session?.user) return false;
    const userTier = getUserTier(session.user);
    return hasRequiredTier(userTier, requiredTier);
  }

  /**
   * Get user ID from session
   */
  static getUserId(session: Session | null): string | null {
    if (!session?.user) return null;
    return extractUserId(session.user);
  }

  /**
   * Get user email from session
   */
  static getUserEmail(session: Session | null): string | null {
    if (!session?.user) return null;
    return extractUserEmail(session.user);
  }

  /**
   * Get user subscription tier from session
   */
  static getSubscriptionTier(session: Session | null): string {
    if (!session?.user) return 'free';
    return getUserTier(session.user);
  }
}

/**
 * Logout utility with cleanup
 */
export async function performLogout(): Promise<void> {
  const { signOut } = await import('next-auth/react');

  try {
    // Clear any local storage or session storage if needed
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dnd-tracker-theme');
      sessionStorage.clear();
    }

    // Sign out with redirect to home page
    await signOut({
      callbackUrl: '/',
      redirect: true,
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Force redirect to home page if signOut fails
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
}
