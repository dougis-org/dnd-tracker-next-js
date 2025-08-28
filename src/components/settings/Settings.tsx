'use client';

import React, { useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSettingsForm } from './hooks/useSettingsForm';
import { ProfileSection } from './components/ProfileSection';
import { NotificationsSection } from './components/NotificationsSection';
import { SubscriptionSection } from './components/SubscriptionSection';
import { SecuritySection } from './components/SecuritySection';
import { ThemeSection } from './components/ThemeSection';
import { UpgradeModal, PasswordModal, DeleteModal } from './components/SettingsModals';
import { type SubscriptionTier } from './constants';

export function Settings() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const {
    profileData,
    setProfileData,
    notifications,
    handleNotificationChange,
    formErrors,
    message,
    isLoadingProfile,
    isLoadingNotifications,
    handleProfileSubmit,
    handleNotificationsSubmit,
  } = useSettingsForm();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isLoaded || !user) {
    return null;
  }

  const currentTier = 'free' as SubscriptionTier; // TODO: Get subscription tier from Clerk metadata

  /**
   * Handles account deletion with proper confirmation flow
   */
  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/users/${user.id}/profile`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete account');
      }

      // Sign out the user and redirect to home page
      await signOut({ redirectUrl: '/' });

      setShowDeleteModal(false);
    } catch (error) {
      console.error('Account deletion error:', error);
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'An error occurred while deleting your account. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div data-testid="settings-container" className="space-y-6">
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {deleteError && (
        <Alert variant="destructive">
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}

      <div data-testid="settings-grid" className="grid gap-6 lg:grid-cols-2">
        <ProfileSection
          profileData={profileData}
          setProfileData={setProfileData}
          formErrors={formErrors}
          isLoadingProfile={isLoadingProfile}
          onSubmit={handleProfileSubmit}
        />

        <NotificationsSection
          notifications={notifications}
          onNotificationChange={handleNotificationChange}
          isLoadingNotifications={isLoadingNotifications}
          onSubmit={handleNotificationsSubmit}
        />

        <ThemeSection />

        <SubscriptionSection
          currentTier={currentTier}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />

        <SecuritySection
          onChangePasswordClick={() => setShowPasswordModal(true)}
          onDeleteAccountClick={() => setShowDeleteModal(true)}
        />
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
      />
    </div>
  );
}