export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  subscriptionTier?: string;
}

export interface NotificationPreferences {
  email: boolean;
  combat: boolean;
  encounters: boolean;
  weeklyDigest: boolean;
  productUpdates: boolean;
  securityAlerts: boolean;
}