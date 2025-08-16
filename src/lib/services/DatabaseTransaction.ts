import mongoose, { ClientSession } from 'mongoose';
import { connectToDatabase } from '../db';

/**
 * Database transaction utility for ensuring atomic operations
 * Wraps multiple database writes in MongoDB sessions/transactions
 */
export class DatabaseTransaction {

  /**
   * Execute operations within a MongoDB transaction
   * Ensures all operations succeed or all operations are rolled back
   */
  static async withTransaction<T>(
    operation: (_session: ClientSession) => Promise<T>
  ): Promise<T> {
    // Ensure database connection
    await connectToDatabase();

    // Start a session for the transaction
    const session = await mongoose.startSession();

    try {
      // Execute the operation within a transaction
      const result = await session.withTransaction(async () => {
        return await operation(session);
      });

      return result;
    } finally {
      // Always end the session
      await session.endSession();
    }
  }

  /**
   * Execute operations within a transaction with manual session management
   * Provides more control over the transaction lifecycle
   */
  static async withSession<T>(
    operation: (_session: ClientSession) => Promise<T>
  ): Promise<T> {
    // Ensure database connection
    await connectToDatabase();

    // Start a session
    const session = await mongoose.startSession();

    try {
      // Start transaction
      session.startTransaction();

      try {
        // Execute the operation
        const result = await operation(session);

        // Commit the transaction
        await session.commitTransaction();

        return result;
      } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        throw error;
      }
    } finally {
      // Always end the session
      await session.endSession();
    }
  }

  /**
   * Check if transactions are supported by the current MongoDB deployment
   * MongoDB transactions require replica sets or sharded clusters
   */
  static async isTransactionSupported(): Promise<boolean> {
    try {
      await connectToDatabase();

      // Try to start a session to test transaction support
      const session = await mongoose.startSession();
      try {
        // Attempt to start a transaction
        session.startTransaction();
        await session.commitTransaction();
        return true;
      } catch {
        // Transactions not supported (standalone MongoDB instance)
        return false;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      console.warn('Unable to check transaction support:', error);
      return false;
    }
  }

  /**
   * Execute operations with transaction support if available, fallback to regular operations
   * This provides compatibility with both replica sets and standalone MongoDB instances
   */
  static async withFallback<T>(
    transactionOperation: (_session: ClientSession) => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    const supportsTransactions = await this.isTransactionSupported();

    if (supportsTransactions) {
      try {
        return await this.withTransaction(transactionOperation);
      } catch (error) {
        console.warn('Transaction failed, falling back to non-transactional operation:', error);
        return await fallbackOperation();
      }
    } else {
      // Fall back to non-transactional operation
      return await fallbackOperation();
    }
  }
}