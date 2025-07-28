/**
 * Deployment Manager for Fly.io integration with MongoDB migrations
 * Handles the complete deployment pipeline with safety measures
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { DeploymentMonitor, DeploymentMetric, AlertConfig } from '../monitoring/deployment-monitor';

const execAsync = promisify(exec);

/**
 * Deployment configuration options
 */
export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  dryRun?: boolean;
  skipMigrations?: boolean;
  timeout?: number;
  backupEnabled?: boolean;
  requireConfirmation?: boolean;
  autoRollback?: boolean;
}

/**
 * Deployment validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  pendingMigrations: Array<{ version: string; status: string }>;
  buildStatus: 'success' | 'failed' | 'unknown';
  environmentStatus: 'valid' | 'invalid';
}

/**
 * Backup operation result
 */
export interface BackupResult {
  success: boolean;
  backupPath?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Migration execution result
 */
export interface MigrationResult {
  success: boolean;
  migrationsExecuted: number;
  executionTime: number;
  error?: string;
  skipped?: boolean;
}

/**
 * Deployment operation result
 */
export interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  error?: string;
  releaseCommandStatus?: 'success' | 'failed';
}

/**
 * Verification result
 */
export interface VerificationResult {
  success: boolean;
  healthCheck: boolean;
  migrationStatus: 'complete' | 'incomplete' | 'failed';
  appResponsive: boolean;
  pendingMigrations?: Array<{ version: string; status: string }>;
}

/**
 * Rollback operation result
 */
export interface RollbackResult {
  success: boolean;
  rollbackType: 'app' | 'migration' | 'backup';
  error?: string;
}

/**
 * Complete deployment result
 */
export interface FullDeploymentResult {
  success: boolean;
  steps: string[];
  failedStep?: string;
  rollbackTriggered?: boolean;
  migrationError?: string;
  dryRun?: boolean;
  metrics: {
    totalTime: number;
    migrationTime: number;
    deploymentTime: number;
    verificationTime: number;
  };
}

/**
 * Rollback options
 */
export interface RollbackOptions {
  steps?: number;
  restoreBackup?: boolean;
  backupPath?: string;
}

/**
 * Notification payload
 */
export interface NotificationPayload {
  type: 'deployment_started' | 'deployment_success' | 'deployment_failed';
  environment: string;
  timestamp: Date;
  error?: string;
  metrics?: any;
}

/**
 * Main deployment manager class
 */
export class DeploymentManager {
  private config: Required<DeploymentConfig>;

  private monitor: DeploymentMonitor | null = null;

  private deploymentId: string;

  constructor(config: DeploymentConfig) {
    this.validateConfig(config);
    this.config = this.normalizeConfig(config);
    this.deploymentId = this.generateDeploymentId();
    this.initializeMonitoring();
  }

  /**
   * Validate configuration parameters
   */
  private validateConfig(config: DeploymentConfig): void {
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(config.environment)) {
      throw new Error(`Invalid environment: ${config.environment}. Must be one of: ${validEnvironments.join(', ')}`);
    }
  }

  /**
   * Normalize configuration with environment-specific defaults
   */
  private normalizeConfig(config: DeploymentConfig): Required<DeploymentConfig> {
    const defaults = this.getEnvironmentDefaults(config.environment);

    return {
      environment: config.environment,
      dryRun: config.dryRun ?? defaults.dryRun,
      skipMigrations: config.skipMigrations ?? defaults.skipMigrations,
      timeout: config.timeout ?? defaults.timeout,
      backupEnabled: config.backupEnabled ?? defaults.backupEnabled,
      requireConfirmation: config.requireConfirmation ?? defaults.requireConfirmation,
      autoRollback: config.autoRollback ?? defaults.autoRollback,
    };
  }

  /**
   * Get environment-specific default configurations
   */
  private getEnvironmentDefaults(environment: string): Omit<Required<DeploymentConfig>, 'environment'> {
    switch (environment) {
      case 'development':
        return {
          dryRun: false,
          skipMigrations: false,
          timeout: 120000,
          backupEnabled: false,
          requireConfirmation: false,
          autoRollback: false,
        };
      case 'staging':
        return {
          dryRun: false,
          skipMigrations: false,
          timeout: 300000,
          backupEnabled: true,
          requireConfirmation: false,
          autoRollback: true,
        };
      case 'production':
        return {
          dryRun: false,
          skipMigrations: false,
          timeout: 600000,
          backupEnabled: true,
          requireConfirmation: true,
          autoRollback: true,
        };
      default:
        throw new Error(`Unknown environment: ${environment}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<DeploymentConfig> {
    return { ...this.config };
  }

  /**
   * Generate unique deployment ID
   */
  private generateDeploymentId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    // Use cryptographically secure random generation instead of Math.random()
    const crypto = require('crypto');
    const random = crypto.randomBytes(3).toString('hex');
    return `deploy-${this.config.environment}-${timestamp}-${random}`;
  }

  /**
   * Initialize monitoring system
   */
  private initializeMonitoring(): void {
    try {
      // In a real implementation, this would load configuration from file
      const alertConfig: AlertConfig = {
        environment: this.config.environment,
        channels: [], // Would be loaded from config file
        thresholds: {
          deploymentDuration: this.config.timeout,
          migrationDuration: this.config.timeout / 2,
          errorRate: 0.1,
          consecutiveFailures: 3,
        },
        enabled: this.config.environment !== 'development',
      };

      this.monitor = new DeploymentMonitor(alertConfig);
    } catch (error) {
      console.warn('Failed to initialize monitoring:', error);
      this.monitor = null;
    }
  }

  /**
   * Record deployment metric
   */
  private async recordMetric(
    phase: DeploymentMetric['phase'],
    status: DeploymentMetric['status'],
    options: { duration?: number; error?: string; details?: any } = {}
  ): Promise<void> {
    if (!this.monitor) {
      return;
    }

    try {
      await this.monitor.recordMetric({
        timestamp: new Date(),
        environment: this.config.environment,
        deploymentId: this.deploymentId,
        phase,
        status,
        duration: options.duration,
        error: options.error,
        details: options.details,
      });
    } catch (error) {
      console.warn('Failed to record metric:', error);
    }
  }

  /**
   * Validate pre-deployment requirements
   */
  async validatePreDeployment(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      pendingMigrations: [],
      buildStatus: 'unknown',
      environmentStatus: 'valid',
    };

    try {
      // Validate migration files
      await execAsync('npm run migrate:validate');
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Migration validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Check for pending migrations
      const { stdout } = await execAsync('npm run migrate:status');
      const migrations = JSON.parse(stdout);
      result.pendingMigrations = migrations.filter((m: any) => m.status === 'pending');
    } catch {
      // Handle case where migration status command doesn't return JSON
      result.pendingMigrations = [];
    }

    try {
      // Validate environment variables
      this.validateEnvironmentVariables();
    } catch (error) {
      result.isValid = false;
      result.environmentStatus = 'invalid';
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    try {
      // Check build status
      await execAsync('npm run build');
      result.buildStatus = 'success';
    } catch (error) {
      result.isValid = false;
      result.buildStatus = 'failed';
      result.errors.push(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Validate required environment variables
   */
  private validateEnvironmentVariables(): void {
    const requiredVars = ['MONGODB_URI', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variable: ${missing[0]}`);
    }
  }

  /**
   * Create database backup before deployment
   */
  async createBackup(): Promise<BackupResult> {
    if (this.config.dryRun) {
      return { success: true, skipped: true };
    }

    if (!this.config.backupEnabled) {
      return { success: true, skipped: true };
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
      const backupPath = `/tmp/backup-${timestamp}.gz`;

      const command = `mongodump --uri="${process.env.MONGODB_URI}" --gzip --archive=${backupPath}`;
      await execAsync(command);

      return {
        success: true,
        backupPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<MigrationResult> {
    if (this.config.skipMigrations) {
      return { success: true, skipped: true, migrationsExecuted: 0, executionTime: 0 };
    }

    const startTime = Date.now();

    try {
      const envPrefix = this.config.dryRun ? 'MIGRATION_DRY_RUN=true ' : '';
      const command = `${envPrefix}npm run migrate:up`;

      await this.executeWithTimeout(command, this.config.timeout);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        migrationsExecuted: 1, // This would be parsed from actual output
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof Error && error.message.includes('timeout')) {
        return {
          success: false,
          error: `Migration execution timeout after ${this.config.timeout}ms`,
          migrationsExecuted: 0,
          executionTime,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        migrationsExecuted: 0,
        executionTime,
      };
    }
  }

  /**
   * Deploy application to Fly.io
   */
  async deployToFlyio(): Promise<DeploymentResult> {
    try {
      const configFlag = this.config.environment === 'production'
        ? '--config fly.production.toml'
        : '';

      const command = `flyctl deploy --remote-only ${configFlag}`.trim();
      const { stdout } = await execAsync(command);

      return {
        success: true,
        deploymentId: this.extractDeploymentId(stdout),
        releaseCommandStatus: 'success',
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('release_command')) {
        return {
          success: false,
          error: 'Release command failed',
          releaseCommandStatus: 'failed',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Verify deployment success
   */
  async verifyDeployment(): Promise<VerificationResult> {
    const result: VerificationResult = {
      success: true,
      healthCheck: false,
      migrationStatus: 'complete',
      appResponsive: false,
    };

    try {
      // Health check
      await execAsync('curl -f https://dnd-tracker.fly.dev/api/health');
      result.healthCheck = true;
    } catch {
      result.success = false;
      result.healthCheck = false;
    }

    try {
      // Check migration status
      const { stdout } = await execAsync('npm run migrate:status');
      const migrations = JSON.parse(stdout);
      const pending = migrations.filter((m: any) => m.status === 'pending');

      if (pending.length > 0) {
        result.success = false;
        result.migrationStatus = 'incomplete';
        result.pendingMigrations = pending;
      }
    } catch {
      result.migrationStatus = 'failed';
    }

    try {
      // Check application responsiveness
      const { stdout } = await execAsync('curl -s https://dnd-tracker.fly.dev/api/health');
      const response = JSON.parse(stdout);
      result.appResponsive = response.status === 'ok';
    } catch {
      result.appResponsive = false;
    }

    return result;
  }

  /**
   * Rollback deployment
   */
  async rollback(options: RollbackOptions = {}): Promise<RollbackResult> {
    try {
      if (options.restoreBackup && options.backupPath) {
        // Restore from backup
        const command = `mongorestore --uri="${process.env.MONGODB_URI}" --gzip --archive=${options.backupPath} --drop`;
        await execAsync(command);
        return { success: true, rollbackType: 'backup' };
      }

      if (options.steps) {
        // Rollback migrations
        const command = `npm run migrate:down ${options.steps}`;
        await execAsync(command);
        return { success: true, rollbackType: 'migration' };
      }

      // Rollback application deployment
      await execAsync('flyctl rollback');
      return { success: true, rollbackType: 'app' };
    } catch (error) {
      return {
        success: false,
        rollbackType: 'app',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute complete deployment pipeline
   */
  async deploy(): Promise<FullDeploymentResult> {
    const startTime = Date.now();
    const result = this.initializeDeploymentResult();

    try {
      await this.recordMetric('validation', 'started');
      await this.sendDeploymentStartNotification();

      // Execute deployment steps
      const success = await this.executeDeploymentSteps(result, startTime);
      if (!success) {
        return result;
      }

      result.metrics.totalTime = Date.now() - startTime;
      await this.sendDeploymentSuccessNotification(result.metrics);
      return result;

    } catch (error) {
      return this.handleDeploymentError(result, startTime, error);
    }
  }

  /**
   * Initialize deployment result structure
   */
  private initializeDeploymentResult(): FullDeploymentResult {
    return {
      success: true,
      steps: [],
      dryRun: this.config.dryRun,
      metrics: {
        totalTime: 0,
        migrationTime: 0,
        deploymentTime: 0,
        verificationTime: 0,
      },
    };
  }

  /**
   * Send deployment start notification
   */
  private async sendDeploymentStartNotification(): Promise<void> {
    await this.sendNotification({
      type: 'deployment_started',
      environment: this.config.environment,
      timestamp: new Date(),
    });
  }

  /**
   * Execute all deployment steps
   */
  private async executeDeploymentSteps(result: FullDeploymentResult, _startTime: number): Promise<boolean> {
    const migrationStart = Date.now();

    // Step 1: Validate
    if (!await this.executeValidationStep(result, migrationStart)) {
      return false;
    }

    // Step 2: Backup
    if (!await this.executeBackupStep(result)) {
      return false;
    }

    // Step 3: Migrate
    if (!await this.executeMigrationStep(result, migrationStart)) {
      return false;
    }

    // Step 4: Deploy
    if (!await this.executeDeploymentStep(result)) {
      return false;
    }

    // Step 5: Verify
    return await this.executeVerificationStep(result);
  }

  /**
   * Execute validation step
   */
  private async executeValidationStep(result: FullDeploymentResult, migrationStart: number): Promise<boolean> {
    const validation = await this.validatePreDeployment();
    if (!validation.isValid) {
      await this.recordMetric('validation', 'failed', {
        error: validation.errors.join(', '),
        details: validation
      });
      result.success = false;
      result.failedStep = 'validate';
      return false;
    }

    await this.recordMetric('validation', 'success', {
      duration: Date.now() - migrationStart
    });
    result.steps.push('validate');
    return true;
  }

  /**
   * Execute backup step
   */
  private async executeBackupStep(result: FullDeploymentResult): Promise<boolean> {
    if (!this.config.backupEnabled || this.config.dryRun) {
      return true;
    }

    await this.recordMetric('backup', 'started');
    const backupStart = Date.now();
    const backup = await this.createBackup();

    if (!backup.success) {
      await this.recordMetric('backup', 'failed', {
        error: backup.error,
        duration: Date.now() - backupStart
      });
      result.success = false;
      result.failedStep = 'backup';
      return false;
    }

    await this.recordMetric('backup', 'success', {
      duration: Date.now() - backupStart,
      details: { backupPath: backup.backupPath }
    });
    result.steps.push('backup');
    return true;
  }

  /**
   * Execute migration step
   */
  private async executeMigrationStep(result: FullDeploymentResult, migrationStart: number): Promise<boolean> {
    await this.recordMetric('migration', 'started');
    const migrationStepStart = Date.now();
    const migration = await this.runMigrations();

    if (!migration.success) {
      await this.recordMetric('migration', 'failed', {
        error: migration.error,
        duration: Date.now() - migrationStepStart
      });
      result.success = false;
      result.failedStep = 'migrate';
      result.migrationError = migration.error;

      if (this.config.autoRollback) {
        await this.executeAutoRollback();
        result.rollbackTriggered = true;
      }
      return false;
    }

    await this.recordMetric('migration', 'success', {
      duration: Date.now() - migrationStepStart,
      details: { migrationsExecuted: migration.migrationsExecuted }
    });
    result.steps.push('migrate');
    result.metrics.migrationTime = Date.now() - migrationStart;
    return true;
  }

  /**
   * Execute deployment step
   */
  private async executeDeploymentStep(result: FullDeploymentResult): Promise<boolean> {
    await this.recordMetric('deployment', 'started');
    const deployStart = Date.now();
    const deployment = await this.deployToFlyio();

    if (!deployment.success) {
      await this.recordMetric('deployment', 'failed', {
        error: deployment.error,
        duration: Date.now() - deployStart
      });
      result.success = false;
      result.failedStep = 'deploy';

      if (this.config.autoRollback) {
        await this.executeAutoRollback();
        result.rollbackTriggered = true;
      }
      return false;
    }

    await this.recordMetric('deployment', 'success', {
      duration: Date.now() - deployStart,
      details: { deploymentId: deployment.deploymentId }
    });
    result.steps.push('deploy');
    result.metrics.deploymentTime = Date.now() - deployStart;
    return true;
  }

  /**
   * Execute verification step
   */
  private async executeVerificationStep(result: FullDeploymentResult): Promise<boolean> {
    await this.recordMetric('verification', 'started');
    const verifyStart = Date.now();
    const verification = await this.verifyDeployment();

    if (!verification.success) {
      await this.recordMetric('verification', 'failed', {
        duration: Date.now() - verifyStart,
        details: verification
      });
      result.success = false;
      result.failedStep = 'verify';
      return false;
    }

    await this.recordMetric('verification', 'success', {
      duration: Date.now() - verifyStart,
      details: verification
    });
    result.steps.push('verify');
    result.metrics.verificationTime = Date.now() - verifyStart;
    return true;
  }

  /**
   * Execute auto rollback
   */
  private async executeAutoRollback(): Promise<void> {
    await this.recordMetric('rollback', 'started');
    await this.rollback();
    await this.recordMetric('rollback', 'success');
  }

  /**
   * Send deployment success notification
   */
  private async sendDeploymentSuccessNotification(metrics: any): Promise<void> {
    await this.sendNotification({
      type: 'deployment_success',
      environment: this.config.environment,
      timestamp: new Date(),
      metrics,
    });
  }

  /**
   * Handle deployment error
   */
  private handleDeploymentError(result: FullDeploymentResult, startTime: number, error: unknown): FullDeploymentResult {
    result.success = false;
    result.metrics.totalTime = Date.now() - startTime;

    // Send failure notification (fire and forget)
    this.sendNotification({
      type: 'deployment_failed',
      environment: this.config.environment,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : String(error),
    }).catch(console.error);

    return result;
  }

  /**
   * Send deployment notification
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    // Implementation would integrate with notification service
    // For now, we'll just log the notification
    console.log('Deployment notification:', payload);
  }

  /**
   * Execute command with timeout
   */
  private async executeWithTimeout(command: string, timeout: number): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command execution timeout after ${timeout}ms`));
      }, timeout);

      execAsync(command)
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
   * Extract deployment ID from Fly.io output
   */
  private extractDeploymentId(_output: string): string {
    // This would parse the actual Fly.io output to extract deployment ID
    return 'deployment-' + Date.now();
  }
}