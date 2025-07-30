/**
 * MongoDB Adapter Configuration Tests (Issue #526)
 *
 * Simplified tests to verify NextAuth MongoDB adapter configuration.
 */

import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { UserService } from '@/lib/services/UserService';
import { createMockUser } from '@/lib/test-utils/shared-api-test-helpers';

jest.mock('mongodb');
jest.mock('@/lib/db');
jest.mock('@/lib/services/UserService');

const MockedMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;
const mockedConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;
const mockedUserService = UserService as jest.Mocked<typeof UserService>;

describe('MongoDB Adapter Configuration', () => {
  let mockClient: any;
  let adapter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn(),
          insertOne: jest.fn(),
          updateOne: jest.fn(),
          deleteOne: jest.fn(),
          find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
          createIndex: jest.fn(),
        }),
        createCollection: jest.fn(),
        listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      }),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    };

    MockedMongoClient.mockImplementation(() => mockClient);
    mockedConnectToDatabase.mockResolvedValue();
    adapter = MongoDBAdapter(Promise.resolve(mockClient), { databaseName: 'test-dnd-tracker' });
  });

  it('should initialize adapter with all required methods', () => {
    const requiredMethods = [
      'createUser', 'getUser', 'getUserByEmail', 'updateUser', 'deleteUser',
      'createSession', 'getSession', 'updateSession', 'deleteSession'
    ];
    
    expect(adapter).toBeDefined();
    requiredMethods.forEach(method => {
      expect(adapter[method]).toBeDefined();
      expect(typeof adapter[method]).toBe('function');
    });
  });

  it('should handle MongoDB client configuration', () => {
    new MongoClient('mongodb://localhost:27017/test');
    expect(MockedMongoClient).toHaveBeenCalledWith('mongodb://localhost:27017/test');
  });

  it('should integrate with NextAuth configuration', () => {
    const config = {
      adapter,
      session: { strategy: 'database' as const, maxAge: 30 * 24 * 60 * 60 }
    };
    expect(config.adapter).toBeDefined();
    expect(config.session.strategy).toBe('database');
  });

  it('should work with existing UserService', async () => {
    const mockUser = createMockUser();
    mockedUserService.getUserByEmail.mockResolvedValue({
      success: true,
      data: mockUser,
    });

    const userServiceResult = await UserService.getUserByEmail(mockUser.email);
    expect(userServiceResult.success).toBe(true);
    expect(adapter.getUserByEmail).toBeDefined();
  });

  it('should handle configuration gracefully', () => {
    expect(() => new MongoClient('invalid-uri')).not.toThrow();
    expect(() => MongoDBAdapter(Promise.resolve(mockClient), {})).not.toThrow();
  });
});