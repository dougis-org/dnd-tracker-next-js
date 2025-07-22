'use client';

import React, { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Sidebar } from './Sidebar';
import { MobileMenu } from './MobileMenu';
import { Breadcrumbs } from './Breadcrumbs';
import { Footer } from './Footer';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AuthSection = ({ status, session }: { status: string; session: any }) => (
  <>
    {status === 'loading' && (
      <div data-testid="auth-loading" className="text-muted-foreground text-sm">
        Loading...
      </div>
    )}

    {status === 'unauthenticated' && (
      <button
        onClick={() => signIn()}
        className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
        aria-label="Sign In"
      >
        Sign In
      </button>
    )}

    {status === 'authenticated' && session?.user && (
      <div className="flex items-center space-x-3">
        <span className="text-sm text-foreground">
          {session.user.name || session.user.email}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90 transition-colors"
              aria-label="User menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )}
  </>
);

const HeaderSection = ({
  isMobile,
  _sidebarOpen,
  setSidebarOpen,
  status,
  session
}: {
  isMobile: boolean;
  _sidebarOpen: boolean;
  setSidebarOpen: (_open: boolean) => void;
  status: string;
  session: any;
}) => (
  <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
    <div className="flex h-16 items-center justify-between px-4">
      {/* Mobile menu button */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
          aria-label="Open menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

      {/* Breadcrumbs */}
      <div className="flex-1">
        <Breadcrumbs />
      </div>

      {/* Theme toggle and auth section */}
      <div className="flex items-center space-x-4">
        <ThemeToggle />
        <AuthSection status={status} session={session} />
      </div>
    </div>
  </header>
);

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Sidebar for desktop */}
      <Sidebar isOpen={!isMobile} isAuthenticated={status === 'authenticated'} />

      {/* Mobile menu overlay */}
      <MobileMenu
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAuthenticated={status === 'authenticated'}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navigation bar */}
        <HeaderSection
          isMobile={isMobile}
          _sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          status={status}
          session={session}
        />

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
