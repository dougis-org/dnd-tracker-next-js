'use client';

import { AuthProvider } from '@/lib/auth/AuthProvider';
import { ReactNode } from 'react';

interface SessionProviderProps {
  children: ReactNode;
  session?: any; // Legacy compatibility - not used anymore
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
