import mongoose from 'mongoose';

/**
 * Enhanced Database Connection Manager for Issue #620
 *
 * Addresses mongoose buffering timeout issues by ensuring
 * stable database connections with proper error handling
 * and reconnection logic for low-usage scenarios.
 */

// Connection state constants for better readability
const MONGOOSE_DISCONNECTED = 0;
const MONGOOSE_CONNECTED = 1;

type ConnectionStatus = {
  state: number;
  connected: boolean;
  healthy: boolean;
  lastChecked: number;
};

class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;

  private connectionPromise: Promise<void> | null = null;

  private healthCheckInterval: NodeJS.Timeout | null = null;

  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  private readonly CONNECTION_TIMEOUT = 10000; // 10 seconds

  private readonly RECONNECT_ATTEMPTS = 3;

  private constructor() {
    this.setupEventHandlers();
  }

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  /**
   * Get current connection status with detailed health information
   */
  public getConnectionStatus(): ConnectionStatus {
    const readyState = mongoose.connection.readyState;
    return {
      state: readyState,
      connected: readyState === MONGOOSE_CONNECTED,
      healthy: this.isConnectionHealthy(),
      lastChecked: Date.now()
    };
  }

  /**
   * Check if the connection is healthy and can perform operations
   */
  private isConnectionHealthy(): boolean {
    return (
      mongoose.connection.readyState === MONGOOSE_CONNECTED &&
      mongoose.connection.db != null
    );
  }

  /**
   * Enhanced connection method with retry logic and health verification
   */
  public async ensureConnection(): Promise<void> {
    const status = this.getConnectionStatus();

    // If already connected and healthy, return early
    if (status.connected && status.healthy) {
      return;
    }

    // If a connection attempt is already in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Start new connection attempt
    this.connectionPromise = this.connectWithRetry();

    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Connect with retry logic and proper error handling
   */
  private async connectWithRetry(): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.RECONNECT_ATTEMPTS; attempt++) {
      try {
        console.log(`Database connection attempt ${attempt}/${this.RECONNECT_ATTEMPTS}`);

        // Close existing connection if it's in a bad state
        if (mongoose.connection.readyState === MONGOOSE_DISCONNECTED) {
          await this.forceCloseConnection();
        }

        await this.performConnection();

        // Verify the connection is actually working
        await this.verifyConnection();

        console.log('Database connection successful and verified');
        this.startHealthChecks();
        return;

      } catch (error) {
        lastError = error as Error;
        console.warn(`Connection attempt ${attempt} failed:`, error);

        if (attempt < this.RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to connect to database after ${this.RECONNECT_ATTEMPTS} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Perform the actual connection to MongoDB
   */
  private async performConnection(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME;

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    if (!dbName) {
      throw new Error('MONGODB_DB_NAME environment variable is not defined');
    }

    const options = {
      dbName,
      bufferCommands: false, // Critical: Disable mongoose buffering to prevent timeouts
      maxPoolSize: 10,
      serverSelectionTimeoutMS: this.CONNECTION_TIMEOUT,
      socketTimeoutMS: 45000,
      family: 4,
      // Enhanced options for Issue #620
      heartbeatFrequencyMS: 10000, // Check server health every 10 seconds
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      retryWrites: true, // Retry failed writes
      // Enable compression conditionally - may introduce CPU overhead
      ...(process.env.ENABLE_DB_COMPRESSION === 'true' ? { compressors: ['zlib' as const] } : {}),
    };

    await mongoose.connect(mongoUri, options);
  }

  /**
   * Verify the connection is working by performing a simple operation
   */
  private async verifyConnection(): Promise<void> {
    if (!mongoose.connection.db) {
      throw new Error('Database connection verification failed: no database instance');
    }

    // Perform a simple ping operation to verify connection
    const admin = mongoose.connection.db.admin();
    const pingResult = await admin.ping();

    if (!pingResult.ok) {
      throw new Error('Database connection verification failed: ping returned not ok');
    }

    console.log('Database connection verified with ping');
  }

  /**
   * Force close the current connection
   */
  private async forceCloseConnection(): Promise<void> {
    try {
      await mongoose.connection.close(true); // Force close
      console.log('Forced database connection closure');
    } catch (error) {
      console.warn('Error during forced connection closure:', error);
    }
  }

  /**
   * Setup event handlers for connection monitoring
   */
  private setupEventHandlers(): void {
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected');
      this.stopHealthChecks();
    });

    mongoose.connection.on('reconnected', () => {
      console.log('Mongoose reconnected to MongoDB');
      this.startHealthChecks();
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await this.gracefulShutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.gracefulShutdown();
      process.exit(0);
    });
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return; // Already running
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        if (!this.isConnectionHealthy()) {
          console.warn('Connection health check failed, attempting reconnection...');
          await this.ensureConnection();
        }
      } catch (error) {
        console.error('Health check error:', error);
      }
    }, this.HEALTH_CHECK_INTERVAL);

    console.log('Started database health checks');
  }

  /**
   * Stop periodic health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('Stopped database health checks');
    }
  }

  /**
   * Graceful shutdown
   */
  public async gracefulShutdown(): Promise<void> {
    console.log('Starting graceful database shutdown...');

    this.stopHealthChecks();

    if (mongoose.connection.readyState !== MONGOOSE_DISCONNECTED) {
      try {
        await mongoose.connection.close();
        console.log('Database connection closed gracefully');
      } catch (error) {
        console.warn('Error during graceful shutdown:', error);
        // Don't throw - graceful shutdown should not fail
      }
    }
  }

  /**
   * Execute a database operation with connection guarantee
   */
  public async executeWithConnection<T>(operation: () => Promise<T>): Promise<T> {
    await this.ensureConnection();

    try {
      return await operation();
    } catch (error) {
      // If the error is related to connection issues, try to reconnect and retry once
      if (this.isConnectionError(error)) {
        console.warn('Connection error detected, attempting reconnection...');
        await this.ensureConnection();
        return await operation();
      }
      throw error;
    }
  }

  /**
   * Check if an error is related to connection issues
   */
  private isConnectionError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message?.toLowerCase() || '';
    const connectionErrorKeywords = [
      'buffering timed out',
      'connection',
      'timeout',
      'disconnected',
      'network',
      'socket',
      'closed'
    ];

    return connectionErrorKeywords.some(keyword => errorMessage.includes(keyword));
  }
}

// Export singleton instance and convenience functions
const dbManager = DatabaseConnectionManager.getInstance();

/**
 * Enhanced connectToDatabase function for Issue #620
 * Replaces the original function with robust connection management
 */
export async function connectToDatabase(): Promise<void> {
  return dbManager.ensureConnection();
}

/**
 * Execute database operation with connection guarantee
 */
export async function executeWithConnection<T>(operation: () => Promise<T>): Promise<T> {
  return dbManager.executeWithConnection(operation);
}

/**
 * Get detailed connection status
 */
export function getConnectionStatus() {
  return dbManager.getConnectionStatus();
}

/**
 * Graceful shutdown for cleanup
 */
export async function gracefulShutdown(): Promise<void> {
  return dbManager.gracefulShutdown();
}

// Re-export mongoose for backward compatibility
export { mongoose };