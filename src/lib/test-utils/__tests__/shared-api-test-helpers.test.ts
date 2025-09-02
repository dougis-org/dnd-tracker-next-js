
import {
  createMockSession,
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  setupClerkMocks,
  setupUnauthenticatedState,
  createMockRequest,
} from '../shared-api-test-helpers';
import { SHARED_API_TEST_CONSTANTS } from '@/lib/test-utils/shared-test-constants';

const mockAuth = jest.fn();

describe('Shared API Test Helpers - Clerk Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMockSession', () => {
    it('should create a Clerk-compatible mock session with a userId', () => {
      const session = createMockSession(SHARED_API_TEST_CONSTANTS.TEST_USER_ID);
      expect(session).toHaveProperty('userId', SHARED_API_TEST_CONSTANTS.TEST_USER_ID);
      expect(session).toHaveProperty('sessionClaims');
      expect(session.sessionClaims).toHaveProperty('sub', SHARED_API_TEST_CONSTANTS.TEST_USER_ID);
    });

    it('should allow overriding session properties', () => {
      const customUserId = 'custom-user-456';
      const session = createMockSession(customUserId, {
        publicMetadata: { role: 'admin' },
      });
      expect(session.userId).toBe(customUserId);
      expect(session.publicMetadata.role).toBe('admin');
    });
  });

  describe('setupClerkMocks', () => {
    it('should set up the auth mock to return an authenticated session', async () => {
      setupClerkMocks(mockAuth, undefined, SHARED_API_TEST_CONSTANTS.TEST_USER_ID);
      const session = await mockAuth();
      expect(session).toHaveProperty('userId', SHARED_API_TEST_CONSTANTS.TEST_USER_ID);
    });
  });

  describe('setupUnauthenticatedState', () => {
    it('should set up the auth mock to return a null session', async () => {
      setupUnauthenticatedState(mockAuth);
      const session = await mockAuth();
      expect(session).toBeNull();
    });
  });

  describe('Request Builders', () => {
    describe('createAuthenticatedRequest', () => {
      it('should create a request and set up the auth mock for an authenticated state', async () => {
        const request = createAuthenticatedRequest(
          'http://localhost:3000/api/test',
          {},
          mockAuth,
          SHARED_API_TEST_CONSTANTS.TEST_USER_ID
        );
        const session = await mockAuth();
        expect(request).toBeDefined();
        expect(session).toHaveProperty('userId', SHARED_API_TEST_CONSTANTS.TEST_USER_ID);
      });
    });

    describe('createUnauthenticatedRequest', () => {
      it('should create a request and set up the auth mock for an unauthenticated state', async () => {
        const request = createUnauthenticatedRequest(
          'http://localhost:3000/api/test',
          {},
          mockAuth
        );
        const session = await mockAuth();
        expect(request).toBeDefined();
        expect(session).toBeNull();
      });
    });
  });

  describe('createMockRequest', () => {
    it('should create a mock request with the provided data and method', async () => {
      const testData = { key: 'value' };
      const request = createMockRequest(testData, 'POST');
      const json = await request.json();

      expect(request.method).toBe('POST');
      expect(json).toEqual(testData);
    });
  });
});
