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

describe('DatabaseTransaction - Comprehensive Coverage', () => {
  let mockSession: jest.Mocked<ClientSession>;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console.warn to test warning outputs
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

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

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('withFallback - Edge Cases', () => {
    it('should log warning and fallback when transaction fails', async () => {
      const mockTransactionOperation = jest.fn().mockRejectedValue(new Error('Transaction operation failed'));
      const mockFallbackOperation = jest.fn().mockResolvedValue('fallback-result');

      // Mock transaction support to return true but operation fails
      mockSession.withTransaction.mockImplementation((callback) => callback());

      const result = await DatabaseTransaction.withFallback(
        mockTransactionOperation,
        mockFallbackOperation
      );

      expect(mockTransactionOperation).toHaveBeenCalledWith(mockSession);
      expect(mockFallbackOperation).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Transaction failed, falling back to non-transactional operation:',
        expect.any(Error)
      );
      expect(result).toBe('fallback-result');
    });

    it('should handle database connection errors during transaction support check', async () => {
      const mockTransactionOperation = jest.fn().mockResolvedValue('transaction-result');
      const mockFallbackOperation = jest.fn().mockResolvedValue('fallback-result');

      // Mock database connection to fail during isTransactionSupported
      (connectToDatabase as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await DatabaseTransaction.withFallback(
        mockTransactionOperation,
        mockFallbackOperation
      );

      expect(mockFallbackOperation).toHaveBeenCalled();
      expect(mockTransactionOperation).not.toHaveBeenCalled();
      expect(result).toBe('fallback-result');
    });

    it('should handle session start failure during transaction support check', async () => {
      const mockTransactionOperation = jest.fn().mockResolvedValue('transaction-result');
      const mockFallbackOperation = jest.fn().mockResolvedValue('fallback-result');

      // Mock session creation to fail during isTransactionSupported
      (mongoose.startSession as jest.Mock).mockRejectedValueOnce(new Error('Session creation failed'));

      const result = await DatabaseTransaction.withFallback(
        mockTransactionOperation,
        mockFallbackOperation
      );

      expect(mockFallbackOperation).toHaveBeenCalled();
      expect(mockTransactionOperation).not.toHaveBeenCalled();
      expect(result).toBe('fallback-result');
    });

    it('should handle when both transaction and fallback operations fail', async () => {
      const transactionError = new Error('Transaction failed');
      const fallbackError = new Error('Fallback failed');

      const mockTransactionOperation = jest.fn().mockRejectedValue(transactionError);
      const mockFallbackOperation = jest.fn().mockRejectedValue(fallbackError);

      // Mock transaction support to return true but operation fails
      mockSession.withTransaction.mockImplementation((callback) => callback());

      await expect(DatabaseTransaction.withFallback(
        mockTransactionOperation,
        mockFallbackOperation
      )).rejects.toThrow('Fallback failed');

      expect(mockTransactionOperation).toHaveBeenCalledWith(mockSession);
      expect(mockFallbackOperation).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Transaction failed, falling back to non-transactional operation:',
        transactionError
      );
    });
  });

  describe('isTransactionSupported - Console Warning Coverage', () => {
    it('should log warning when unable to check transaction support', async () => {
      const connectionError = new Error('Connection failed');
      (connectToDatabase as jest.Mock).mockRejectedValue(connectionError);

      const result = await DatabaseTransaction.isTransactionSupported();

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unable to check transaction support:',
        connectionError
      );
    });

    it('should log warning when session creation fails', async () => {
      const sessionError = new Error('Session failed');
      (mongoose.startSession as jest.Mock).mockRejectedValue(sessionError);

      const result = await DatabaseTransaction.isTransactionSupported();

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unable to check transaction support:',
        sessionError
      );
    });
  });

  describe('withTransaction - Error Handling Coverage', () => {
    it('should handle database connection failure', async () => {
      const connectionError = new Error('Database connection failed');
      const mockOperation = jest.fn().mockResolvedValue('test-result');

      (connectToDatabase as jest.Mock).mockRejectedValue(connectionError);

      await expect(DatabaseTransaction.withTransaction(mockOperation)).rejects.toThrow('Database connection failed');
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should handle session creation failure', async () => {
      const sessionError = new Error('Session creation failed');
      const mockOperation = jest.fn().mockResolvedValue('test-result');

      (mongoose.startSession as jest.Mock).mockRejectedValue(sessionError);

      await expect(DatabaseTransaction.withTransaction(mockOperation)).rejects.toThrow('Session creation failed');
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should ensure session is ended even when withTransaction throws', async () => {
      const transactionError = new Error('Transaction error');
      const mockOperation = jest.fn().mockResolvedValue('test-result');

      mockSession.withTransaction.mockRejectedValue(transactionError);

      await expect(DatabaseTransaction.withTransaction(mockOperation)).rejects.toThrow('Transaction error');
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  describe('withSession - Error Handling Coverage', () => {
    it('should handle database connection failure', async () => {
      const connectionError = new Error('Database connection failed');
      const mockOperation = jest.fn().mockResolvedValue('test-result');

      (connectToDatabase as jest.Mock).mockRejectedValue(connectionError);

      await expect(DatabaseTransaction.withSession(mockOperation)).rejects.toThrow('Database connection failed');
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should handle session creation failure', async () => {
      const sessionError = new Error('Session creation failed');
      const mockOperation = jest.fn().mockResolvedValue('test-result');

      (mongoose.startSession as jest.Mock).mockRejectedValue(sessionError);

      await expect(DatabaseTransaction.withSession(mockOperation)).rejects.toThrow('Session creation failed');
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should handle start transaction failure', async () => {
      const startTransactionError = new Error('Start transaction failed');
      const mockOperation = jest.fn().mockResolvedValue('test-result');

      mockSession.startTransaction.mockImplementation(() => {
        throw startTransactionError;
      });

      await expect(DatabaseTransaction.withSession(mockOperation)).rejects.toThrow('Start transaction failed');
      expect(mockOperation).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should handle commit transaction failure', async () => {
      const commitError = new Error('Commit failed');
      const mockOperation = jest.fn().mockResolvedValue('test-result');

      mockSession.commitTransaction.mockRejectedValue(commitError);

      await expect(DatabaseTransaction.withSession(mockOperation)).rejects.toThrow('Commit failed');
      expect(mockOperation).toHaveBeenCalledWith(mockSession);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should handle abort transaction failure', async () => {
      const operationError = new Error('Operation failed');
      const abortError = new Error('Abort failed');
      const mockOperation = jest.fn().mockRejectedValue(operationError);

      mockSession.abortTransaction.mockRejectedValue(abortError);

      // Should throw the abort error when abort fails
      await expect(DatabaseTransaction.withSession(mockOperation)).rejects.toThrow('Abort failed');
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should handle end session failure in finally block', async () => {
      const endSessionError = new Error('End session failed');
      const mockOperation = jest.fn().mockResolvedValue('test-result');

      mockSession.endSession.mockRejectedValue(endSessionError);

      // Should throw the endSession error when it fails in finally block
      await expect(DatabaseTransaction.withSession(mockOperation)).rejects.toThrow('End session failed');
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  describe('Complex Error Scenarios', () => {
    it('should handle multiple error points in withFallback', async () => {
      const mockTransactionOperation = jest.fn().mockRejectedValue(new Error('Transaction failed'));
      const mockFallbackOperation = jest.fn().mockResolvedValue('fallback-success');

      // Make transaction support check fail due to session creation error
      (mongoose.startSession as jest.Mock)
        .mockRejectedValueOnce(new Error('Session creation failed during support check'))
        .mockResolvedValueOnce(mockSession);

      const result = await DatabaseTransaction.withFallback(
        mockTransactionOperation,
        mockFallbackOperation
      );

      expect(result).toBe('fallback-success');
      expect(mockTransactionOperation).not.toHaveBeenCalled();
      expect(mockFallbackOperation).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unable to check transaction support:',
        expect.any(Error)
      );
    });

  });
});