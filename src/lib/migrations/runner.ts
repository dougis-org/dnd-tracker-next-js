/**
 * MongoDB Migration Runner
 * Handles database schema migrations with comprehensive error handling and validation
 */

import { Db, MongoClient } from 'mongodb';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Migration,
  MigrationConfig,
  MigrationResult,
  MigrationStatus,
  MigrationRecord,
  MigrationValidationError,
  IMigrationRunner,
} from './types';

/**
 * Main migration runner class
 */
export class MigrationRunner implements IMigrationRunner {
  private db: Db;

  private client: MongoClient;

  private config: MigrationConfig;

  constructor(client: MongoClient, config: MigrationConfig) {
    this.validateConstructorParams(client, config);
    this.client = client;

    // Extract database name from connection string or use explicitly provided one
    const dbName = config.databaseName || this.extractDatabaseName(client);
    this.db = client.db(dbName); // Explicitly specify database name

    this.config = this.normalizeConfig(config);
  }

  /**
   * Extract database name from MongoDB connection string
   */
  private extractDatabaseName(client: MongoClient): string {
    try {
      const connectionUrl = (client as any).options?.url || '';
      if (!connectionUrl) {
        return 'test';
      }

      // Extract database name from connection string
      // Format: mongodb://username:password@host:port/database?options
      const urlParts = connectionUrl.split('/');
      if (urlParts.length < 4) {
        return 'test';
      }

      const databasePart = urlParts[urlParts.length - 1];
      if (!databasePart) {
        return 'test';
      }

      // Remove query parameters
      const dbName = databasePart.split('?')[0];

      // Return extracted name or default to 'test'
      return dbName || 'test';
    } catch {
      // If any error occurs during extraction, fallback to 'test'
      return 'test';
    }
  }

  /**
   * Validate constructor parameters
   */
  private validateConstructorParams(client: MongoClient, config: MigrationConfig): void {
    if (!client) {
      throw new Error('MongoDB client is required');
    }

    if (!config) {
      throw new Error('Migration configuration is required');
    }

    if (!config.migrationsPath || config.migrationsPath.trim() === '') {
      throw new Error('Migrations path is required');
    }

    if (!config.collectionName || config.collectionName.trim() === '') {
      throw new Error('Collection name cannot be empty');
    }

    if (config.timeout !== undefined && (config.timeout <= 0 || !Number.isFinite(config.timeout))) {
      throw new Error('Timeout must be a positive number');
    }
  }

  /**
   * Normalize configuration with defaults
   */
  private normalizeConfig(config: MigrationConfig): MigrationConfig {
    return {
      migrationsPath: config.migrationsPath,
      collectionName: config.collectionName,
      timeout: config.timeout || 30000,
      backupEnabled: config.backupEnabled ?? true,
      dryRun: config.dryRun ?? false,
      validateOnly: config.validateOnly ?? false,
      databaseName: config.databaseName,
    };
  }

  /**
   * Get status of all migrations
   */
  async getStatus(): Promise<MigrationStatus[]> {
    try {
      const [migrationFiles, executedMigrations] = await Promise.all([
        this.loadMigrationFiles(),
        this.getExecutedMigrations(),
      ]);

      // Note: executedVersions removed as it was unused

      return migrationFiles
        .map(filename => this.parseMigrationFilename(filename))
        .filter((parsed): parsed is NonNullable<typeof parsed> => parsed !== null)
        .sort((a, b) => a.version.localeCompare(b.version))
        .map(parsed => {
          const executed = executedMigrations.find(m => m.version === parsed.version);
          return {
            version: parsed.version,
            description: parsed.description,
            filename: parsed.filename,
            status: executed ? 'executed' : 'pending',
            executedAt: executed?.executedAt,
            executionTime: executed?.executionTime,
          } as MigrationStatus;
        });
    } catch (error) {
      throw new Error(`Failed to get migration status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute pending migrations
   */
  async migrate(): Promise<MigrationResult[]> {
    try {
      const status = await this.getStatus();
      const pendingMigrations = status.filter(s => s.status === 'pending');

      if (pendingMigrations.length === 0) {
        return [];
      }

      await this.ensureMigrationCollection();

      const results: MigrationResult[] = [];

      for (const migrationStatus of pendingMigrations) {
        const result = await this.executeMigration(migrationStatus);
        results.push(result);

        // Stop on first failure unless configured otherwise
        if (!result.success) {
          break;
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Migration execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Rollback migrations
   */
  async rollback(steps: number = 1): Promise<MigrationResult[]> {
    try {
      const executedMigrations = await this.getExecutedMigrations();

      if (executedMigrations.length === 0) {
        return [];
      }

      // Sort by execution date descending (most recent first)
      const migrationsToRollback = executedMigrations
        .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
        .slice(0, steps);

      const results: MigrationResult[] = [];

      for (const migrationRecord of migrationsToRollback) {
        const result = await this.rollbackMigration(migrationRecord);
        results.push(result);

        // Stop on first failure
        if (!result.success) {
          break;
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new migration file
   */
  async createMigration(description: string): Promise<string> {
    if (!description || description.trim() === '') {
      throw new Error('Migration description is required');
    }

    try {
      await this.ensureMigrationsDirectory();

      const version = await this.getNextVersion();
      const filename = this.generateMigrationFilename(version, description);
      const filepath = path.join(this.config.migrationsPath, filename);
      const content = this.generateMigrationTemplate(version, description);

      await fs.writeFile(filepath, content, 'utf8');

      return filename;
    } catch (error) {
      throw new Error(`Failed to create migration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate all migration files
   */
  async validateMigrations(): Promise<boolean> {
    try {
      const migrationFiles = await this.loadMigrationFiles();
      const errors: MigrationValidationError[] = [];
      const versions = new Set<string>();

      for (const filename of migrationFiles) {
        try {
          const filepath = path.join(this.config.migrationsPath, filename);
          const migration = await this.loadMigration(filepath);

          // Validate structure
          if (!migration.version || !migration.description || !migration.up || !migration.down) {
            errors.push({
              version: migration.version || 'unknown',
              filename,
              error: 'Migration must have version, description, up, and down properties',
              type: 'structure',
            });
          }

          // Check for duplicate versions
          if (versions.has(migration.version)) {
            errors.push({
              version: migration.version,
              filename,
              error: `Duplicate version number: ${migration.version}`,
              type: 'duplicate',
            });
          }

          versions.add(migration.version);
        } catch (error) {
          const parsed = this.parseMigrationFilename(filename);
          errors.push({
            version: parsed?.version || 'unknown',
            filename,
            error: error instanceof Error ? error.message : String(error),
            type: 'syntax',
          });
        }
      }

      if (errors.length > 0) {
        console.error('Migration validation errors:', errors);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Validation failed:', error);
      return false;
    }
  }

  /**
   * Load migration files from disk
   */
  private async loadMigrationFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.migrationsPath);
      return files.filter(file => this.isMigrationFile(file));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Check if file is a migration file
   */
  private isMigrationFile(filename: string): boolean {
    const ext = path.extname(filename);
    return (ext === '.js' || ext === '.ts') && /^\d+_/.test(filename);
  }

  /**
   * Parse migration filename to extract version and description
   */
  private parseMigrationFilename(filename: string): { version: string; description: string; filename: string } | null {
    const match = filename.match(/^(\d+)_(.+)\.(js|ts)$/);
    if (!match) {
      return null;
    }

    return {
      version: match[1],
      description: match[2].replace(/_/g, ' '),
      filename,
    };
  }

  /**
   * Get executed migrations from database
   */
  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    try {
      const collection = this.db.collection(this.config.collectionName);
      const results = await collection.find({}).sort({ version: 1 }).toArray();
      return results as unknown as MigrationRecord[];
    } catch {
      // If collection doesn't exist, return empty array
      return [];
    }
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migrationStatus: MigrationStatus): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      const filepath = path.join(this.config.migrationsPath, migrationStatus.filename);
      const migration = await this.loadMigration(filepath);

      if (this.config.dryRun) {
        return {
          success: true,
          version: migrationStatus.version,
          description: migrationStatus.description,
          executionTime: Date.now() - startTime,
        };
      }

      // Execute migration with timeout
      await this.executeWithTimeout(
        () => migration.up(this.db),
        this.config.timeout
      );

      const executionTime = Date.now() - startTime;

      // Record successful execution
      await this.recordMigration({
        version: migrationStatus.version,
        description: migrationStatus.description,
        filename: migrationStatus.filename,
        executedAt: new Date(),
        executionTime,
        rollbackAvailable: typeof migration.down === 'function',
      });

      return {
        success: true,
        version: migrationStatus.version,
        description: migrationStatus.description,
        executionTime,
      };
    } catch (error) {
      return {
        success: false,
        version: migrationStatus.version,
        description: migrationStatus.description,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migrationRecord: MigrationRecord): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      const filepath = path.join(this.config.migrationsPath, migrationRecord.filename);
      const migration = await this.loadMigration(filepath);

      if (!migration.down) {
        throw new Error('Migration does not support rollback');
      }

      // Execute rollback with timeout
      await this.executeWithTimeout(
        () => migration.down(this.db),
        this.config.timeout
      );

      const executionTime = Date.now() - startTime;

      // Remove migration record
      await this.removeMigrationRecord(migrationRecord.version);

      return {
        success: true,
        version: migrationRecord.version,
        description: migrationRecord.description,
        executionTime,
      };
    } catch (error) {
      return {
        success: false,
        version: migrationRecord.version,
        description: migrationRecord.description,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Load migration from file
   */
  private async loadMigration(filepath: string): Promise<Migration> {
    try {
      // Use require for consistent loading
      return require(filepath);
    } catch (error) {
      throw new Error(`Failed to load migration ${filepath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Migration execution timeout after ${timeout}ms`));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Ensure migrations collection exists
   */
  private async ensureMigrationCollection(): Promise<void> {
    try {
      const collection = this.db.collection(this.config.collectionName);

      // Create index on version field for performance
      await collection.createIndex({ version: 1 }, { unique: true });
    } catch (error) {
      // Collection might already exist, ignore duplicate key errors
      if (error instanceof Error && !error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  /**
   * Record successful migration execution
   */
  private async recordMigration(record: MigrationRecord): Promise<void> {
    try {
      const collection = this.db.collection(this.config.collectionName);
      await collection.insertOne(record);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error(`Migration ${record.version} has already been executed`);
      }
      throw error;
    }
  }

  /**
   * Remove migration record from database
   */
  private async removeMigrationRecord(version: string): Promise<void> {
    const collection = this.db.collection(this.config.collectionName);
    await collection.deleteOne({ version });
  }

  /**
   * Ensure migrations directory exists
   */
  private async ensureMigrationsDirectory(): Promise<void> {
    try {
      await fs.access(this.config.migrationsPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(this.config.migrationsPath, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  /**
   * Get next version number
   */
  private async getNextVersion(): Promise<string> {
    try {
      const files = await this.loadMigrationFiles();

      if (files.length === 0) {
        return '001';
      }

      const versions = files
        .map(file => this.parseMigrationFilename(file))
        .filter(parsed => parsed !== null)
        .map(parsed => parseInt(parsed!.version, 10))
        .filter(version => !isNaN(version));

      const maxVersion = Math.max(...versions);
      return String(maxVersion + 1).padStart(3, '0');
    } catch {
      return '001';
    }
  }

  /**
   * Generate migration filename
   */
  private generateMigrationFilename(version: string, description: string): string {
    const sanitizedDescription = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

    return `${version}_${sanitizedDescription}.js`;
  }

  /**
   * Generate migration template content
   */
  private generateMigrationTemplate(version: string, description: string): string {
    return `/**
 * Migration: ${description}
 * Version: ${version}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  version: '${version}',
  description: '${description}',

  /**
   * Apply migration
   * @param {import('mongodb').Db} db
   */
  async up(db) {
    // TODO: Implement migration logic
    // Example:
    // await db.collection('users').createIndex({ email: 1 }, { unique: true });
    // await db.collection('posts').updateMany({}, { $set: { status: 'draft' } });
  },

  /**
   * Rollback migration
   * @param {import('mongodb').Db} db
   */
  async down(db) {
    // TODO: Implement rollback logic
    // Example:
    // await db.collection('users').dropIndex({ email: 1 });
    // await db.collection('posts').updateMany({}, { $unset: { status: '' } });
  }
};
`;
  }
}