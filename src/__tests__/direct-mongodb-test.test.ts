/**
 * Test direct MongoDB connection without User model
 */
import { describe, it } from '@jest/globals';
import mongoose from 'mongoose';

describe('Direct MongoDB Test', () => {
  it('should connect to MongoDB and query users collection directly', async () => {
    try {
      console.log('Testing direct MongoDB connection...');

      const mongoUri = process.env.MONGODB_URI;
      const dbName = process.env.MONGODB_DB_NAME;

      console.log('MongoDB URI configured:', !!mongoUri);
      console.log('Database name:', dbName);

      if (!mongoUri) {
        console.error('MONGODB_URI not found');
        return;
      }

      // Connect directly
      await mongoose.connect(mongoUri, { dbName });
      console.log('Connected to MongoDB successfully');

      // Query users collection directly
      const usersCollection = mongoose.connection.db?.collection('users');

      if (usersCollection) {
        console.log('Users collection found');

        // Check if our test user exists
        const testUser = await usersCollection.findOne({ email: 'doug@dougis.com' });
        console.log('Test user found:', !!testUser);

        if (testUser) {
          console.log('User details:', {
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            hasPasswordHash: !!testUser.passwordHash,
            passwordHashLength: testUser.passwordHash?.length,
            isEmailVerified: testUser.isEmailVerified
          });
        }

        // Count total users
        const userCount = await usersCollection.countDocuments();
        console.log('Total users in database:', userCount);
      } else {
        console.log('Users collection not found');
      }

      await mongoose.connection.close();
      console.log('MongoDB connection closed');

    } catch (error) {
      console.error('Direct MongoDB test error:', error);
    }
  });
});