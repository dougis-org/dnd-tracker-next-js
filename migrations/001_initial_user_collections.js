/**
 * Migration: Create initial user collection indexes
 * Version: 001
 * Created: 2025-01-12T00:00:00.000Z
 *
 * Note: Collections (users, accounts, sessions, verification_tokens) are created
 * automatically by NextAuth.js when first accessed. This migration only creates
 * the necessary indexes for optimal performance and data integrity.
 */

/* eslint-env node */
module.exports = {
  version: '001',
  description: 'Create initial user collection indexes',

  /**
   * Apply migration
   * @param {import('mongodb').Db} db
   */
  async up(db) {
    // Create users collection with indexes
    const usersCollection = db.collection('users');

    // Create unique indexes for email and username
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true });

    // Create index for faster lookups
    await usersCollection.createIndex({ createdAt: 1 });
    await usersCollection.createIndex({ updatedAt: 1 });

    // Create accounts collection for NextAuth
    const accountsCollection = db.collection('accounts');
    await accountsCollection.createIndex({ provider: 1, providerAccountId: 1 }, { unique: true });
    await accountsCollection.createIndex({ userId: 1 });

    // Create sessions collection for NextAuth
    const sessionsCollection = db.collection('sessions');
    await sessionsCollection.createIndex({ sessionToken: 1 }, { unique: true });
    await sessionsCollection.createIndex({ userId: 1 });
    await sessionsCollection.createIndex({ expires: 1 });

    // Create verification tokens collection for NextAuth
    const verificationTokensCollection = db.collection('verificationtokens');
    await verificationTokensCollection.createIndex({ identifier: 1, token: 1 }, { unique: true });
    await verificationTokensCollection.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
  },

  /**
   * Rollback migration
   * @param {import('mongodb').Db} db
   */
  async down(db) {
    // Drop indexes from users collection
    const usersCollection = db.collection('users');
    await usersCollection.dropIndex({ email: 1 });
    await usersCollection.dropIndex({ username: 1 });
    await usersCollection.dropIndex({ createdAt: 1 });
    await usersCollection.dropIndex({ updatedAt: 1 });

    // Drop indexes from accounts collection
    const accountsCollection = db.collection('accounts');
    await accountsCollection.dropIndex({ provider: 1, providerAccountId: 1 });
    await accountsCollection.dropIndex({ userId: 1 });

    // Drop indexes from sessions collection
    const sessionsCollection = db.collection('sessions');
    await sessionsCollection.dropIndex({ sessionToken: 1 });
    await sessionsCollection.dropIndex({ userId: 1 });
    await sessionsCollection.dropIndex({ expires: 1 });

    // Drop indexes from verification tokens collection
    const verificationTokensCollection = db.collection('verificationtokens');
    await verificationTokensCollection.dropIndex({ identifier: 1, token: 1 });
    await verificationTokensCollection.dropIndex({ expires: 1 });
  }
};