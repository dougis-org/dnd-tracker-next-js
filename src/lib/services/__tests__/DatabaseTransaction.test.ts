import { DatabaseTransaction } from '../DatabaseTransaction';
import mongoose, { ClientSession } from 'mongoose';
import { connectToDatabase } from '../../db';

// Mock the database connection
jest.mock('../../db', () => ({
  connectToDatabase: jest.fn(),
}));

// Mock mongoose
jest.mock('mongoose', () => ({
  startSession: jest.fn(),
}));

describe('DatabaseTransaction', () => {
  let mockSession: jest.Mocked<ClientSession>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock session
    mockSession = {
      withTransaction: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    } as unknown as jest.Mocked<ClientSession>;

    (mongoose.startSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDatabase as jest.Mock).mockResolvedValue(undefined);
  });

  describe('withTransaction', () => {
    it('should execute operation within a transaction successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValue('test-result');
      mockSession.withTransaction.mockImplementation((callback) => callback());

      const result = await DatabaseTransaction.withTransaction(mockOperation);

      expect(connectToDatabase).toHaveBeenCalled();
      expect(mongoose.startSession).toHaveBeenCalled();
      expect(mockSession.withTransaction).toHaveBeenCalledWith(expect.any(Function));
      expect(mockOperation).toHaveBeenCalledWith(mockSession);
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result).toBe('test-result');
    });

    it('should end session even if operation fails', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(mockError);
      mockSession.withTransaction.mockImplementation((callback) => callback());

      await expect(DatabaseTransaction.withTransaction(mockOperation)).rejects.toThrow('Operation failed');

      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  describe('withSession', () => {
    it('should execute operation with manual session management successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValue('test-result');

      const result = await DatabaseTransaction.withSession(mockOperation);

      expect(connectToDatabase).toHaveBeenCalled();
      expect(mongoose.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalledWith(mockSession);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result).toBe('test-result');
    });

    it('should abort transaction and end session on operation failure', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(mockError);

      await expect(DatabaseTransaction.withSession(mockOperation)).rejects.toThrow('Operation failed');

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('isTransactionSupported', () => {
    it('should return true when transactions are supported', async () => {
      const result = await DatabaseTransaction.isTransactionSupported();

      expect(connectToDatabase).toHaveBeenCalled();
      expect(mongoose.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when transactions are not supported', async () => {
      mockSession.startTransaction.mockImplementation(() => {
        throw new Error('Transactions not supported');
      });

      const result = await DatabaseTransaction.isTransactionSupported();

      expect(result).toBe(false);
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should return false when unable to check transaction support', async () => {
      (connectToDatabase as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await DatabaseTransaction.isTransactionSupported();

      expect(result).toBe(false);
    });
  });

  describe('withFallback', () => {
    it('should use transaction when supported', async () => {
      const mockTransactionOperation = jest.fn().mockResolvedValue('transaction-result');
      const mockFallbackOperation = jest.fn().mockResolvedValue('fallback-result');

      // Mock transaction support check to return true
      mockSession.withTransaction.mockImplementation((callback) => callback());

      const result = await DatabaseTransaction.withFallback(
        mockTransactionOperation,
        mockFallbackOperation
      );

      expect(mockTransactionOperation).toHaveBeenCalledWith(mockSession);
      expect(mockFallbackOperation).not.toHaveBeenCalled();
      expect(result).toBe('transaction-result');
    });

    it('should fallback to non-transactional operation when transactions not supported', async () => {
      const mockTransactionOperation = jest.fn().mockResolvedValue('transaction-result');
      const mockFallbackOperation = jest.fn().mockResolvedValue('fallback-result');

      // Mock transaction support check to return false
      mockSession.startTransaction.mockImplementation(() => {
        throw new Error('Transactions not supported');
      });

      const result = await DatabaseTransaction.withFallback(
        mockTransactionOperation,
        mockFallbackOperation
      );

      expect(mockFallbackOperation).toHaveBeenCalled();
      expect(result).toBe('fallback-result');
    });

    it('should fallback when transaction operation fails', async () => {
      const mockTransactionOperation = jest.fn().mockRejectedValue(new Error('Transaction failed'));
      const mockFallbackOperation = jest.fn().mockResolvedValue('fallback-result');

      // Mock transaction support check to return true
      mockSession.withTransaction.mockImplementation((callback) => callback());

      const result = await DatabaseTransaction.withFallback(
        mockTransactionOperation,
        mockFallbackOperation
      );

      expect(mockTransactionOperation).toHaveBeenCalledWith(mockSession);
      expect(mockFallbackOperation).toHaveBeenCalled();
      expect(result).toBe('fallback-result');
    });
  });
});