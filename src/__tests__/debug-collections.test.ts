/**
 * Test to see what collections exist in the database
 */
import { describe, it } from '@jest/globals';
import mongoose from 'mongoose';

describe('Database Collections Check', () => {
  it('should list all collections in the database', async () => {
    try {
      console.log('Checking database collections...');

      const mongoUri = process.env.MONGODB_URI;
      const dbName = process.env.MONGODB_DB_NAME;

      if (!mongoUri) {
        console.error('MONGODB_URI not found');
        return;
      }

      // Connect directly
      await mongoose.connect(mongoUri, { dbName });
      console.log('Connected to MongoDB successfully');
      console.log('Database name:', dbName);

      // List all collections
      const collections = await mongoose.connection.db?.listCollections().toArray();

      if (collections && collections.length > 0) {
        console.log('Collections found:');
        collections.forEach(collection => {
          console.log(`- ${collection.name} (type: ${collection.type})`);
        });
      } else {
        console.log('No collections found in database');
      }

      // Try different possible collection names
      const possibleCollectionNames = ['users', 'user', 'Users', 'User', 'accounts', 'sessions'];

      for (const collectionName of possibleCollectionNames) {
        try {
          const collection = mongoose.connection.db?.collection(collectionName);
          if (collection) {
            const count = await collection.countDocuments();
            console.log(`Collection '${collectionName}': ${count} documents`);
          }
        } catch (error) {
          console.log(`Collection '${collectionName}': error accessing (${error})`);
        }
      }

      await mongoose.connection.close();
      console.log('MongoDB connection closed');

    } catch (error) {
      console.error('Database collections check error:', error);
    }
  });
});