/**
 * @jest-environment jsdom
 *
 * Test suite for Issue #499: Remove code duplication in auth test files
 *
 * Problem: Functions `isLocalHostname` and `isValidProductionHostname` are duplicated
 * between test files and the actual implementation in `src/lib/auth.ts`.
 *
 * Solution: Export utility functions from auth.ts and import them in tests.
 *
 * TDD Acceptance Criteria:
 * 1. Should be able to import isLocalHostname from src/lib/auth.ts
 * 2. Should be able to import isValidProductionHostname from src/lib/auth.ts
 * 3. Imported functions should behave identically to duplicated test functions
 * 4. Test files should no longer contain duplicated function implementations
 */

describe('Issue #499: Auth function duplication removal', () => {
  describe('TDD: Functions should be importable from auth.ts (will initially fail)', () => {
    it('should be able to import isLocalHostname from auth.ts', async () => {
      // This will initially fail because isLocalHostname is not exported
      const { isLocalHostname } = await import('../lib/auth');
      expect(typeof isLocalHostname).toBe('function');
    });

    it('should be able to import isValidProductionHostname from auth.ts', async () => {
      // This will initially fail because isValidProductionHostname is not exported
      const { isValidProductionHostname } = await import('../lib/auth');
      expect(typeof isValidProductionHostname).toBe('function');
    });

    it('should be able to import validateNextAuthUrl from auth.ts', async () => {
      // This will initially fail because validateNextAuthUrl is not exported
      const { validateNextAuthUrl } = await import('../lib/auth');
      expect(typeof validateNextAuthUrl).toBe('function');
    });
  });

  describe('Function behavior consistency verification', () => {
    // Store original env for restoration
    let originalEnv: NodeJS.ProcessEnv;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      originalEnv = { ...process.env };
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      process.env = originalEnv;
      consoleWarnSpy.mockRestore();
    });

    it('imported isLocalHostname should identify local hostnames correctly', async () => {
      const { isLocalHostname } = await import('../lib/auth');

      // Test local hostnames
      expect(isLocalHostname('localhost')).toBe(true);
      expect(isLocalHostname('0.0.0.0')).toBe(true);
      expect(isLocalHostname('127.0.0.1')).toBe(true);
      expect(isLocalHostname('192.168.1.1')).toBe(true);
      expect(isLocalHostname('10.0.0.1')).toBe(true);
      expect(isLocalHostname('172.16.0.1')).toBe(true);

      // Test non-local hostnames
      expect(isLocalHostname('dnd-tracker-next-js.fly.dev')).toBe(false);
      expect(isLocalHostname('example.com')).toBe(false);
    });

    it('imported isValidProductionHostname should validate production hostnames correctly', async () => {
      const { isValidProductionHostname } = await import('../lib/auth');

      process.env.NODE_ENV = 'production';

      // Should reject local hostnames in production
      expect(isValidProductionHostname('0.0.0.0')).toBe(false);
      expect(isValidProductionHostname('localhost')).toBe(false);
      expect(isValidProductionHostname('127.0.0.1')).toBe(false);

      // Should accept valid production hostname
      expect(isValidProductionHostname('dnd-tracker-next-js.fly.dev')).toBe(
        true
      );
      expect(isValidProductionHostname('example.com')).toBe(true);
    });

    it('imported isValidProductionHostname should allow all hostnames in development', async () => {
      const { isValidProductionHostname } = await import('../lib/auth');

      process.env.NODE_ENV = 'development';

      // Should accept all hostnames in development
      expect(isValidProductionHostname('0.0.0.0')).toBe(true);
      expect(isValidProductionHostname('localhost')).toBe(true);
      expect(isValidProductionHostname('dnd-tracker-next-js.fly.dev')).toBe(
        true
      );
    });

    it('imported validateNextAuthUrl should validate URLs correctly', async () => {
      const { validateNextAuthUrl } = await import('../lib/auth');

      process.env.NODE_ENV = 'production';

      // Test with invalid production URL
      process.env.NEXTAUTH_URL = 'http://0.0.0.0:3000';
      const invalidResult = validateNextAuthUrl();
      expect(invalidResult).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Invalid NEXTAUTH_URL for production: http://0.0.0.0:3000'
        )
      );

      consoleWarnSpy.mockClear();

      // Test with valid production URL
      process.env.NEXTAUTH_URL = 'https://dnd-tracker-next-js.fly.dev';
      const validResult = validateNextAuthUrl();
      expect(validResult).toBe('https://dnd-tracker-next-js.fly.dev');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Code duplication detection', () => {
    it('should verify that auth-production-redirect-issue-494.test.ts uses imported functions', async () => {
      // Read the test file content to check for duplication
      const fs = require('fs');
      const path = require('path');
      const testFilePath = path.join(
        process.cwd(),
        'src/__tests__/auth-production-redirect-issue-494.test.ts'
      );
      const testFileContent = fs.readFileSync(testFilePath, 'utf8');

      // After refactoring, these function implementations should NOT exist in the test file
      expect(testFileContent).not.toContain('const testValidationHelpers = {');
      expect(testFileContent).not.toContain(
        'isLocalHostname: (hostname: string): boolean =>'
      );
      expect(testFileContent).not.toContain(
        'isValidProductionHostname: (hostname: string): boolean =>'
      );
      expect(testFileContent).not.toContain(
        'validateNextAuthUrl: (url?: string): string | undefined =>'
      );

      // After refactoring, it SHOULD contain imports from auth.ts
      expect(testFileContent).toContain("from '../lib/auth'");
    });
  });
});
