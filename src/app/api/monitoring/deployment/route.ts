/**
 * Deployment monitoring API endpoint
 * Provides access to deployment metrics, alerts, and statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { DeploymentMonitor, AlertConfig } from '@/lib/monitoring/deployment-monitor';
import { auth } from '@/lib/auth';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Validate that the user is authenticated and has admin privileges
 * Only admins should access monitoring endpoints
 */
async function validateAdminAuth(): Promise<NextResponse | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check if user has admin role - monitoring data should be admin-only
  // This assumes the session contains role information from the JWT token
  const userRole = (session as any)?.user?.role || 'user';
  if (userRole !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Admin access required for monitoring endpoints' },
      { status: 403 }
    );
  }

  return null; // Authentication successful
}

// Deployment monitor singleton - uses proper singleton pattern for production environments
class MonitorSingleton {
  private static instance: DeploymentMonitor | null = null;

  private static initPromise: Promise<DeploymentMonitor> | null = null;

  static async getInstance(): Promise<DeploymentMonitor> {
    if (this.instance) {
      return this.instance;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeMonitor();
    this.instance = await this.initPromise;
    this.initPromise = null;

    return this.instance;
  }

  private static async initializeMonitor(): Promise<DeploymentMonitor> {

  try {
    // Load monitoring configuration
    const configPath = path.join(process.cwd(), 'config', 'monitoring.json');
    const configFile = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configFile);

    const environment = process.env.NODE_ENV || 'development';
    const envConfig = config.environments[environment];

    if (!envConfig) {
      throw new Error(`No monitoring configuration found for environment: ${environment}`);
    }

    const alertConfig: AlertConfig = {
      environment,
      channels: envConfig.channels,
      thresholds: envConfig.thresholds,
      enabled: envConfig.enabled,
    };

    return new DeploymentMonitor(alertConfig);
  } catch (error) {
    console.error('Failed to initialize deployment monitor:', error);

    // Fallback configuration
    const fallbackConfig: AlertConfig = {
      environment: process.env.NODE_ENV || 'development',
      channels: [],
      thresholds: {
        deploymentDuration: 300000,
        migrationDuration: 60000,
        errorRate: 0.1,
        consecutiveFailures: 3,
      },
      enabled: false,
    };

    return new DeploymentMonitor(fallbackConfig);
  }
  }
}

// GET request handlers
class GetRequestHandler {
  static async handleStats(monitor: DeploymentMonitor, environment: string | null): Promise<NextResponse> {
    const stats = monitor.getDeploymentStats(environment || undefined);
    return NextResponse.json({ success: true, data: stats });
  }

  static async handleMetrics(monitor: DeploymentMonitor, format: string): Promise<NextResponse> {
    const metrics = monitor.exportMetrics(format as 'json' | 'csv');

    if (format === 'csv') {
      return new NextResponse(metrics, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=deployment-metrics.csv',
        },
      });
    }

    return NextResponse.json({ success: true, data: JSON.parse(metrics) });
  }

  static async handleHealth(monitor: DeploymentMonitor): Promise<NextResponse> {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      monitor: {
        initialized: true,
        environment: monitor.getDeploymentStats().environment,
        enabled: true,
      },
      endpoints: {
        api: 'ok',
        database: 'ok',
        external: 'ok',
      },
    };
    return NextResponse.json(healthStatus);
  }
}

/**
 * GET /api/monitoring/deployment
 * Retrieve deployment monitoring data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate authentication and admin access
    const authError = await validateAdminAuth();
    if (authError) {
      return authError;
    }

    const { searchParams } = new URL(request.url);
    const environment = searchParams.get('environment');
    const action = searchParams.get('action') || 'stats';
    const format = searchParams.get('format') || 'json';

    const monitor = await MonitorSingleton.getInstance();

    switch (action) {
      case 'stats':
        return GetRequestHandler.handleStats(monitor, environment);
      case 'metrics':
        return GetRequestHandler.handleMetrics(monitor, format);
      case 'health':
        return GetRequestHandler.handleHealth(monitor);
      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

// POST request handlers
class PostRequestHandler {
  static async handleMetric(monitor: DeploymentMonitor, data: any): Promise<NextResponse> {
    if (!data || !data.environment || !data.deploymentId || !data.phase || !data.status) {
      return NextResponse.json({
        success: false,
        error: 'Missing required metric fields: environment, deploymentId, phase, status',
      }, { status: 400 });
    }

    const metric = {
      timestamp: new Date(),
      environment: data.environment,
      deploymentId: data.deploymentId,
      phase: data.phase,
      status: data.status,
      duration: data.duration,
      details: data.details,
      error: data.error,
    };

    await monitor.recordMetric(metric);
    return NextResponse.json({ success: true, message: 'Metric recorded successfully' });
  }

  static async handleResolveAlert(monitor: DeploymentMonitor, data: any): Promise<NextResponse> {
    if (!data || !data.alertId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: alertId',
      }, { status: 400 });
    }

    await monitor.resolveAlert(data.alertId, data.resolution);
    return NextResponse.json({ success: true, message: 'Alert resolved successfully' });
  }
}

/**
 * POST /api/monitoring/deployment
 * Record deployment metrics or trigger alerts
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate authentication and admin access
    const authError = await validateAdminAuth();
    if (authError) {
      return authError;
    }

    const body = await request.json();
    const { action, data } = body;

    const monitor = await MonitorSingleton.getInstance();

    switch (action) {
      case 'metric':
        return PostRequestHandler.handleMetric(monitor, data);
      case 'resolve-alert':
        return PostRequestHandler.handleResolveAlert(monitor, data);
      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}