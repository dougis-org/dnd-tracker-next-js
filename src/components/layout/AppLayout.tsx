'use client';

import React, { useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
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

const AuthSection = ({ isLoaded, isSignedIn, router, signOut }: { isLoaded: boolean; isSignedIn: boolean; router: any; signOut: any }) => {

  if (!isLoaded) {
    return (
      <div data-testid="auth-loading" className="text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <button
        onClick={() => router.push('/sign-in')}
        className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
        aria-label="Sign In"
      >
        Sign In
      </button>
    );
  }

  return (
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
        <DropdownMenuItem onClick={() => router.push('/user-profile')}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ redirectUrl: '/' })}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const HeaderSection = ({
  isMobile,
  setSidebarOpen,
  isLoaded,
  isSignedIn,
  router,
  signOut
}: {
  isMobile: boolean;
  setSidebarOpen: (_open: boolean) => void;
  isLoaded: boolean;
  isSignedIn: boolean;
  router: any;
  signOut: any;
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
        <AuthSection isLoaded={isLoaded} isSignedIn={isSignedIn} router={router} signOut={signOut} />
      </div>
    </div>
  </header>
);

export function AppLayout({ children }: AppLayoutProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const _router = useRouter();
  const { signOut: _signOut } = useClerk();
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
      <Sidebar isOpen={!isMobile} isAuthenticated={!!isSignedIn} />

      {/* Mobile menu overlay */}
      <MobileMenu
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAuthenticated={!!isSignedIn}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navigation bar */}
        <HeaderSection
          isMobile={isMobile}
          setSidebarOpen={setSidebarOpen}
          isLoaded={isLoaded}
          isSignedIn={!!isSignedIn}
          router={_router}
          signOut={_signOut}
        />

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
