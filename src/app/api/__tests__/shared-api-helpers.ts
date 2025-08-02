import { NextRequest } from 'next/server';

// Generic API request creator
export const createMockApiRequest = (
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): NextRequest => {
  const { method = 'GET', body, headers = {} } = options;

  const req = new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    (req.json as jest.Mock) = jest.fn().mockResolvedValue(body);
  }

  return req;
};

// Common response assertion patterns
export const expectApiSuccess = async (
  response: Response,
  expectedStatus = 200,
  expectedMessage?: string
) => {
  const data = await response.json();
  expect(response.status).toBe(expectedStatus);
  expect(data.success).toBe(true);

  if (expectedMessage) {
    expect(data.message).toBe(expectedMessage);
  }

  return data;
};

export const expectApiError = async (
  response: Response,
  expectedStatus: number,
  expectedMessage: string
) => {
  const data = await response.json();
  expect(response.status).toBe(expectedStatus);
  expect(data.success).toBe(false);
  expect(data.message).toBe(expectedMessage);
  return data;
};

export const expectUnauthorizedError = async (response: Response) => {
  return expectApiError(response, 401, 'Authentication required');
};

export const expectForbiddenError = async (response: Response) => {
  return expectApiError(response, 403, 'Access denied');
};

export const expectNotFoundError = async (response: Response) => {
  return expectApiError(response, 404, 'Not found');
};

export const expectInternalServerError = async (response: Response) => {
  return expectApiError(response, 500, 'Internal server error');
};

// Database connection mock helpers
export const mockDbConnection = () => {
  const { connectToDb } = require('@/lib/db');
  connectToDb.mockResolvedValue(undefined);
  return connectToDb;
};

// Environment variable mock helpers
export const mockEnvironmentVariables = (envVars: Record<string, string>) => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...envVars };
  });

  afterEach(() => {
    process.env = originalEnv;
  });
};

// Test cleanup helpers
export const setupMockCleanup = () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
};

// Rate limiting test helpers
export const expectRateLimitError = async (response: Response) => {
  return expectApiError(response, 429, 'Too many requests');
};

// Validation error helpers (more specific than auth helpers)
export const expectValidationFailure = async (
  response: Response,
  expectedField?: string
) => {
  const data = await response.json();
  expect(response.status).toBe(400);
  expect(data.success).toBe(false);
  expect(data.message).toMatch(/validation/i);

  if (expectedField) {
    expect(data.errors || data.details).toBeDefined();
  }

  return data;
};