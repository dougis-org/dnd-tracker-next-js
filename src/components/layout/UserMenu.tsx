'use client';

import React from 'react';
import { useUser, useClerk } from '@clerk/nextjs';

const LoadingState = () => (
  <div
    className="border-t border-border p-4"
    data-testid="user-menu"
  >
    <div className="text-sm text-muted-foreground">
      Loading...
    </div>
  </div>
);

const UserAvatar = () => (
  <div
    className="h-8 w-8 rounded-full bg-muted"
    data-testid="user-avatar"
  />
);

const UserInfo = ({ displayName, displayEmail }: { displayName: string; displayEmail?: string }) => (
  <div
    className="flex-1 min-w-0"
    data-testid="user-info"
  >
    <p className="text-sm font-medium text-foreground truncate">
      {displayName}
    </p>
    {displayEmail && displayName !== displayEmail && (
      <p className="text-xs text-muted-foreground truncate">
        {displayEmail}
      </p>
    )}
  </div>
);

const SignOutButton = ({ onSignOut }: { onSignOut: () => void }) => (
  <button
    onClick={onSignOut}
    className="w-full text-left px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm transition-colors"
    aria-label="Sign Out"
  >
    Sign Out
  </button>
);

export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return <LoadingState />;
  }

  if (!user) {
    return null;
  }

  const displayName = user.firstName || user.emailAddresses[0]?.emailAddress || 'User';
  const displayEmail = user.emailAddresses[0]?.emailAddress || undefined;

  return (
    <div
      className="border-t border-border p-4"
      data-testid="user-menu"
    >
      <div className="space-y-3">
        {/* User Profile Section */}
        <div className="flex items-center space-x-3">
          <UserAvatar />
          <UserInfo displayName={displayName} displayEmail={displayEmail} />
        </div>

        {/* Sign Out Button */}
        <SignOutButton onSignOut={() => signOut({ redirectUrl: '/' })} />
      </div>
    </div>
  );
}