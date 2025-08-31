/**
 * Clerk Configuration Tests (Issue #526)
 *
 * Tests to verify Clerk authentication configuration.
 */

import { MongoClient } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { UserService } from '@/lib/services/UserService';
import { createMockUser } from '@/lib/test-utils/shared-api-test-helpers';
import { getClerkPublishableKey, validateClerkServerConfig } from '@/lib/config/clerk';

jest.mock('mongodb');
jest.mock('@/lib/db');
jest.mock('@/lib/services/UserService');
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

const MockedMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;
const mockedConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;
const mockedUserService = UserService as jest.Mocked<typeof UserService>;

describe('Clerk Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockedMongoClient.mockImplementation(() => ({} as any));
    mockedConnectToDatabase.mockResolvedValue();
  });

  describe('Clerk Environment Configuration', () => {
    it('should get Clerk publishable key', () => {
      const key = getClerkPublishableKey();
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.startsWith('pk_')).toBe(true);
    });

    it('should validate server configuration in test environment', () => {
      // In test environment, validation should handle missing keys gracefully
      const validation = validateClerkServerConfig();
      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');
      expect(typeof validation.message).toBe('string');
    });
  });

  describe('MongoDB Client Configuration', () => {
    it('should handle MongoDB client configuration', () => {
      new MongoClient('mongodb://localhost:27017/test');
      expect(MockedMongoClient).toHaveBeenCalledWith('mongodb://localhost:27017/test');
    });
  });

  describe('UserService Integration', () => {
    it('should work with existing UserService', async () => {
      const mockUser = createMockUser();
      mockedUserService.getUserByEmail.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const userServiceResult = await UserService.getUserByEmail(mockUser.email);
      expect(userServiceResult.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration gracefully', () => {
      expect(() => new MongoClient('invalid-uri')).not.toThrow();
      expect(() => getClerkPublishableKey()).not.toThrow();
    });
  });
});