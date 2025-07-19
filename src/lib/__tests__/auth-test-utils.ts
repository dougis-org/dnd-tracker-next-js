/**
 * Shared utilities for authentication tests
 */

/**
 * Helper to setup mock environment variables for auth tests
 */
export function setupAuthTestEnv(): NodeJS.ProcessEnv {
  const originalEnv = process.env;
  process.env = {
    ...originalEnv,
    MONGODB_URI: 'mongodb://localhost:27017/test',
    MONGODB_DB_NAME: 'testdb',
    NODE_ENV: 'test',
  };
  return originalEnv;
}

/**
 * Helper to restore environment variables
 */
export function restoreAuthTestEnv(originalEnv: NodeJS.ProcessEnv): void {
  process.env = originalEnv;
}

/**
 * Common auth test expectations
 */
export const authTestAssertions = {
  expectModuleExports(authModule: any): void {
    expect(authModule.handlers).toBeDefined();
    expect(authModule.auth).toBeDefined();
    expect(authModule.signIn).toBeDefined();
    expect(authModule.signOut).toBeDefined();
  },

  expectMockDefined(mockFunction: any): void {
    expect(mockFunction).toBeDefined();
  },

  expectNodeEnv(expectedEnv: string): void {
    expect(process.env.NODE_ENV).toBe(expectedEnv);
  },
};

/**
 * Helper to create mock user data for tests
 */
export function createMockUser(overrides: Partial<any> = {}): any {
  return {
    _id: 'user123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    subscriptionTier: 'premium',
    ...overrides,
  };
}

/**
 * Helper to setup and restore console spy
 */
export function withConsoleSpy(
  callback: (_spy: jest.SpyInstance) => void
): void {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  try {
    callback(consoleSpy);
  } finally {
    consoleSpy.mockRestore();
  }
}

/**
 * Helper to test different NODE_ENV values
 */
export function testWithNodeEnv(env: string, testFn: () => void): void {
  const originalNodeEnv = process.env.NODE_ENV;
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: env,
    writable: true,
    configurable: true,
  });
  jest.resetModules();

  try {
    testFn();
  } finally {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalNodeEnv,
      writable: true,
      configurable: true,
    });
  }
}

/**
 * Helper to setup environment variables and reset modules
 */
export function setupEnvironment(env: Partial<NodeJS.ProcessEnv>): void {
  Object.keys(env).forEach(key => {
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  });
}

/**
 * Helper to test auth configuration with environment setup
 */
export async function testAuthConfigWithEnv(
  env: Partial<NodeJS.ProcessEnv>,
  useConsoleSpy = false
): Promise<any> {
  setupEnvironment(env);
  jest.resetModules();

  if (useConsoleSpy) {
    return new Promise((resolve) => {
      withConsoleSpy(() => {
        resolve(import('../auth'));
      });
    });
  }

  return import('../auth');
}

/**
 * Helper to test middleware authentication
 */
export async function testMiddlewareAuth(
  token: any,
  route: string,
  shouldRedirect: boolean
): Promise<void> {
  const { getToken } = require('next-auth/jwt');
  const mockGetToken = getToken as jest.Mock;
  mockGetToken.mockResolvedValue(token);

  const middleware = await import('../../middleware');
  const mockRequest = {
    nextUrl: { pathname: route },
    url: `https://dnd-tracker-next-js.fly.dev${route}`
  } as any;

  const response = await middleware.middleware(mockRequest);

  if (shouldRedirect) {
    expect(response).toBeDefined();
    expect(response.type).toBe('redirect');
    const location = response.headers.get('location');
    expect(location).toContain('/signin');
  }
}

/**
 * Helper to verify URL validation results
 */
export function verifyUrlValidation(urls: string[], shouldBeValid: boolean): void {
  urls.forEach(url => {
    if (shouldBeValid) {
      expect(url).toMatch(/^https:\/\//);
      expect(url).not.toContain('localhost');
      expect(url).not.toContain('0.0.0.0');
      expect(url).not.toContain('127.0.0.1');
      expect(() => new URL(url)).not.toThrow();
    } else {
      expect(url).toContain('0.0.0.0');
    }
  });
}
