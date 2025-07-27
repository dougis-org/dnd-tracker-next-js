// Remove next-auth dependency since we have our own auth system
// export type SessionUser = NonNullable<Session['user']>;

export interface NotificationPreferences {
  email: boolean;
  combat: boolean;
  encounters: boolean;
  weeklyDigest: boolean;
  productUpdates: boolean;
  securityAlerts: boolean;
}