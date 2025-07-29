import {
  SHARED_API_TEST_CONSTANTS,
  createMockSession,
  createMockJwtToken,
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  setupNextAuthMocks,
  setupUnauthenticatedState,
  setupAPITestWithAuth,
} from '../shared-api-test-helpers';

// Mock NextAuth
const mockAuth = jest.fn();
const mockGetToken = jest.fn();

describe('Shared API Test Helpers - NextAuth Session Simulation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mock Session Factories', () => {
    describe('createMockSession', () => {
      it('should create a standard mock session with default values', () => {
        const session = createMockSession();

        expect(session).toEqual({
          user: {
            id: SHARED_API_TEST_CONSTANTS.TEST_USER_ID,
            email: SHARED_API_TEST_CONSTANTS.TEST_EMAIL,
            name: SHARED_API_TEST_CONSTANTS.TEST_USER_NAME,
            subscriptionTier: SHARED_API_TEST_CONSTANTS.TEST_SUBSCRIPTION_TIER,
          },
          expires: '2024-12-31T23:59:59.999Z',
        });
      });

      it('should create a mock session with custom user ID', () => {
        const customUserId = '507f1f77bcf86cd799439999';
        const session = createMockSession(customUserId);

        expect(session.user.id).toBe(customUserId);
        expect(session.user.email).toBe(SHARED_API_TEST_CONSTANTS.TEST_EMAIL);
      });

      it('should allow overriding user properties', () => {
        const session = createMockSession(undefined, {
          user: {
            email: 'custom@example.com',
            subscriptionTier: 'premium',
          },
        });

        expect(session.user.email).toBe('custom@example.com');
        expect(session.user.subscriptionTier).toBe('premium');
        expect(session.user.id).toBe(SHARED_API_TEST_CONSTANTS.TEST_USER_ID);
        expect(session.user.name).toBe(SHARED_API_TEST_CONSTANTS.TEST_USER_NAME);
      });

      it('should allow overriding session properties', () => {
        const customExpires = '2025-01-01T00:00:00.000Z';
        const session = createMockSession(undefined, {
          expires: customExpires,
        });

        expect(session.expires).toBe(customExpires);
      });
    });

    describe('createMockJwtToken', () => {
      it('should create a standard JWT token with default values', () => {
        const token = createMockJwtToken();

        expect(token).toEqual(
          expect.objectContaining({
            sub: SHARED_API_TEST_CONSTANTS.TEST_USER_ID,
            email: SHARED_API_TEST_CONSTANTS.TEST_EMAIL,
            subscriptionTier: SHARED_API_TEST_CONSTANTS.TEST_SUBSCRIPTION_TIER,
            firstName: 'John',
            lastName: 'Doe',
            jti: 'test-jwt-id',
          })
        );

        expect(typeof token.iat).toBe('number');
        expect(typeof token.exp).toBe('number');
        expect(token.exp).toBeGreaterThan(token.iat);
      });

      it('should create a JWT token with custom user ID', () => {
        const customUserId = '507f1f77bcf86cd799439999';
        const token = createMockJwtToken(customUserId);

        expect(token.sub).toBe(customUserId);
      });

      it('should allow overriding token properties', () => {
        const token = createMockJwtToken(undefined, {
          email: 'custom@example.com',
          subscriptionTier: 'enterprise',
          firstName: 'Jane',
        });

        expect(token.email).toBe('custom@example.com');
        expect(token.subscriptionTier).toBe('enterprise');
        expect(token.firstName).toBe('Jane');
        expect(token.lastName).toBe('Doe'); // Should retain default
      });
    });
  });

  describe('NextAuth Mock Setup Functions', () => {
    describe('setupNextAuthMocks', () => {
      it('should setup auth mock to return a session', async () => {
        setupNextAuthMocks(mockAuth, mockGetToken);

        // Test that the mock returns the expected session
        const session = await mockAuth();
        expect(session).toEqual(
          expect.objectContaining({
            user: expect.objectContaining({
              id: SHARED_API_TEST_CONSTANTS.TEST_USER_ID,
            }),
          })
        );
      });

      it('should setup getToken mock when provided', async () => {
        setupNextAuthMocks(mockAuth, mockGetToken);

        // Test that the mock returns the expected token
        const token = await mockGetToken();
        expect(token).toEqual(
          expect.objectContaining({
            sub: SHARED_API_TEST_CONSTANTS.TEST_USER_ID,
          })
        );
      });

      it('should work without getToken mock', () => {
        expect(() => {
          setupNextAuthMocks(mockAuth);
        }).not.toThrow();

        // Verify the mock is set up (it should be callable and return a session)
        expect(mockAuth.getMockImplementation()).toBeDefined();
      });

      it('should use custom user ID when provided', async () => {
        const customUserId = '507f1f77bcf86cd799439999';
        setupNextAuthMocks(mockAuth, mockGetToken, customUserId);

        const session = await mockAuth();
        const token = await mockGetToken();

        expect(session).toEqual(
          expect.objectContaining({
            user: expect.objectContaining({
              id: customUserId,
            }),
          })
        );

        expect(token).toEqual(
          expect.objectContaining({
            sub: customUserId,
          })
        );
      });
    });

    describe('setupUnauthenticatedState', () => {
      it('should setup auth mock to return null', async () => {
        setupUnauthenticatedState(mockAuth, mockGetToken);

        const session = await mockAuth();
        expect(session).toBeNull();
      });

      it('should setup getToken mock to return null when provided', async () => {
        setupUnauthenticatedState(mockAuth, mockGetToken);

        const token = await mockGetToken();
        expect(token).toBeNull();
      });

      it('should work without getToken mock', async () => {
        expect(() => {
          setupUnauthenticatedState(mockAuth);
        }).not.toThrow();

        const session = await mockAuth();
        expect(session).toBeNull();
      });
    });

    describe('setupAPITestWithAuth', () => {
      it('should setup auth mock and clear all mocks', async () => {
        setupAPITestWithAuth(mockAuth);

        const session = await mockAuth();
        expect(session).toEqual(
          expect.objectContaining({
            user: expect.objectContaining({
              id: SHARED_API_TEST_CONSTANTS.TEST_USER_ID,
            }),
          })
        );
      });

      it('should use custom user ID when provided', async () => {
        const customUserId = '507f1f77bcf86cd799439999';
        setupAPITestWithAuth(mockAuth, undefined, customUserId);

        const session = await mockAuth();
        expect(session).toEqual(
          expect.objectContaining({
            user: expect.objectContaining({
              id: customUserId,
            }),
          })
        );
      });
    });
  });

  describe('Request Builders', () => {
    describe('createAuthenticatedRequest', () => {
      it('should create a request without setting up mocks when no mockAuth provided', () => {
        const request = createAuthenticatedRequest('http://localhost:3000/api/test');

        expect(request).toBeDefined();
        expect(request.method).toBe('GET');
        expect(mockAuth).not.toHaveBeenCalled();
      });

      it('should setup auth mock when provided', async () => {
        const request = createAuthenticatedRequest(
          'http://localhost:3000/api/test',
          {},
          mockAuth
        );

        expect(request).toBeDefined();
        
        const session = await mockAuth();
        expect(session).toEqual(
          expect.objectContaining({
            user: expect.objectContaining({
              id: SHARED_API_TEST_CONSTANTS.TEST_USER_ID,
            }),
          })
        );
      });

      it('should use custom user ID when provided', async () => {
        const customUserId = '507f1f77bcf86cd799439999';
        const request = createAuthenticatedRequest(
          'http://localhost:3000/api/test',
          {},
          mockAuth,
          customUserId
        );

        const session = await mockAuth();
        expect(session).toEqual(
          expect.objectContaining({
            user: expect.objectContaining({
              id: customUserId,
            }),
          })
        );
      });

      it('should handle method and body options', () => {
        const testData = { name: 'Test' };
        const request = createAuthenticatedRequest(
          'http://localhost:3000/api/test',
          { method: 'POST', body: testData },
          mockAuth
        );

        expect(request.method).toBe('POST');
      });
    });

    describe('createUnauthenticatedRequest', () => {
      it('should create a request without setting up mocks when no mockAuth provided', () => {
        const request = createUnauthenticatedRequest('http://localhost:3000/api/test');

        expect(request).toBeDefined();
        expect(request.method).toBe('GET');
        expect(mockAuth).not.toHaveBeenCalled();
      });

      it('should setup auth mock to return null when provided', async () => {
        const request = createUnauthenticatedRequest(
          'http://localhost:3000/api/test',
          {},
          mockAuth
        );

        expect(request).toBeDefined();
        
        const session = await mockAuth();
        expect(session).toBeNull();
      });

      it('should handle method and body options', () => {
        const testData = { name: 'Test' };
        const request = createUnauthenticatedRequest(
          'http://localhost:3000/api/test',
          { method: 'POST', body: testData },
          mockAuth
        );

        expect(request.method).toBe('POST');
      });
    });
  });

  describe('Constants', () => {
    it('should provide consistent test constants', () => {
      expect(SHARED_API_TEST_CONSTANTS.TEST_USER_ID).toBe('507f1f77bcf86cd799439011');
      expect(SHARED_API_TEST_CONSTANTS.TEST_EMAIL).toBe('test@example.com');
      expect(SHARED_API_TEST_CONSTANTS.DEFAULT_USER_ID).toBe('507f1f77bcf86cd799439011');
      expect(SHARED_API_TEST_CONSTANTS.TEST_SUBSCRIPTION_TIER).toBe('free');
      expect(SHARED_API_TEST_CONSTANTS.TEST_USER_NAME).toBe('John Doe');
    });
  });
});