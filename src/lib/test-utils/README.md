# Advanced Session Mock Utilities - Documentation

## Overview

This documentation covers the comprehensive session mocking and test utilities created for **Issue #537: Phase 3.3: Create
realistic session mocks and test utilities**. These utilities provide production-realistic session simulation for testing
authentication flows, subscription tier behaviors, and edge cases.

## Files Created

1. **`src/lib/test-utils/advanced-session-mocks.ts`** - Core session mocking utilities
2. **`src/lib/test-utils/user-scenario-simulation.ts`** - User behavior and scenario simulation
3. **This documentation file** - Comprehensive usage guide

## Quick Start

### Basic Session Mocking

```typescript
import { createRealisticSession, createRealisticJWTToken } from '@/lib/test-utils/advanced-session-mocks';

// Create a realistic session
const session = createRealisticSession({
  subscriptionTier: 'expert',
  email: 'expert.dm@example.com',
  name: 'Expert DM'
});

// Create a realistic JWT token
const token = createRealisticJWTToken({
  subscriptionTier: 'expert',
  email: 'expert.dm@example.com',
  name: 'Expert DM'
});
```

### User Scenario Testing

```typescript
import { USER_SCENARIOS, SessionLifecycleSimulator } from '@/lib/test-utils/user-scenario-simulation';

// Test expert user behavior
const expertUser = USER_SCENARIOS.EXPERT_USER;
const simulator = new SessionLifecycleSimulator(expertUser);
simulator.simulateActivity();

const session = simulator.getSession();
const activityLog = simulator.getActivityLog();
```

## Core Utilities

### Session Creation Functions

#### `createRealisticSession(options: SessionOptions)`

Creates a NextAuth-compatible session with realistic structure and timing.

**Parameters:**
- `userId?: string` - User ID (generates ObjectId if not provided)
- `email?: string` - User email
- `subscriptionTier?: SubscriptionTier` - Valid subscription tier
- `name?: string` - User display name
- `firstName?: string` - User first name
- `lastName?: string` - User last name
- `expiresInSeconds?: number` - Session expiration time
- `isExpired?: boolean` - Create already expired session
- `environment?: 'production' | 'development'` - Target environment

**Returns:** `NextAuthSession`

**Example:**
```typescript
const session = createRealisticSession({
  subscriptionTier: 'guild',
  email: 'guild.master@example.com',
  expiresInSeconds: 3600, // 1 hour
  environment: 'production'
});
```

#### `createRealisticJWTToken(options: SessionOptions)`

Creates a JWT token matching NextAuth JWT strategy structure.

**Parameters:** Same as `createRealisticSession`

**Returns:** `JWTToken`

**Example:**
```typescript
const token = createRealisticJWTToken({
  subscriptionTier: 'expert',
  email: 'expert.dm@example.com',
  expiresInSeconds: SESSION_TIMEOUTS.MAX_AGE
});
```

### Subscription Tier Utilities

#### `VALID_SUBSCRIPTION_TIERS`

Array of valid subscription tiers: `['free', 'seasoned', 'expert', 'master', 'guild']`

#### `createSubscriptionTierSessions()`

Creates sessions for all subscription tiers.

**Returns:** `Record<SubscriptionTier, NextAuthSession>`

**Example:**
```typescript
const tierSessions = createSubscriptionTierSessions();
const expertSession = tierSessions.expert;
const guildSession = tierSessions.guild;
```

#### `createSubscriptionTierTokens()`

Creates JWT tokens for all subscription tiers.

**Returns:** `Record<SubscriptionTier, JWTToken>`

### Session Validation

#### `SessionValidation`

Object containing validation utilities:

- `isValidSession(session: any)` - Validates session structure
- `isValidJWTToken(token: any)` - Validates JWT token structure
- `isExpired(session: NextAuthSession)` - Checks if session is expired
- `expiresWithin(session: NextAuthSession, minutes: number)` - Checks expiration within timeframe

**Example:**
```typescript
if (SessionValidation.isValidSession(session)) {
  if (SessionValidation.isExpired(session)) {
    // Handle expired session
  }
}
```

## Environment Configuration

### Production vs Development

The utilities automatically handle production and development environment differences:

**Production:**
- Cookie name: `__Secure-next-auth.session-token`
- Secure cookies: `true`
- Trusted domains: `['dnd-tracker-next-js.fly.dev', 'dnd-tracker.fly.dev', 'dndtracker.com', 'www.dndtracker.com']`

**Development:**
- Cookie name: `next-auth.session-token`
- Secure cookies: `false`
- Localhost development

**Example:**
```typescript
import { setupProductionEnvironment, setupDevelopmentEnvironment } from '@/lib/test-utils/advanced-session-mocks';

// Setup production environment for testing
setupProductionEnvironment();

// Setup development environment for testing
setupDevelopmentEnvironment();
```

## User Scenarios

### Predefined User Types

The library includes realistic user scenarios based on subscription tiers:

#### `USER_SCENARIOS.FREE_USER`
- Occasional weekend warrior
- Light usage patterns
- Short session durations
- Mobile-focused

#### `USER_SCENARIOS.SEASONED_USER`
- Regular weekly campaigns
- Consistent usage patterns
- Medium session durations
- Mixed device usage

#### `USER_SCENARIOS.EXPERT_USER`
- Heavy usage, multiple campaigns
- Advanced feature usage
- Long session durations
- High API usage

#### `USER_SCENARIOS.MASTER_USER`
- Professional DM usage
- Multiple daily campaigns
- Very long session durations
- Maximum API usage

#### `USER_SCENARIOS.GUILD_USER`
- Organization management
- Team collaboration features
- Maximum session durations
- Organization-level features

### Session Lifecycle Simulation

#### `SessionLifecycleSimulator`

Simulates realistic user session behavior including activity patterns and timing.

**Example:**
```typescript
const user = USER_SCENARIOS.EXPERT_USER;
const simulator = new SessionLifecycleSimulator(user);

// Simulate user activity
simulator.simulateActivity();

// Get session with realistic timing
const session = simulator.getSession();

// Get activity log
const activityLog = simulator.getActivityLog();

// Simulate session expiration
const expiredSession = simulator.simulateSessionExpiration();
```

## Authentication Flow Scenarios

### Predefined Scenarios

#### `AUTH_FLOW_SCENARIOS.SUCCESSFUL_LOGIN`
- Valid credentials
- Successful authentication
- Proper session creation

#### `AUTH_FLOW_SCENARIOS.FAILED_LOGIN_INVALID_CREDENTIALS`
- Invalid password
- Authentication failure
- Proper error handling

#### `AUTH_FLOW_SCENARIOS.SESSION_EXPIRATION_DURING_USE`
- Session expires during active use
- Proper redirect behavior
- Activity preservation

#### `AUTH_FLOW_SCENARIOS.CROSS_DEVICE_ACCESS`
- Multiple device access
- Session synchronization
- Consistent user experience

### Scenario Testing

#### `ScenarioTester`

Utilities for testing complex scenarios:

```typescript
import { ScenarioTester } from '@/lib/test-utils/user-scenario-simulation';

// Test authentication scenario
await ScenarioTester.testAuthenticationScenario(
  'SUCCESSFUL_LOGIN',
  async (setup) => {
    // Test the successful login scenario
    expect(setup.expectedSession).toBeDefined();
    expect(setup.expectedToken).toBeDefined();
  }
);

// Test user behavior
ScenarioTester.testUserBehavior(
  'EXPERT_USER',
  (simulator) => {
    // Test expert user behavior patterns
    const activity = simulator.getActivityLog();
    expect(activity.length).toBeGreaterThan(0);
  }
);
```

## Edge Case Testing

### Predefined Edge Cases

#### `EDGE_CASE_SCENARIOS.JWT_TAMPERING`
- JWT token manipulation attempts
- Security validation
- Proper rejection

#### `EDGE_CASE_SCENARIOS.CONCURRENT_SESSIONS`
- Multiple concurrent sessions
- Session limit enforcement
- Resource management

#### `EDGE_CASE_SCENARIOS.NETWORK_INTERRUPTION`
- Network interruption handling
- Authentication recovery
- Error resilience

#### `EDGE_CASE_SCENARIOS.BROWSER_BACK_AFTER_LOGOUT`
- Browser navigation after logout
- Session invalidation
- Security enforcement

### Performance Scenarios

#### `PERFORMANCE_SCENARIOS.HIGH_FREQUENCY_API`
- High-frequency API calls
- Rate limiting behavior
- Performance optimization

#### `PERFORMANCE_SCENARIOS.LARGE_SESSION_DATA`
- Large session data handling
- Memory management
- Performance optimization

## Testing Patterns

### Unit Testing

```typescript
import { createRealisticSession, SessionValidation } from '@/lib/test-utils/advanced-session-mocks';

describe('Session Validation', () => {
  it('should validate correct session structure', () => {
    const session = createRealisticSession({
      subscriptionTier: 'expert'
    });
    
    expect(SessionValidation.isValidSession(session)).toBe(true);
  });

  it('should reject invalid session structure', () => {
    const invalidSession = { user: 'invalid' };
    
    expect(SessionValidation.isValidSession(invalidSession)).toBe(false);
  });
});
```

### Integration Testing

```typescript
import { AUTH_SCENARIOS, ScenarioTester } from '@/lib/test-utils/user-scenario-simulation';

describe('Authentication Integration', () => {
  it('should handle successful login flow', async () => {
    await ScenarioTester.testAuthenticationScenario(
      'SUCCESSFUL_LOGIN',
      async (setup) => {
        // Test login API call
        const response = await signIn(setup.credentials);
        expect(response).toBeDefined();
        
        // Test session creation
        const session = await getSession();
        expect(session).toEqual(setup.expectedSession);
      }
    );
  });
});
```

### End-to-End Testing

```typescript
import { USER_SCENARIOS, SessionLifecycleSimulator } from '@/lib/test-utils/user-scenario-simulation';

describe('User Journey Testing', () => {
  it('should simulate expert user workflow', () => {
    const user = USER_SCENARIOS.EXPERT_USER;
    const simulator = new SessionLifecycleSimulator(user);
    
    // Simulate complete user journey
    simulator.simulateActivity();
    const session = simulator.getSession();
    const activity = simulator.getActivityLog();
    
    // Verify journey completion
    expect(activity.length).toBeGreaterThan(5);
    expect(session.user.subscriptionTier).toBe('expert');
  });
});
```

## Middleware Testing

### Request Simulation

```typescript
import { createMiddlewareRequest } from '@/lib/test-utils/advanced-session-mocks';

describe('Middleware Authentication', () => {
  it('should authenticate valid session', () => {
    const session = createRealisticSession({ subscriptionTier: 'expert' });
    const request = createMiddlewareRequest('/dashboard', session, 'production');
    
    // Test middleware behavior
    const response = await middleware(request);
    expect(response.status).not.toBe(401);
  });
});
```

## API Testing

### Session Cookie Testing

```typescript
import { createSessionCookies, createRequestWithSession } from '@/lib/test-utils/advanced-session-mocks';

describe('API Session Handling', () => {
  it('should handle session cookies correctly', () => {
    const session = createRealisticSession({ subscriptionTier: 'guild' });
    const cookies = createSessionCookies(session, 'production');
    const headers = createRequestWithSession(session, 'production');
    
    expect(cookies).toHaveProperty('__Secure-next-auth.session-token');
    expect(headers.get('cookie')).toContain('__Secure-next-auth.session-token');
  });
});
```

## Best Practices

### 1. Use Realistic Data
```typescript
// Good - Realistic subscription tier
const session = createRealisticSession({
  subscriptionTier: 'expert' // Valid tier
});

// Bad - Invalid subscription tier
const session = createRealisticSession({
  subscriptionTier: 'premium' // Invalid tier
});
```

### 2. Test All Environments
```typescript
// Test both production and development
const environments = ['production', 'development'] as const;

environments.forEach(env => {
  const session = createRealisticSession({
    environment: env
  });
  // Test environment-specific behavior
});
```

### 3. Validate Session Structure
```typescript
// Always validate session structure
if (SessionValidation.isValidSession(session)) {
  // Proceed with testing
} else {
  throw new Error('Invalid session structure');
}
```

### 4. Test Edge Cases
```typescript
// Test session expiration
const expiredSession = createExpiredSession();
expect(SessionValidation.isExpired(expiredSession)).toBe(true);

// Test soon-to-expire sessions
const soonToExpire = createSoonToExpireSession();
expect(SessionValidation.expiresWithin(soonToExpire, 60)).toBe(true);
```

### 5. Use Scenario Testing
```typescript
// Test complete user workflows
await ScenarioTester.testAuthenticationScenario(
  'SESSION_EXPIRATION_DURING_USE',
  async (setup) => {
    // Test expiration handling
    expect(setup.expectedBehavior).toBe('redirect_to_login');
  }
);
```

## Migration Guide

### From Legacy Mocks

**Before:**
```typescript
import { createMockSession } from '@/lib/test-utils/session-mocks';

const session = createMockSession({
  user: { id: 'user123', subscriptionTier: 'premium' } // Invalid tier
});
```

**After:**
```typescript
import { createRealisticSession } from '@/lib/test-utils/advanced-session-mocks';

const session = createRealisticSession({
  subscriptionTier: 'expert' // Valid tier
});
```

### Backwards Compatibility

The new utilities maintain backwards compatibility with existing code:

```typescript
import { LegacySessionMocks } from '@/lib/test-utils/advanced-session-mocks';

// Legacy functions still work
const session = LegacySessionMocks.createMockSession({
  subscriptionTier: 'expert'
});
```

## Troubleshooting

### Common Issues

1. **Invalid Subscription Tier**
   - Ensure you're using valid tiers: `['free', 'seasoned', 'expert', 'master', 'guild']`
   - Avoid invalid tiers like `'premium'` or `'basic'`

2. **Session Structure Validation**
   - Use `SessionValidation.isValidSession()` to validate session structure
   - Check for required fields: `user.id`, `user.email`, `user.subscriptionTier`, `expires`

3. **Environment Configuration**
   - Use `setupProductionEnvironment()` or `setupDevelopmentEnvironment()` for testing
   - Ensure proper environment variables are set

4. **JWT Token Validation**
   - Use `SessionValidation.isValidJWTToken()` to validate token structure
   - Check for required fields: `sub`, `email`, `subscriptionTier`, `iat`, `exp`, `jti`

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Enable debug mode
process.env.NODE_ENV = 'development';
process.env.DEBUG = 'next-auth:*';
```

## Performance Considerations

### Memory Usage
- Large session data can impact performance
- Use appropriate session sizes for testing
- Clean up test sessions after use

### Concurrent Testing
- Use unique user IDs for concurrent tests
- Avoid session conflicts between tests
- Clean up test data properly

### API Rate Limiting
- Simulate realistic API usage patterns
- Test rate limiting behavior
- Handle rate limiting responses appropriately

## Security Considerations

### Session Security
- Always test with secure cookie settings in production
- Validate session structure before use
- Test session expiration and invalidation

### JWT Security
- Test JWT token validation
- Verify token signature validation
- Test token tampering scenarios

### Input Validation
- Validate all session data
- Test for injection attempts
- Verify user permissions

## Contributing

### Adding New Scenarios
1. Define scenario in appropriate scenario file
2. Add comprehensive documentation
3. Include test cases
4. Update this documentation

### Adding New User Types
1. Define user in `USER_SCENARIOS`
2. Specify behavior patterns
3. Add session preferences
4. Include test scenarios

### Testing Guidelines
1. Test all subscription tiers
2. Test both production and development environments
3. Include edge case testing
4. Validate all session structures

## API Reference

### Types

#### `SessionOptions`
```typescript
interface SessionOptions {
  userId?: string;
  email?: string;
  subscriptionTier?: SubscriptionTier;
  name?: string;
  firstName?: string;
  lastName?: string;
  expiresInSeconds?: number;
  isExpired?: boolean;
  environment?: 'production' | 'development';
}
```

#### `NextAuthSession`
```typescript
interface NextAuthSession {
  user: {
    id: string;
    email: string;
    name?: string;
    subscriptionTier: SubscriptionTier;
  };
  expires: string;
}
```

#### `JWTToken`
```typescript
interface JWTToken {
  sub: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  name?: string;
  iat: number;
  exp: number;
  jti: string;
  firstName?: string;
  lastName?: string;
}
```

### Functions

#### Session Creation
- `createRealisticSession(options: SessionOptions): NextAuthSession`
- `createRealisticJWTToken(options: SessionOptions): JWTToken`
- `createRealisticUserProfile(overrides: Partial<UserProfile>): UserProfile`
- `createExpiredSession(): NextAuthSession`
- `createSoonToExpireSession(): NextAuthSession`

#### Subscription Utilities
- `createSubscriptionTierSessions(): Record<SubscriptionTier, NextAuthSession>`
- `createSubscriptionTierTokens(): Record<SubscriptionTier, JWTToken>`

#### Environment Setup
- `setupProductionEnvironment(): void`
- `setupDevelopmentEnvironment(): void`

#### Validation
- `SessionValidation.isValidSession(session: any): boolean`
- `SessionValidation.isValidJWTToken(token: any): boolean`
- `SessionValidation.isExpired(session: NextAuthSession): boolean`
- `SessionValidation.expiresWithin(session: NextAuthSession, minutes: number): boolean`

#### Request Simulation
- `createMiddlewareRequest(pathname: string, session?: NextAuthSession, environment?: string): NextRequest`
- `createRequestWithSession(session: NextAuthSession, environment?: string): Headers`
- `createSessionCookies(session: NextAuthSession, environment?: string): Record<string, string>`

## Examples

### Complete Test Suite Example

```typescript
import { 
  createRealisticSession, 
  createRealisticJWTToken,
  SessionValidation,
  USER_SCENARIOS,
  AUTH_SCENARIOS,
  ScenarioTester 
} from '@/lib/test-utils/advanced-session-mocks';
import { SessionLifecycleSimulator } from '@/lib/test-utils/user-scenario-simulation';

describe('Complete Authentication Testing', () => {
  describe('Session Management', () => {
    it('should create valid sessions for all subscription tiers', () => {
      const tierSessions = createSubscriptionTierSessions();
      
      Object.entries(tierSessions).forEach(([tier, session]) => {
        expect(SessionValidation.isValidSession(session)).toBe(true);
        expect(session.user.subscriptionTier).toBe(tier);
      });
    });

    it('should handle session expiration correctly', () => {
      const session = createExpiredSession();
      expect(SessionValidation.isExpired(session)).toBe(true);
    });
  });

  describe('User Behavior Simulation', () => {
    it('should simulate expert user behavior patterns', () => {
      const user = USER_SCENARIOS.EXPERT_USER;
      const simulator = new SessionLifecycleSimulator(user);
      
      simulator.simulateActivity();
      const activity = simulator.getActivityLog();
      
      expect(activity.length).toBeGreaterThan(0);
      expect(activity.every(a => a.action)).toBe(true);
    });
  });

  describe('Authentication Flows', () => {
    it('should handle successful login flow', async () => {
      await ScenarioTester.testAuthenticationScenario(
        'SUCCESSFUL_LOGIN',
        async (setup) => {
          expect(setup.expectedSession).toBeDefined();
          expect(setup.expectedToken).toBeDefined();
          expect(SessionValidation.isValidSession(setup.expectedSession)).toBe(true);
          expect(SessionValidation.isValidJWTToken(setup.expectedToken)).toBe(true);
        }
      );
    });
  });
});
```

This comprehensive documentation provides everything needed to effectively use the advanced session mock utilities for
testing authentication systems with realistic session simulation.
