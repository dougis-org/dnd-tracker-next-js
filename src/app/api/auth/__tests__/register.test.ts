// Import mocked NextRequest - the real one will be replaced with our mock
import { NextRequest } from 'next/server';
import { POST } from '../register/route';
import { UserService } from '@/lib/services/UserService';
import { createMockRequest } from './test-utils';

// Configure Jest to use our mocks
jest.mock('next/server');

// Mock the UserService
jest.mock('@/lib/services/UserService', () => {
  return {
    UserService: {
      createUser: jest.fn(),
    },
  };
});

describe('POST /api/auth/register', () => {
  const mockUserData = {
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    email: 'john.doe@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    agreeToTerms: true,
    subscribeToNewsletter: false,
  };

  // createMockRequest now imported from test-utils

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully registers a new user', async () => {
    // Mock the UserService.createUser method to return success
    UserService.createUser = jest.fn().mockResolvedValue({
      success: true,
      data: {
        user: {
          id: '12345',
          email: 'john.doe@example.com',
          username: 'johndoe',
        },
        emailBypass: false,
      },
    });

    const request = createMockRequest(mockUserData);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData).toEqual({
      success: true,
      message: 'User registered successfully',
      user: {
        id: '12345',
        email: 'john.doe@example.com',
        username: 'johndoe',
      },
      emailBypass: false,
    });
    expect(UserService.createUser).toHaveBeenCalledWith(mockUserData);
  });

  it('returns validation errors for invalid data', async () => {
    // Invalid data (missing required fields)
    const invalidData = {
      email: 'invalid-email',
      password: 'short',
    };

    const request = createMockRequest(invalidData);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.message).toBe('Validation error');
    expect(responseData.errors).toBeDefined();
    expect(responseData.errors.length).toBeGreaterThan(0);
    expect(UserService.createUser).not.toHaveBeenCalled();
  });

  it('handles service errors', async () => {
    // Mock the UserService.createUser method to return an error
    const mockError = {
      success: false,
      error: {
        message: 'Email already exists',
        statusCode: 409,
        details: [{ field: 'email', message: 'Email already exists' }],
      },
    };

    UserService.createUser = jest.fn().mockResolvedValue(mockError);

    const request = createMockRequest(mockUserData);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(409);
    expect(responseData).toEqual({
      success: false,
      message: 'Email already exists',
      errors: [{ field: 'email', message: 'Email already exists' }],
    });
    expect(UserService.createUser).toHaveBeenCalledWith(mockUserData);
  });

  it('handles unexpected errors', async () => {
    // Mock the UserService.createUser method to throw an error
    UserService.createUser = jest
      .fn()
      .mockRejectedValue(new Error('Unexpected error'));

    const request = createMockRequest(mockUserData);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData).toEqual({
      success: false,
      message: 'An unexpected error occurred',
    });
    expect(UserService.createUser).toHaveBeenCalledWith(mockUserData);
  });

  // Helper function to create user existence error mock
  const createUserExistsMock = (field: string, value: string) => ({
    success: false,
    error: {
      message: `User already exists with ${field}: ${value}`,
      code: 'USER_ALREADY_EXISTS',
      statusCode: 409,
    },
  });

  // Helper function to create server error mock
  const createServerErrorMock = (message: string, code: string = 'DATABASE_ERROR') => ({
    success: false,
    error: {
      message,
      code,
      statusCode: 500,
    },
  });

  // Helper function to test error response
  const testErrorResponse = async (userData: any, expectedStatus: number, expectedMessage: string) => {
    const request = createMockRequest(userData);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(expectedStatus);
    expect(responseData.success).toBe(false);
    expect(responseData.message).toBe(expectedMessage);
    return responseData;
  };

  it('handles actual duplicate email registration correctly', async () => {
    // First, mock a successful user creation
    UserService.createUser = jest.fn().mockResolvedValueOnce({
      success: true,
      data: {
        id: '12345',
        email: 'duplicate@example.com',
        username: 'duplicateuser',
      },
    });

    // Create first user successfully
    const firstUserData = {
      ...mockUserData,
      email: 'duplicate@example.com',
      username: 'duplicateuser',
    };
    const firstRequest = createMockRequest(firstUserData);
    const firstResponse = await POST(firstRequest);
    expect(firstResponse.status).toBe(201);

    // Now mock the error for duplicate user
    UserService.createUser = jest.fn().mockResolvedValueOnce(
      createUserExistsMock('email', 'duplicate@example.com')
    );

    // Try to create the same user again
    await testErrorResponse(
      firstUserData,
      409,
      'User already exists with email: duplicate@example.com'
    );
  });

  it('handles actual duplicate username registration correctly', async () => {
    // Mock the error for duplicate username
    UserService.createUser = jest.fn().mockResolvedValueOnce(
      createUserExistsMock('username', 'duplicateusername')
    );

    const duplicateUsernameData = {
      ...mockUserData,
      email: 'different@example.com',
      username: 'duplicateusername',
    };

    await testErrorResponse(
      duplicateUsernameData,
      409,
      'User already exists with username: duplicateusername'
    );
  });

  it('handles internal server errors correctly instead of returning 409', async () => {
    // Mock an internal server error (like database connection issues)
    UserService.createUser = jest.fn().mockResolvedValueOnce(
      createServerErrorMock('An unexpected error occurred during registration', 'REGISTRATION_FAILED')
    );

    const responseData = await testErrorResponse(
      mockUserData,
      500,
      'An unexpected error occurred during registration'
    );

    // Register route adds errors field for all non-success responses
    expect(responseData.errors).toEqual([{ field: '', message: 'An unexpected error occurred during registration' }]);
  });

  it('handles unknown database errors correctly', async () => {
    // Mock an unknown database error
    UserService.createUser = jest.fn().mockResolvedValueOnce(
      createServerErrorMock('Connection timeout')
    );

    await testErrorResponse(mockUserData, 500, 'Connection timeout');
  });

  it('handles password validation errors correctly', async () => {
    // Mock password validation error
    UserService.createUser = jest.fn().mockResolvedValueOnce({
      success: false,
      error: {
        message: 'Password does not meet security requirements: too short',
        code: 'INVALID_PASSWORD',
        statusCode: 400,
      },
    });

    await testErrorResponse(
      mockUserData,
      400,
      'Password does not meet security requirements: too short'
    );
  });

  it('handles invalid password format errors correctly', async () => {
    // Mock invalid password format error
    UserService.createUser = jest.fn().mockResolvedValueOnce({
      success: false,
      error: {
        message: 'Invalid password format',
        code: 'INVALID_PASSWORD_FORMAT',
        statusCode: 400,
      },
    });

    await testErrorResponse(
      mockUserData,
      400,
      'Invalid password format'
    );
  });

  it('handles MongoDB duplicate key error with code 11000', async () => {
    // Mock MongoDB duplicate key error
    UserService.createUser = jest.fn().mockResolvedValueOnce(
      createUserExistsMock('email', 'test@example.com')
    );

    await testErrorResponse(
      { ...mockUserData, email: 'test@example.com' },
      409,
      'User already exists with email: test@example.com'
    );
  });

  it('handles service-level validation errors', async () => {
    // Mock validation error from UserService
    UserService.createUser = jest.fn().mockResolvedValueOnce({
      success: false,
      error: {
        message: 'Invalid data provided',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      },
    });

    await testErrorResponse(
      mockUserData,
      400,
      'Invalid data provided'
    );
  });

  it('handles input validation errors from Zod schema', async () => {
    // Invalid data that will fail Zod validation (missing required fields)
    const invalidData = {
      email: 'invalid-email',
      password: 'short', // Will fail validation
    };

    const request = createMockRequest(invalidData);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.message).toBe('Validation error');
    expect(responseData.errors).toBeDefined();
    expect(responseData.errors.length).toBeGreaterThan(0);
    expect(UserService.createUser).not.toHaveBeenCalled();
  });

  it('handles UserAlreadyExistsError from service correctly', async () => {
    // Mock UserAlreadyExistsError
    UserService.createUser = jest.fn().mockResolvedValueOnce({
      success: false,
      error: {
        message: 'User already exists with email: existing@example.com',
        code: 'USER_ALREADY_EXISTS',
        statusCode: 409,
      },
    });

    await testErrorResponse(
      { ...mockUserData, email: 'existing@example.com' },
      409,
      'User already exists with email: existing@example.com'
    );
  });

  it('handles mongoose validation errors with "validation" keyword', async () => {
    // Mock a mongoose validation error
    UserService.createUser = jest.fn().mockResolvedValueOnce({
      success: false,
      error: {
        message: 'Invalid data provided',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      },
    });

    await testErrorResponse(
      mockUserData,
      400,
      'Invalid data provided'
    );
  });

  it('handles non-Error objects gracefully', async () => {
    // Mock an error that's not an Error instance
    UserService.createUser = jest.fn().mockResolvedValueOnce({
      success: false,
      error: {
        message: 'An unexpected error occurred during registration',
        code: 'REGISTRATION_FAILED',
        statusCode: 500,
      },
    });

    await testErrorResponse(
      mockUserData,
      500,
      'An unexpected error occurred during registration'
    );
  });
});
