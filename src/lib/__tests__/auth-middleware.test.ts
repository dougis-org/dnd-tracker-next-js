import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '../auth/SessionManager';
import { testAuthMiddleware } from '../auth/middleware';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Add custom matcher
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});

describe('Auth Middleware', () => {
  let mongoServer: MongoMemoryServer;
  let sessionManager: SessionManager;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    sessionManager = new SessionManager();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all sessions before each test
    await sessionManager.clearAllSessions();
  });

  describe('Protected route access', () => {
    it('should redirect to signin for unauthenticated requests to protected pages', async () => {
      const request = new NextRequest('http://localhost:3000/dashboard');
      const response = await testAuthMiddleware(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/signin');
    });

    it('should return 401 for unauthenticated API requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/123');
      const response = await testAuthMiddleware(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should allow access to authenticated users with valid sessions', async () => {
      // Create a valid session
      const sessionId = await sessionManager.createSession({
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free'
      });

      const request = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          Cookie: `session=${sessionId}`
        }
      });

      const response = await testAuthMiddleware(request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });

    it('should reject expired sessions', async () => {
      // Create an expired session
      const sessionId = await sessionManager.createSession({
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free'
      }, new Date(Date.now() - 1000)); // Expired 1 second ago

      const request = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          Cookie: `session=${sessionId}`
        }
      });

      const response = await testAuthMiddleware(request);
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/signin');
    });
  });

  describe('Route protection configuration', () => {
    const publicRoutes = [
      '/',
      '/signin',
      '/signup',
      '/forgot-password',
      '/verify-email',
      '/api/auth/signin',
      '/api/auth/signup'
    ];

    const protectedRoutes = [
      '/dashboard',
      '/characters',
      '/parties',
      '/encounters',
      '/combat',
      '/settings',
      '/api/users/123',
      '/api/characters/456',
      '/api/encounters/789'
    ];

    publicRoutes.forEach(route => {
      it(`should allow access to public route: ${route}`, async () => {
        const request = new NextRequest(`http://localhost:3000${route}`);
        const response = await testAuthMiddleware(request);

        expect(response).toBeInstanceOf(NextResponse);
        expect(response.status).toBe(200);
      });
    });

    protectedRoutes.forEach(route => {
      it(`should protect route: ${route}`, async () => {
        const request = new NextRequest(`http://localhost:3000${route}`);
        const response = await testAuthMiddleware(request);

        expect(response.status).toBeOneOf([302, 401]);
      });
    });
  });

  describe('Session cookie handling', () => {
    it('should extract session ID from cookies', async () => {
      const sessionId = await sessionManager.createSession({
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free'
      });

      const request = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          Cookie: `session=${sessionId}; other=value`
        }
      });

      const response = await testAuthMiddleware(request);
      expect(response.status).toBe(200);
    });

    it('should handle missing session cookie', async () => {
      const request = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          Cookie: 'other=value'
        }
      });

      const response = await testAuthMiddleware(request);
      expect(response.status).toBe(302);
    });

    it('should handle malformed session ID', async () => {
      const request = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          Cookie: 'session=invalid-session-id'
        }
      });

      const response = await testAuthMiddleware(request);
      expect(response.status).toBe(302);
    });
  });

  describe('Production environment considerations', () => {
    it('should handle fly.io proxy headers correctly', async () => {
      const sessionId = await sessionManager.createSession({
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free'
      });

      const request = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          Cookie: `session=${sessionId}`,
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-Host': 'myapp.fly.dev'
        }
      });

      const response = await testAuthMiddleware(request);
      expect(response.status).toBe(200);
    });

    it('should validate trusted origins in production', async () => {
      process.env.NODE_ENV = 'production';

      const request = new NextRequest('http://malicious-site.com/dashboard');
      const response = await testAuthMiddleware(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/signin');

      process.env.NODE_ENV = 'test';
    });
  });
});