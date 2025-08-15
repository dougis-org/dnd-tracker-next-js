/**
 * Simple test to understand User model loading
 */
import { describe, it } from '@jest/globals';

describe('Simple Model Test', () => {
  it('should import User model directly', async () => {
    try {
      console.log('Direct import test...');
      const UserModel = (await import('@/lib/models/User')).default;
      console.log('User model imported:', !!UserModel);
      console.log('User model type:', typeof UserModel);
      console.log('User model methods:', Object.getOwnPropertyNames(UserModel));
      console.log('Static methods:', typeof UserModel.findByEmail);
    } catch (error) {
      console.error('User model import error:', error);
    }
  });

  it('should test direct database connection', async () => {
    try {
      console.log('Database connection test...');
      const { connectToDatabase } = await import('@/lib/db');
      await connectToDatabase();
      console.log('Database connected successfully');

      const UserModel = (await import('@/lib/models/User')).default;
      console.log('User model after DB connection:', !!UserModel);

      if (UserModel && typeof UserModel.findByEmail === 'function') {
        console.log('User model is functional');

        // Try to find any user
        const testUser = await UserModel.findByEmail('nonexistent@test.com');
        console.log('Test query result (should be null):', testUser);
      }
    } catch (error) {
      console.error('Database/model test error:', error);
    }
  });
});