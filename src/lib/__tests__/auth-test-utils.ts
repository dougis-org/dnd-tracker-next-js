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
    subscriptionTier: 'expert',
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

/**
 * Helper to get NextAuth config from mock
 */
export function getAuthConfig(mockNextAuth: jest.Mock): any {
  if (!mockNextAuth || !mockNextAuth.mock || !mockNextAuth.mock.calls[0]) {
    throw new Error('getAuthConfig: mockNextAuth has not been called yet');
  }
  return mockNextAuth.mock.calls[0][0];
}

/**
 * Helper to test auth import with console spy if needed
 */
export async function testAuthImport(useConsoleSpy = false): Promise<any> {
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
 * Helper to test auth configuration with environment and console spy
 */
export async function testAuthConfigWithEnvAndSpy(
  env: Partial<NodeJS.ProcessEnv>
): Promise<any> {
  setupEnvironment(env);
  return testAuthImport(true);
}

/**
 * Common beforeEach setup for auth tests
 */
export function setupAuthTestMocks(
  mockNextAuth: jest.Mock,
  mockGetUserByEmail?: jest.Mock,
  mockAuthenticateUser?: jest.Mock
): void {
  jest.clearAllMocks();
  jest.resetModules();

  if (mockGetUserByEmail) {
    mockGetUserByEmail.mockClear();
  }
  if (mockAuthenticateUser) {
    mockAuthenticateUser.mockClear();
  }

  // Setup NextAuth mock to return proper structure
  mockNextAuth.mockImplementation((config) => {
    if (config && config.callbacks) {
      (mockNextAuth as any)._lastConfig = config;
    }
    return {
      handlers: { GET: jest.fn(), POST: jest.fn() },
      auth: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    };
  });
}

/**
 * Helper to import auth module with console spy and reset modules
 */
export function importAuthWithConsoleSpy(): void {
  withConsoleSpy(() => {
    jest.resetModules();
    import('../auth');
  });
}

/**
 * Helper to test auth with environment setup and console spy
 */
export function testAuthWithEnvAndSpy(env: Partial<NodeJS.ProcessEnv>): void {
  setupEnvironment(env);
  importAuthWithConsoleSpy();
}

/**
 * Helper to setup standard auth test environment
 */
export function setupAuthEnvironment(nextAuthUrl?: string, nodeEnv = 'production'): void {
  const env: Partial<NodeJS.ProcessEnv> = {
    NODE_ENV: nodeEnv,
    MONGODB_URI: 'mongodb://localhost:27017/test',
    MONGODB_DB_NAME: 'testdb',
    NEXTAUTH_SECRET: 'test-secret',
  };

  if (nextAuthUrl) {
    env.NEXTAUTH_URL = nextAuthUrl;
  }

  setupEnvironment(env);
}

/**
 * Helper for common beforeEach auth test setup
 */
export function setupCommonAuthTestMocks(mockNextAuth: jest.Mock): void {
  setupAuthTestMocks(mockNextAuth);
  setupAuthEnvironment();
}

/**
 * Helper to test environment setup with conditional import/spy
 */
export function testEnvWithConditionalImport(env: Partial<NodeJS.ProcessEnv>, shouldWarn: boolean): void {
  setupEnvironment(env);
  if (shouldWarn) {
    importAuthWithConsoleSpy();
  } else {
    jest.resetModules();
    import('../auth');
  }
}

/**
 * Helper to backup, set, test, and restore environment variables
 */
export function testWithTemporaryEnv(envKeys: string[], testEnv: Partial<NodeJS.ProcessEnv>, testFn: () => void): void {
  const originalEnv: Record<string, string | undefined> = {};

  // Backup original values
  envKeys.forEach(key => {
    originalEnv[key] = process.env[key];
  });

  // Set test environment
  setupEnvironment(testEnv);

  try {
    testFn();
  } finally {
    // Restore environment
    envKeys.forEach(key => {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    });
  }
}

/**
 * Helper to test callback with withConsoleSpy wrapper
 */
export async function testCallbackWithSpy(
  testCallback: (_name: string, _params: any) => Promise<any>,
  callbackName: string,
  params: any,
  expectResult: any
): Promise<void> {
  await withConsoleSpy(async _consoleSpy => {
    const result = await testCallback(callbackName, params);
    expect(result).toEqual(expectResult);
  });
}

/**
 * Helper to get NextAuth configuration from mock after import
 * CONSOLIDATED: Replaces duplicate implementations in coverage.test.ts and authorize-callback.test.ts
 */
export async function getAuthConfigAsync(mockNextAuth: jest.Mock): Promise<any> {
  jest.resetModules();
  await import('../auth');
  if (!mockNextAuth.mock.calls[0]) {
    throw new Error('NextAuth mock was not called. Ensure auth module was imported.');
  }
  return mockNextAuth.mock.calls[0][0];
}

/**
 * Helper to create comprehensive mock authentication data
 * CONSOLIDATED: Replaces duplicate implementations in coverage.test.ts and authorize-callback.test.ts
 */
export function createMockAuthData(overrides: Partial<any> = {}) {
  const mockUser = createMockUser({
    id: 'user123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    subscriptionTier: 'premium',
    ...overrides,
  });

  return {
    user: mockUser,
    getUserResult: { success: true, data: mockUser },
    authResult: { success: true, data: { user: mockUser } },
    credentials: { email: 'test@example.com', password: 'correctpassword' }
  };
}

/**
 * Helper to test NextAuth authorize function with comprehensive assertion options
 * CONSOLIDATED: Replaces similar implementations in coverage.test.ts and authorize-callback.test.ts
 */
export async function testAuthorize(
  mockNextAuth: jest.Mock,
  credentials: any,
  expectResult: any = null
): Promise<any> {
  const config = await getAuthConfigAsync(mockNextAuth);
  const authorizeFunc = config.providers[0].authorize;
  const result = await authorizeFunc(credentials);

  if (expectResult === null) {
    expect(result).toBeNull();
  } else {
    expect(result).toEqual(expectResult);
  }
  return result;
}

/**
 * Helper to test callback functions from NextAuth config
 * CONSOLIDATED: Provides common callback testing pattern
 */
export async function testCallback(mockNextAuth: jest.Mock, callbackName: string, params: any): Promise<any> {
  const { SecureCallbackAccessor } = require('../../test-utils/secure-method-calls');
  const config = await getAuthConfigAsync(mockNextAuth);
  const callback = SecureCallbackAccessor.getCallback(config, callbackName);
  if (!callback) {
    throw new Error(`Callback ${callbackName} not found`);
  }
  return callback(params);
}
