const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  maxWorkers: process.env.CI ? 1 : '75%',
  maxConcurrency: process.env.CI ? 5 : 10,
  testSequencer: '<rootDir>/jest.sequencer.js',
  workerIdleMemoryLimit: '512MB',
  testTimeout: process.env.CI ? 10000 : 30000,
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/components/forms/character/__tests__/CharacterCreationForm.test.tsx',
    '<rootDir>/src/lib/hooks/__tests__/useInitiativeTracker.test.ts',
    ...(process.env.CI ? [
      '<rootDir>/src/app/characters/hooks/__tests__/useCharacterPageActions.test.ts',
      '<rootDir>/src/components/party/hooks/__tests__/usePartyData.test.ts',
      '<rootDir>/src/lib/validations/__tests__/error-recovery.test.ts',
      '<rootDir>/src/lib/models/encounter/__tests__/combatStateManager.test.ts',
      '<rootDir>/src/app/api/encounters/[id]/combat/__tests__/turn-management-api.test.ts'
    ] : [])
  ],
  testMatch: ['<rootDir>/src/**/*.test.{js,jsx,ts,tsx}'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/**/*.{md,mdx}',
    '!**/__tests__/**',
    '!src/app/**/*.tsx',
    '!src/app/**/*.ts',
    '!src/components/showcase/**',
    '!src/components/providers/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '@clerk/nextjs': '<rootDir>/src/lib/test-utils/shared-clerk-test-helpers.tsx',
    '@clerk/nextjs/server': '<rootDir>/src/lib/test-utils/shared-clerk-test-helpers.tsx',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(next/|@next/|@swc/helpers|@babel/runtime|@clerk/.*|jose|svix|@panva/.*|@web3-storage/.*|@stablelib/.*|zod-validation-error)/)',
  ],
};

module.exports = createJestConfig(customJestConfig);