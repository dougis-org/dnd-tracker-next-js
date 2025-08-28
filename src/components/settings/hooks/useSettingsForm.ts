import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants';
import { NotificationPreferences } from '@/types/auth';
import { useFormSubmission } from './useFormSubmission';

export function useSettingsForm() {
  const { user } = useUser();

  const [profileData, setProfileData] = useState({
    name: user?.firstName || user?.fullName || '',
    email: user?.primaryEmailAddress?.emailAddress || '',
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    // TODO: Get notification preferences from Clerk metadata or database
  });

  const {
    isLoadingProfile,
    isLoadingNotifications,
    message,
    formErrors,
    handleProfileSubmit: submitProfile,
    handleNotificationsSubmit: submitNotifications,
  } = useFormSubmission(user?.id || '');

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitProfile(profileData);
  };

  const handleNotificationsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitNotifications(notifications);
  };

  const handleNotificationChange = (key: keyof NotificationPreferences) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return {
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
  };
}