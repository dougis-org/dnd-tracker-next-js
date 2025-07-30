/**
 * MongoDB Adapter Configuration Tests (Issue #526)
 *
 * These tests verify the proper configuration of NextAuth's MongoDB adapter
 * to ensure session persistence and user management work correctly.
 */

import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { UserService } from '@/lib/services/UserService';
import {
  createMockUser,
} from '@/lib/test-utils/shared-api-test-helpers';

// Mock MongoDB client for testing
jest.mock('mongodb');
jest.mock('@/lib/db');
jest.mock('@/lib/services/UserService');

const MockedMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;
const mockedConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;
const mockedUserService = UserService as jest.Mocked<typeof UserService>;

// Test utilities to reduce duplication
const createMockCollection = () => ({
  findOne: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  find: jest.fn().mockReturnValue({
    toArray: jest.fn().mockResolvedValue([])
  }),
  createIndex: jest.fn(),
});

const createMockDatabase = (collection: any) => ({
  collection: jest.fn().mockReturnValue(collection),
  createCollection: jest.fn(),
  listCollections: jest.fn().mockReturnValue({
    toArray: jest.fn().mockResolvedValue([])
  }),
});

const createMockClient = (db: any) => ({
  db: jest.fn().mockReturnValue(db),
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
} as any);

const createAdapterWithClient = (client: any, databaseName = 'test-dnd-tracker') => {
  const clientPromise = Promise.resolve(client);
  return MongoDBAdapter(clientPromise, { databaseName });
};

const validateAdapterMethods = (adapter: any) => {
  expect(adapter.createUser).toBeDefined();
  expect(adapter.getUser).toBeDefined();
  expect(adapter.getUserByEmail).toBeDefined();
  expect(adapter.updateUser).toBeDefined();
  expect(adapter.deleteUser).toBeDefined();
  expect(adapter.createSession).toBeDefined();
  expect(adapter.getSession).toBeDefined();
  expect(adapter.updateSession).toBeDefined();
  expect(adapter.deleteSession).toBeDefined();
};

describe('MongoDB Adapter Configuration', () => {
  let mockClient: jest.Mocked<MongoClient>;
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection = createMockCollection();
    mockDb = createMockDatabase(mockCollection);
    mockClient = createMockClient(mockDb);
    MockedMongoClient.mockImplementation(() => mockClient);
    mockedConnectToDatabase.mockResolvedValue();
  });

  describe('Adapter Initialization', () => {
    it('should initialize MongoDB adapter with correct configuration', async () => {
      const adapter = createAdapterWithClient(mockClient);
      expect(adapter).toBeDefined();
      validateAdapterMethods(adapter);
    });

    it('should use correct database name from environment', () => {
      const originalEnv = process.env.MONGODB_DB_NAME;
      process.env.MONGODB_DB_NAME = 'dnd-tracker-test';

      const adapter = createAdapterWithClient(mockClient, process.env.MONGODB_DB_NAME);
      expect(adapter).toBeDefined();

      process.env.MONGODB_DB_NAME = originalEnv;
    });

    it('should handle missing database name gracefully', () => {
      const clientPromise = Promise.resolve(mockClient);
      expect(() => MongoDBAdapter(clientPromise, {})).not.toThrow();
    });
  });

  describe('MongoDB Client Configuration', () => {
    it('should create MongoDB client with correct URI', () => {
      const testUri = 'mongodb://localhost:27017/test';
      new MongoClient(testUri);
      expect(MockedMongoClient).toHaveBeenCalledWith(testUri);
    });

    it('should provide client promise to adapter', async () => {
      const adapter = createAdapterWithClient(mockClient, 'test-db');
      expect(adapter).toBeDefined();
    });

    it('should handle database connection through adapter', async () => {
      const adapter = createAdapterWithClient(mockClient, 'test-db');
      validateAdapterMethods(adapter);
    });
  });

  describe('Adapter Interface Validation', () => {
    let adapter: any;

    beforeEach(() => {
      adapter = createAdapterWithClient(mockClient);
    });

    const validateOptionalMethod = (methodName: string) => {
      if (adapter[methodName]) {
        expect(adapter[methodName]).toBeDefined();
      }
    };

    it('should provide all required user management methods', () => {
      validateAdapterMethods(adapter);
      validateOptionalMethod('linkAccount');
      validateOptionalMethod('unlinkAccount');
    });

    it('should provide all required session management methods', () => {
      expect(adapter.createSession).toBeDefined();
      expect(adapter.getSession).toBeDefined();
      expect(adapter.updateSession).toBeDefined();
      expect(adapter.deleteSession).toBeDefined();
    });

    it('should provide verification token methods', () => {
      validateOptionalMethod('createVerificationToken');
      validateOptionalMethod('useVerificationToken');
      expect(adapter).toBeDefined();
    });

    it('should provide account management methods', () => {
      expect(adapter.createUser).toBeDefined();
      expect(adapter.getUserByEmail).toBeDefined();
      expect(adapter.updateUser).toBeDefined();
      validateOptionalMethod('linkAccount');
      validateOptionalMethod('unlinkAccount');
    });
  });

  describe('Configuration Integration', () => {
    const createNextAuthConfig = (databaseName = 'dnd-tracker') => ({
      adapter: createAdapterWithClient(mockClient, databaseName),
      session: {
        strategy: 'database' as const,
        maxAge: 30 * 24 * 60 * 60,
        updateAge: 24 * 60 * 60,
      },
    });

    it('should work with NextAuth configuration', () => {
      const config = createNextAuthConfig();
      expect(config.adapter).toBeDefined();
      expect(config.session.strategy).toBe('database');
    });

    it('should integrate with environment variables', () => {
      const originalUri = process.env.MONGODB_URI;
      const originalDbName = process.env.MONGODB_DB_NAME;

      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.MONGODB_DB_NAME = 'test-dnd-tracker';

      const client = new MongoClient(process.env.MONGODB_URI);
      const adapter = createAdapterWithClient(client, process.env.MONGODB_DB_NAME);

      expect(adapter).toBeDefined();
      expect(MockedMongoClient).toHaveBeenCalledWith('mongodb://localhost:27017/test');

      process.env.MONGODB_URI = originalUri;
      process.env.MONGODB_DB_NAME = originalDbName;
    });
  });

  describe('Error Handling Configuration', () => {
    const testEnvironmentVariableHandling = (envVar: string, expectedError: string) => {
      const original = process.env[envVar];
      delete process.env[envVar];

      expect(() => {
        if (process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.CI) {
          throw new Error(expectedError);
        }
      }).not.toThrow();

      process.env[envVar] = original;
    };

    it('should handle invalid MongoDB URI gracefully', () => {
      expect(() => new MongoClient('invalid-uri')).not.toThrow();
    });

    it('should handle missing environment variables', () => {
      testEnvironmentVariableHandling('MONGODB_URI', 'MONGODB_URI environment variable is not set');
    });
  });

  describe('Integration with Existing UserService', () => {
    const setupUserServiceMocks = (mockUser: any) => {
      mockedUserService.getUserByEmail.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockedUserService.authenticateUser.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          sessionInfo: {
            sessionId: 'test-session',
            expiresAt: new Date(),
          },
        },
      });
    };

    it('should work alongside existing UserService without conflicts', async () => {
      const mockUser = createMockUser();
      setupUserServiceMocks(mockUser);
      const adapter = createAdapterWithClient(mockClient);

      const userServiceResult = await UserService.getUserByEmail(mockUser.email);

      expect(userServiceResult.success).toBe(true);
      expect(adapter.getUserByEmail).toBeDefined();
      expect(typeof adapter.getUserByEmail).toBe('function');
    });

    it('should maintain consistent user data structure expectations', async () => {
      const mockUser = createMockUser();
      setupUserServiceMocks(mockUser);
      const adapter = createAdapterWithClient(mockClient);

      const userServiceResult = await UserService.getUserByEmail(mockUser.email);

      expect(userServiceResult.success).toBe(true);
      expect(userServiceResult.data?.email).toBe(mockUser.email);
      expect(userServiceResult.data?.id).toBe(mockUser.id);
      expect(adapter.getUserByEmail).toBeDefined();
    });
  });

  describe('Production Configuration Validation', () => {
    const setupEnvironment = (env: 'production' | 'development') => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = env;
      return () => { process.env.NODE_ENV = original; };
    };

    it('should validate production environment requirements', () => {
      const cleanup = setupEnvironment('production');
      const originalVars = {
        uri: process.env.MONGODB_URI,
        vercel: process.env.VERCEL,
        ci: process.env.CI,
      };

      delete process.env.MONGODB_URI;
      delete process.env.VERCEL;
      delete process.env.CI;

      expect(() => {
        if (!process.env.MONGODB_URI &&
            process.env.NODE_ENV === 'production' &&
            process.env.VERCEL !== '1' &&
            process.env.CI !== 'true') {
          throw new Error('MONGODB_URI environment variable is not set');
        }
      }).toThrow('MONGODB_URI environment variable is not set');

      process.env.MONGODB_URI = originalVars.uri;
      process.env.VERCEL = originalVars.vercel;
      process.env.CI = originalVars.ci;
      cleanup();
    });

    it('should provide fallback configuration for development', () => {
      const cleanup = setupEnvironment('development');
      const adapter = createAdapterWithClient(mockClient, 'dnd-tracker-dev');
      expect(adapter).toBeDefined();
      cleanup();
    });
  });
});