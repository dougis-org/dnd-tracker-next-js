/**
 * Jest setup for End-to-End (E2E) tests
 * Configures the testing environment for Puppeteer-based browser testing
 */

// Global test timeout for E2E tests
jest.setTimeout(120000); // 2 minutes

// Environment variables for E2E testing
process.env.NODE_ENV = 'test';
process.env.TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';
process.env.BYPASS_EMAIL_VERIFICATION = 'true'; // Skip email verification in tests

// Enhanced console logging for E2E tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  const timestamp = new Date().toISOString();
  originalConsoleLog(`[${timestamp}] [E2E-LOG]`, ...args);
};

console.error = (...args) => {
  const timestamp = new Date().toISOString();
  originalConsoleError(`[${timestamp}] [E2E-ERROR]`, ...args);
};

console.warn = (...args) => {
  const timestamp = new Date().toISOString();
  originalConsoleWarn(`[${timestamp}] [E2E-WARN]`, ...args);
};

// Global test setup
beforeAll(async () => {
  console.log('Starting E2E test suite...');
  console.log(`Test base URL: ${process.env.TEST_BASE_URL}`);
  console.log(`CI environment: ${process.env.CI === 'true'}`);
});

// Global test teardown
afterAll(async () => {
  console.log('E2E test suite completed');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});