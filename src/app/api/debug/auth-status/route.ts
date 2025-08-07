/**
 * Authentication Debug API - Issue #620
 * Temporary endpoint to help debug authentication issues
 * REMOVE AFTER ISSUE IS RESOLVED
 */

import { NextRequest, NextResponse } from 'next/server';
import { diagnoseAuthIssues, testAuthentication } from '@/lib/auth-diagnostics';

export async function POST(request: NextRequest) {
  // Only allow in development/staging
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEBUG_ENDPOINTS) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { email, password, action } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    switch (action) {
      case 'diagnose':
        const diagnostics = await diagnoseAuthIssues(email);
        return NextResponse.json({
          action: 'diagnose',
          email,
          diagnostics,
          timestamp: new Date().toISOString(),
        });

      case 'test-auth':
        if (!password || typeof password !== 'string') {
          return NextResponse.json({ error: 'Password is required for auth test' }, { status: 400 });
        }

        const authTest = await testAuthentication(email, password);
        return NextResponse.json({
          action: 'test-auth',
          email,
          result: authTest,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Auth debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Only allow in development/staging
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEBUG_ENDPOINTS) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  return NextResponse.json({
    message: 'Auth debug endpoint - Issue #620',
    usage: {
      diagnose: 'POST with { "email": "user@example.com", "action": "diagnose" }',
      testAuth: 'POST with { "email": "user@example.com", "password": "password", "action": "test-auth" }',
    },
    note: 'This endpoint will be removed after Issue #620 is resolved',
  });
}