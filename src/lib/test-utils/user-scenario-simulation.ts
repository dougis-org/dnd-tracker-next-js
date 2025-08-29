/**
 * Realistic User Session Simulation for Issue #537
 *
 * Comprehensive user scenario simulation for testing authentication flows,
 * subscription tier behaviors, and edge cases
 */

import {
  createRealisticSession,
  createRealisticJWTToken,
  createRealisticUserProfile,
  SubscriptionTier,
  SESSION_TIMEOUTS
} from './advanced-session-mocks';

/**
 * User behavior patterns for realistic testing
 */
export interface UserBehavior {
  id: string;
  name: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  behaviors: ReadonlyArray<UserBehaviorPattern>;
  commonActions: ReadonlyArray<string>;
  sessionPreferences: SessionPreferences;
}

/**
 * User behavior patterns
 */
export interface UserBehaviorPattern {
  pattern: string;
  frequency: 'high' | 'medium' | 'low';
  description: string;
  sessionDuration: number; // in minutes
  typicalActions: ReadonlyArray<string>;
}

/**
 * Session preferences for different user types
 */
export interface SessionPreferences {
  rememberMe: boolean;
  sessionTimeout: number;
  preferredEnvironment: 'production' | 'development';
  mobileAccess: boolean;
  apiUsage: 'high' | 'medium' | 'low';
}

/**
 * Realistic user scenarios based on subscription tiers
 */
export const USER_SCENARIOS = {

  /**
   * Free tier user - limited usage, occasional access
   */
  FREE_USER: {
    id: 'free-user-123',
    name: 'Casual DM',
    email: 'casual.dm@example.com',
    subscriptionTier: 'free' as const,
    commonActions: ['view_characters', 'create_encounter', 'track_combat'],
    behaviors: [
      {
        pattern: 'weekend_warrior',
        frequency: 'medium' as const,
        description: 'Plays mostly on weekends, light usage',
        sessionDuration: 120,
        typicalActions: ['view_characters', 'create_encounter', 'track_combat']
      }
    ],
    sessionPreferences: {
      rememberMe: false,
      sessionTimeout: 30,
      preferredEnvironment: 'development' as const,
      mobileAccess: true,
      apiUsage: 'low' as const,
    },
    profile: () => createRealisticUserProfile({
      subscriptionTier: 'free',
      email: 'casual.dm@example.com',
      name: 'Casual DM',
      firstName: 'Casual',
      lastName: 'DM',
      experienceLevel: 'beginner',
      primaryRole: 'dm',
    }),
  },

  /**
   * Seasoned adventurer - regular usage, growing campaign
   */
  SEASONED_USER: {
    id: 'seasoned-user-123',
    name: 'Regular DM',
    email: 'regular.dm@example.com',
    subscriptionTier: 'seasoned' as const,
    commonActions: ['manage_parties', 'create_encounters', 'track_combat', 'view_characters'],
    behaviors: [
      {
        pattern: 'weekly_campaign',
        frequency: 'high' as const,
        description: 'Runs weekly campaigns, consistent usage',
        sessionDuration: 180,
        typicalActions: ['manage_parties', 'create_encounters', 'track_combat', 'view_characters']
      }
    ],
    sessionPreferences: {
      rememberMe: true,
      sessionTimeout: 60,
      preferredEnvironment: 'production' as const,
      mobileAccess: true,
      apiUsage: 'medium' as const,
    },
    profile: () => createRealisticUserProfile({
      subscriptionTier: 'seasoned',
      email: 'regular.dm@example.com',
      name: 'Regular DM',
      firstName: 'Regular',
      lastName: 'DM',
      experienceLevel: 'experienced',
      primaryRole: 'dm',
    }),
  },

  /**
   * Expert Dungeon Master - heavy usage, multiple campaigns
   */
  EXPERT_USER: {
    id: 'expert-user-123',
    name: 'Expert DM',
    email: 'expert.dm@example.com',
    subscriptionTier: 'expert' as const,
    commonActions: ['manage_parties', 'create_encounters', 'track_combat', 'view_characters', 'use_advanced_features'],
    behaviors: [
      {
        pattern: 'power_user',
        frequency: 'high' as const,
        description: 'Heavy usage, multiple campaigns, advanced features',
        sessionDuration: 240,
        typicalActions: ['manage_parties', 'create_encounters', 'track_combat', 'view_characters', 'use_advanced_features']
      }
    ],
    sessionPreferences: {
      rememberMe: true,
      sessionTimeout: 120,
      preferredEnvironment: 'production' as const,
      mobileAccess: true,
      apiUsage: 'high' as const,
    },
    profile: () => createRealisticUserProfile({
      subscriptionTier: 'expert',
      email: 'expert.dm@example.com',
      name: 'Expert DM',
      firstName: 'Expert',
      lastName: 'DM',
      experienceLevel: 'expert',
      primaryRole: 'dm',
    }),
  },

  /**
   * Master of Dungeons - professional DM, maximum usage
   */
  MASTER_USER: {
    id: 'master-user-123',
    name: 'Pro DM',
    email: 'pro.dm@example.com',
    subscriptionTier: 'master' as const,
    commonActions: ['manage_parties', 'create_encounters', 'track_combat', 'view_characters', 'use_advanced_features', 'api_integration'],
    behaviors: [
      {
        pattern: 'professional',
        frequency: 'high' as const,
        description: 'Professional DM, runs multiple campaigns daily',
        sessionDuration: 300,
        typicalActions: ['manage_parties', 'create_encounters', 'track_combat', 'view_characters', 'use_advanced_features', 'api_integration']
      }
    ],
    sessionPreferences: {
      rememberMe: true,
      sessionTimeout: 240,
      preferredEnvironment: 'production' as const,
      mobileAccess: true,
      apiUsage: 'high' as const,
    },
    profile: () => createRealisticUserProfile({
      subscriptionTier: 'master',
      email: 'pro.dm@example.com',
      name: 'Pro DM',
      firstName: 'Pro',
      lastName: 'DM',
      experienceLevel: 'expert',
      primaryRole: 'dm',
    }),
  },

  /**
   * Guild Master - organization management, team collaboration
   */
  GUILD_USER: {
    id: 'guild-user-123',
    name: 'Guild Master',
    email: 'guild.master@example.com',
    subscriptionTier: 'guild' as const,
    commonActions: ['manage_parties', 'create_encounters', 'track_combat', 'view_characters', 'use_advanced_features', 'api_integration', 'manage_organization'],
    behaviors: [
      {
        pattern: 'organization_leader',
        frequency: 'high' as const,
        description: 'Manages organization, team collaboration, extensive usage',
        sessionDuration: 360,
        typicalActions: ['manage_parties', 'create_encounters', 'track_combat', 'view_characters', 'use_advanced_features', 'api_integration', 'manage_organization']
      }
    ],
    sessionPreferences: {
      rememberMe: true,
      sessionTimeout: 360,
      preferredEnvironment: 'production' as const,
      mobileAccess: true,
      apiUsage: 'high' as const,
    },
    profile: () => createRealisticUserProfile({
      subscriptionTier: 'guild',
      email: 'guild.master@example.com',
      name: 'Guild Master',
      firstName: 'Guild',
      lastName: 'Master',
      experienceLevel: 'expert',
      primaryRole: 'dm',
    }),
  },
} as const;

/**
 * Session lifecycle simulation
 */
export class SessionLifecycleSimulator {
  private sessionStartTime: Date;

  private sessionDuration: number;

  private userActivity: Array<{ timestamp: Date; action: string }> = [];

  constructor(private user: UserBehavior) {
    this.sessionStartTime = new Date();
    this.sessionDuration = user.sessionPreferences.sessionTimeout * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Simulates user activity during session
   */
  simulateActivity(): void {
    const behavior = this.user.behaviors[0]; // Use primary behavior
    const actionCount = Math.floor(Math.random() * 10) + 5; // 5-15 actions per session

    for (let i = 0; i < actionCount; i++) {
      const action = behavior.typicalActions[Math.floor(Math.random() * behavior.typicalActions.length)];
      const timestamp = new Date(this.sessionStartTime.getTime() + Math.random() * this.sessionDuration);

      this.userActivity.push({ timestamp, action });
    }
  }

  /**
   * Gets session with realistic timing
   */
  getSession() {
    const sessionDurationSeconds = Math.floor(this.sessionDuration / 1000);

    return createRealisticSession({
      userId: this.user.id,
      email: this.user.email,
      subscriptionTier: this.user.subscriptionTier,
      name: this.user.name,
      expiresInSeconds: sessionDurationSeconds,
    });
  }

  /**
   * Gets JWT token with realistic timing
   */
  getJWTToken() {
    const sessionDurationSeconds = Math.floor(this.sessionDuration / 1000);

    return createRealisticJWTToken({
      userId: this.user.id,
      email: this.user.email,
      subscriptionTier: this.user.subscriptionTier,
      name: this.user.name,
      expiresInSeconds: sessionDurationSeconds,
    });
  }

  /**
   * Simulates session expiration
   */
  simulateSessionExpiration() {
    this.sessionStartTime = new Date(Date.now() - this.sessionDuration - 3600000); // 1 hour ago
    return this.getSession();
  }

  /**
   * Gets activity log for testing
   */
  getActivityLog() {
    return this.userActivity;
  }
}

/**
 * Authentication flow scenarios
 */
export const AUTH_FLOW_SCENARIOS = {

  /**
   * Successful login with valid credentials
   */
  SUCCESSFUL_LOGIN: {
    description: 'User provides valid credentials and successfully authenticates',
    setup: () => {
      const user = USER_SCENARIOS.EXPERT_USER.profile();
      return {
        credentials: { email: user.email, password: 'valid-password', rememberMe: true },
        expectedSession: createRealisticSession({
          userId: user.id,
          email: user.email,
          subscriptionTier: user.subscriptionTier,
          name: user.name
        }),
        expectedToken: createRealisticJWTToken({
          userId: user.id,
          email: user.email,
          subscriptionTier: user.subscriptionTier,
          name: user.name
        }),
      };
    },
  },

  /**
   * Failed login with invalid credentials
   */
  FAILED_LOGIN_INVALID_CREDENTIALS: {
    description: 'User provides invalid credentials and authentication fails',
    setup: () => ({
      credentials: { email: 'invalid@example.com', password: 'wrong-password' },
      expectedError: 'Invalid credentials',
      expectedSession: null,
      expectedToken: null,
    }),
  },

  /**
   * Failed login with non-existent user
   */
  FAILED_LOGIN_USER_NOT_FOUND: {
    description: 'User tries to login with email that doesn\'t exist',
    setup: () => ({
      credentials: { email: 'nonexistent@example.com', password: 'anypassword' },
      expectedError: 'User not found',
      expectedSession: null,
      expectedToken: null,
    }),
  },

  /**
   * Session expiration during active use
   */
  SESSION_EXPIRATION_DURING_USE: {
    description: 'User session expires while they are actively using the application',
    setup: () => {
      const user = USER_SCENARIOS.EXPERT_USER;
      const simulator = new SessionLifecycleSimulator(user);
      const expiredSession = simulator.simulateSessionExpiration();

      return {
        initialSession: expiredSession,
        userActivity: simulator.getActivityLog(),
        expectedBehavior: 'redirect_to_login',
      };
    },
  },

  /**
   * Session refresh/extension
   */
  SESSION_REFRESH: {
    description: 'User session is refreshed before expiration',
    setup: () => {
      const user = USER_SCENARIOS.EXPERT_USER;
      const simulator = new SessionLifecycleSimulator(user);
      const originalSession = simulator.getSession();

      // Simulate session refresh (extend expiration)
      const refreshedSession = createRealisticSession({
        userId: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        name: user.name,
        expiresInSeconds: SESSION_TIMEOUTS.MAX_AGE,
      });

      return {
        originalSession,
        refreshedSession,
        expectedBehavior: 'session_extended',
      };
    },
  },

  /**
   * Cross-device session access
   */
  CROSS_DEVICE_ACCESS: {
    description: 'User accesses account from multiple devices',
    setup: () => {
      const user = USER_SCENARIOS.GUILD_USER.profile();

      return {
        desktopSession: createRealisticSession({
          userId: user.id,
          email: user.email,
          subscriptionTier: user.subscriptionTier,
          name: user.name,
          environment: 'production',
        }),
        mobileSession: createRealisticSession({
          userId: user.id,
          email: user.email,
          subscriptionTier: user.subscriptionTier,
          name: user.name,
          environment: 'production',
        }),
        expectedBehavior: 'synchronized_access',
      };
    },
  },

  /**
   * Subscription tier upgrade scenario
   */
  SUBSCRIPTION_UPGRADE: {
    description: 'User upgrades subscription tier during active session',
    setup: () => {
      const user = USER_SCENARIOS.FREE_USER.profile();

      return {
        originalSession: createRealisticSession({
          userId: user.id,
          email: user.email,
          subscriptionTier: 'free',
          name: user.name,
        }),
        upgradedSession: createRealisticSession({
          userId: user.id,
          email: user.email,
          subscriptionTier: 'expert',
          name: user.name,
        }),
        expectedBehavior: 'tier_upgraded',
      };
    },
  },
} as const;

/**
 * Edge case scenarios for comprehensive testing
 */
export const EDGE_CASE_SCENARIOS = {

  /**
   * Session cookie manipulation
   */
  COOKIE_MANIPULATION: {
    description: 'Malicious session cookie manipulation attempts',
    setup: () => ({
      tamperedCookie: 'clerk-session=malicious-content',
      expectedBehavior: 'authentication_rejected',
    }),
  },

  /**
   * JWT token tampering
   */
  JWT_TAMPERING: {
    description: 'Attempts to modify JWT token content',
    setup: () => {
      const validToken = createRealisticJWTToken({ subscriptionTier: 'free' });
      const tamperedToken = { ...validToken, subscriptionTier: 'guild' }; // Upgrade attempt

      return {
        validToken,
        tamperedToken,
        expectedBehavior: 'token_rejected',
      };
    },
  },

  /**
   * Concurrent session limit testing
   */
  CONCURRENT_SESSIONS: {
    description: 'User attempts to exceed concurrent session limits',
    setup: () => {
      const user = USER_SCENARIOS.FREE_USER.profile();
      const sessions = Array.from({ length: 10 }, () =>
        createRealisticSession({
          userId: user.id,
          email: user.email,
          subscriptionTier: user.subscriptionTier,
          name: user.name,
        })
      );

      return {
        sessions,
        expectedBehavior: 'session_limit_enforced',
      };
    },
  },

  /**
   * Network interruption during authentication
   */
  NETWORK_INTERRUPTION: {
    description: 'Network interruption during authentication flow',
    setup: () => ({
      scenario: 'partial_authentication',
      expectedBehavior: 'authentication_failed',
      recoveryAction: 'retry_authentication',
    }),
  },

  /**
   * Browser back button after logout
   */
  BROWSER_BACK_AFTER_LOGOUT: {
    description: 'User uses browser back button after logout',
    setup: () => ({
      sequence: ['login', 'logout', 'browser_back'],
      expectedBehavior: 'authentication_required',
    }),
  },
} as const;

/**
 * Performance testing scenarios
 */
export const PERFORMANCE_SCENARIOS = {

  /**
   * High-frequency API calls
   */
  HIGH_FREQUENCY_API: {
    description: 'User makes high-frequency API calls in short time period',
    setup: () => {
      const user = USER_SCENARIOS.EXPERT_USER.profile();
      const session = createRealisticSession({
        userId: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        name: user.name,
      });

      return {
        session,
        apiCallCount: 100,
        timeWindow: 5000, // 5 seconds
        expectedBehavior: 'rate_limiting_applied',
      };
    },
  },

  /**
   * Large session data handling
   */
  LARGE_SESSION_DATA: {
    description: 'Session with large amounts of user data',
    setup: () => {
      const user = USER_SCENARIOS.GUILD_USER.profile();
      const session = createRealisticSession({
        userId: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        name: user.name,
      });

      // Simulate large session data
      const largeSession = {
        ...session,
        user: {
          ...session.user,
          // Add large amounts of mock data
          extendedData: Array.from({ length: 1000 }, (_, i) => ({
            id: `item-${i}`,
            data: `large-data-payload-${i}`.repeat(100),
          })),
        },
      };

      return {
        session: largeSession,
        dataSize: 'large',
        expectedBehavior: 'session_handled',
      };
    },
  },
} as const;

/**
 * Scenario testing utilities
 */
export class ScenarioTester {

  /**
   * Tests a complete authentication scenario
   */
  static async testAuthenticationScenario(
    scenario: keyof typeof AUTH_FLOW_SCENARIOS,
    testRunner: (_setup: any) => Promise<void>
  ): Promise<void> {
    const scenarioConfig = AUTH_FLOW_SCENARIOS[scenario];
    const scenarioSetup = scenarioConfig.setup();

    console.log(`Testing scenario: ${scenarioConfig.description}`);
    await testRunner(scenarioSetup);
  }

  /**
   * Tests user behavior simulation
   */
  static testUserBehavior(
    userType: keyof typeof USER_SCENARIOS,
    testRunner: (_simulator: SessionLifecycleSimulator) => void
  ): void {
    const userConfig = USER_SCENARIOS[userType];
    const behaviorSimulator = new SessionLifecycleSimulator(userConfig);

    console.log(`Testing user behavior: ${userType}`);
    behaviorSimulator.simulateActivity();
    testRunner(behaviorSimulator);
  }

  /**
   * Tests edge case scenarios
   */
  static testEdgeCase(
    scenario: keyof typeof EDGE_CASE_SCENARIOS,
    testRunner: (_setup: any) => void
  ): void {
    const scenarioConfig = EDGE_CASE_SCENARIOS[scenario];
    const edgeCaseSetup = scenarioConfig.setup();

    console.log(`Testing edge case: ${scenarioConfig.description}`);
    testRunner(edgeCaseSetup);
  }
}

/**
 * Export all scenario types for easy use in tests
 */
export type UserScenarioType = keyof typeof USER_SCENARIOS;
export type AuthFlowScenarioType = keyof typeof AUTH_FLOW_SCENARIOS;
export type EdgeCaseScenarioType = keyof typeof EDGE_CASE_SCENARIOS;
export type PerformanceScenarioType = keyof typeof PERFORMANCE_SCENARIOS;