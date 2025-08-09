/**
 * Jest configuration for End-to-End (E2E) tests using Puppeteer
 * Separate configuration to handle browser-based testing with different requirements
 */

const createJestConfig = require('next/jest')({
  dir: './',
});

const customE2EJestConfig = {
  displayName: 'E2E Tests',
  testEnvironment: 'node', // Use Node environment for Puppeteer
  testMatch: ['<rootDir>/src/**/*.e2e.test.{js,ts}'], // Only run E2E tests
  setupFilesAfterEnv: ['<rootDir>/jest.e2e.setup.js'],
  testTimeout: 120000, // 2 minutes for E2E tests
  maxWorkers: 1, // Run E2E tests serially to avoid browser conflicts
  maxConcurrency: 1, // One test at a time
  clearMocks: true,
  verbose: true, // Show individual test results
  
  // Module resolution for E2E tests
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Transform configuration for TypeScript
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2017',
        },
      },
    }],
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
  
  // Global variables for E2E tests
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};

module.exports = createJestConfig(customE2EJestConfig);