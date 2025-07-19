import mongoose from 'mongoose';

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

export async function connectToDatabase(): Promise<void> {
  // If already connected, return early
  if (connection.isConnected) {
    console.log('Already connected to MongoDB');
    return;
  }

  try {
    // Get connection string from environment variables
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME;

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    if (!dbName) {
      throw new Error('MONGODB_DB_NAME environment variable is not defined');
    }

    // Configure Mongoose options
    const options = {
      dbName,
      bufferCommands: false, // Disable mongoose buffering
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    // Connect to MongoDB
    await mongoose.connect(mongoUri, options);

    connection.isConnected = mongoose.connection.readyState;

    console.log('Successfully connected to MongoDB');

    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', err => {
      console.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected');
      connection.isConnected = 0;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Mongoose connection closed due to application termination');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (connection.isConnected) {
    await mongoose.connection.close();
    connection.isConnected = 0;
    console.log('Disconnected from MongoDB');
  }
}

export function getConnectionStatus(): boolean {
  return Boolean(connection.isConnected);
}

// Export mongoose for schema definitions
export { mongoose };
