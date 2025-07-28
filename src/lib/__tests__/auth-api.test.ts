import { NextRequest } from 'next/server';
import { signInHandler, signOutHandler, signUpHandler } from '../auth/api-handlers';
import { SessionManager } from '../auth/SessionManager';
import { UserService } from '../services/UserService';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Mock UserService
jest.mock('../services/UserService');
const MockedUserService = UserService as jest.Mocked<typeof UserService>;

describe('Auth API Handlers', () => {
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
    await sessionManager.clearAllSessions();
    jest.clearAllMocks();
  });

  describe('Sign In Handler', () => {
    it('should authenticate user and create session', async () => {
      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionTier: 'free'
      };

      MockedUserService.authenticateUser.mockResolvedValue({
        success: true,
        data: { user: mockUser }
      });

      const requestData = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false
      };

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      // Mock the json method to return our test data
      request.json = jest.fn().mockResolvedValue(requestData);

      const response = await signInHandler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(mockUser.email);

      // Verify session cookie is set
      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('session=');
    });

    it('should return error for invalid credentials', async () => {
      MockedUserService.authenticateUser.mockResolvedValue({
        success: false,
        error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }
      });

      const requestData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      request.json = jest.fn().mockResolvedValue(requestData);

      const response = await signInHandler(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Invalid credentials');
    });

    it('should handle remember me functionality', async () => {
      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionTier: 'free'
      };

      MockedUserService.authenticateUser.mockResolvedValue({
        success: true,
        data: { user: mockUser }
      });

      const requestData = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true
      };

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      request.json = jest.fn().mockResolvedValue(requestData);

      const response = await signInHandler(request);
      const setCookieHeader = response.headers.get('Set-Cookie');

      // For remember me, session should have longer expiration
      expect(setCookieHeader).toContain('Max-Age=2592000'); // 30 days
    });

    it('should validate request body', async () => {
      const requestData = {
        email: 'invalid-email',
        password: ''
      };

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      request.json = jest.fn().mockResolvedValue(requestData);

      const response = await signInHandler(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Validation error');
    });
  });

  describe('Sign Out Handler', () => {
    it('should clear session and remove cookie', async () => {
      // Create a session first
      const sessionId = await sessionManager.createSession({
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        subscriptionTier: 'free'
      });

      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
        headers: {
          Cookie: `session=${sessionId}`
        }
      });

      const response = await signOutHandler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify session is deleted
      const session = await sessionManager.getSession(sessionId);
      expect(session).toBeNull();

      // Verify cookie is cleared
      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('session=; Max-Age=0');
    });

    it('should handle requests without session gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST'
      });

      const response = await signOutHandler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Sign Up Handler', () => {
    it('should create new user and session', async () => {
      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        subscriptionTier: 'free'
      };

      MockedUserService.createUser.mockResolvedValue({
        success: true,
        data: { user: mockUser }
      });

      const requestData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      request.json = jest.fn().mockResolvedValue(requestData);

      const response = await signUpHandler(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(mockUser.email);

      // Verify session cookie is set
      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('session=');
    });

    it('should return error for existing email', async () => {
      MockedUserService.createUser.mockResolvedValue({
        success: false,
        error: { message: 'Email already exists', code: 'EMAIL_EXISTS' }
      });

      const requestData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      request.json = jest.fn().mockResolvedValue(requestData);

      const response = await signUpHandler(request);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Email already exists');
    });

    it('should validate signup data', async () => {
      const requestData = {
        email: 'invalid-email',
        password: '123', // Too short
        firstName: '',
        lastName: ''
      };

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      request.json = jest.fn().mockResolvedValue(requestData);

      const response = await signUpHandler(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Validation error');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      MockedUserService.authenticateUser.mockRejectedValue(
        new Error('Database connection failed')
      );

      const requestData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      request.json = jest.fn().mockResolvedValue(requestData);

      const response = await signInHandler(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('Internal server error');
    });

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: 'invalid json'
      });

      // Mock json method to throw an error for malformed JSON
      request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await signInHandler(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Invalid JSON');
    });
  });

  describe('Security considerations', () => {
    it('should not expose sensitive user data in responses', async () => {
      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionTier: 'free',
        passwordHash: 'secret-hash'
      };

      MockedUserService.authenticateUser.mockResolvedValue({
        success: true,
        data: { user: mockUser }
      });

      const requestData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      request.json = jest.fn().mockResolvedValue(requestData);

      const response = await signInHandler(request);
      const data = await response.json();

      expect(data.user.passwordHash).toBeUndefined();
      expect(data.user.password).toBeUndefined();
    });

    it('should set secure cookie flags in production', async () => {
      process.env.NODE_ENV = 'production';

      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionTier: 'free'
      };

      MockedUserService.authenticateUser.mockResolvedValue({
        success: true,
        data: { user: mockUser }
      });

      const requestData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      request.json = jest.fn().mockResolvedValue(requestData);

      const response = await signInHandler(request);
      const setCookieHeader = response.headers.get('Set-Cookie');

      expect(setCookieHeader).toContain('Secure');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('SameSite=Strict');

      process.env.NODE_ENV = 'test';
    });
  });
});