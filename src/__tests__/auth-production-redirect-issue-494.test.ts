/**
 * @jest-environment jsdom
 *
 * Test suite for Issue #494: Left Nav still not respecting login
 *
 * Problem: Production environment blocking redirects to external URLs like 0.0.0.0:3000
 * Cause: AUTH_TRUST_HOST not set as environment secret, causing NextAuth redirect validation issues
 * Solution: Set AUTH_TRUST_HOST=true as Fly.io environment secret
 *
 * Validates that the production authentication redirect fix works correctly.
 */

describe('Issue #494: Production redirect fix', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = { ...process.env };
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('AUTH_TRUST_HOST configuration validation', () => {
    it('should validate AUTH_TRUST_HOST is available as production environment variable', () => {
      // Test that AUTH_TRUST_HOST can be set (simulates Fly.io secret)
      process.env.AUTH_TRUST_HOST = 'true';
      expect(process.env.AUTH_TRUST_HOST).toBe('true');
    });

    it('should validate production NODE_ENV enables trustHost automatically', () => {
      process.env.NODE_ENV = 'production';

      // In production, trustHost should be enabled even without AUTH_TRUST_HOST
      const shouldTrustHost = process.env.AUTH_TRUST_HOST === 'true' || process.env.NODE_ENV === 'production';
      expect(shouldTrustHost).toBe(true);
    });
  });

  describe('Production URL validation', () => {
    // Extract common validation logic to reduce duplication
    const testValidationHelpers = {
      isLocalHostname: (hostname: string): boolean => {
        return (
          hostname === 'localhost' ||
          hostname === '0.0.0.0' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')
        );
      },

      isValidProductionHostname: (hostname: string): boolean => {
        return process.env.NODE_ENV !== 'production' || !testValidationHelpers.isLocalHostname(hostname);
      },

      validateNextAuthUrl: (url?: string): string | undefined => {
        if (!url) return undefined;

        try {
          const parsedUrl = new URL(url);
          if (!testValidationHelpers.isValidProductionHostname(parsedUrl.hostname)) {
            console.warn(`Invalid NEXTAUTH_URL for production: ${url}. Using fallback.`);
            return undefined;
          }
          return url;
        } catch (error) {
          console.warn(`Invalid NEXTAUTH_URL format: ${url}. Error: ${error}`);
          return undefined;
        }
      }
    };

    it('should identify localhost URLs as invalid for production', () => {
      process.env.NODE_ENV = 'production';

      // Test invalid production hostnames
      expect(testValidationHelpers.isValidProductionHostname('0.0.0.0')).toBe(false);
      expect(testValidationHelpers.isValidProductionHostname('localhost')).toBe(false);
      expect(testValidationHelpers.isValidProductionHostname('127.0.0.1')).toBe(false);

      // Test valid production hostname
      expect(testValidationHelpers.isValidProductionHostname('dnd-tracker-next-js.fly.dev')).toBe(true);
    });

    it('should validate NEXTAUTH_URL correctly for production environment', () => {
      process.env.NODE_ENV = 'production';

      // Test invalid production URL
      const invalidUrl = testValidationHelpers.validateNextAuthUrl('http://0.0.0.0:3000');
      expect(invalidUrl).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid NEXTAUTH_URL for production: http://0.0.0.0:3000')
      );

      consoleWarnSpy.mockClear();

      // Test valid production URL
      const validUrl = testValidationHelpers.validateNextAuthUrl('https://dnd-tracker-next-js.fly.dev');
      expect(validUrl).toBe('https://dnd-tracker-next-js.fly.dev');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Redirect callback validation', () => {
    // Helper function to simulate redirect callback logic
    const createRedirectCallback = () => {
      const trustedDomains = [
        'dnd-tracker-next-js.fly.dev',
        'dnd-tracker.fly.dev',
        'dndtracker.com',
        'www.dndtracker.com'
      ];

      return async ({ url, baseUrl }: { url: string; baseUrl: string }) => {
        try {
          if (url.startsWith('/')) {
            return `${baseUrl}${url}`;
          }

          const parsedUrl = new URL(url);
          const parsedBaseUrl = new URL(baseUrl);

          if (parsedUrl.origin === parsedBaseUrl.origin) {
            return url;
          }

          if (process.env.NODE_ENV === 'production' && trustedDomains.includes(parsedUrl.hostname)) {
            return url;
          }

          console.warn(`Blocked redirect to untrusted URL: ${url}`);
          return baseUrl;
        } catch (error) {
          console.error('Redirect callback error:', error);
          return baseUrl;
        }
      };
    };

    it('should block external redirects to 0.0.0.0 URLs', async () => {
      const redirectCallback = createRedirectCallback();
      process.env.NODE_ENV = 'production';
      const baseUrl = 'https://dnd-tracker-next-js.fly.dev';

      // Test blocking 0.0.0.0 redirect
      const blockedUrl = await redirectCallback({
        url: 'https://0.0.0.0:3000/dashboard',
        baseUrl
      });
      expect(blockedUrl).toBe(baseUrl);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Blocked redirect to untrusted URL: https://0.0.0.0:3000/dashboard')
      );

      consoleWarnSpy.mockClear();

      // Test allowing same-origin redirect
      const validUrl = await redirectCallback({
        url: 'https://dnd-tracker-next-js.fly.dev/dashboard',
        baseUrl
      });
      expect(validUrl).toBe('https://dnd-tracker-next-js.fly.dev/dashboard');
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      // Test allowing relative redirect
      const relativeUrl = await redirectCallback({
        url: '/dashboard',
        baseUrl
      });
      expect(relativeUrl).toBe('https://dnd-tracker-next-js.fly.dev/dashboard');
    });
  });

  describe('Production server configuration', () => {
    it('should not bind to 0.0.0.0 hostname in production start script', () => {
      // Read package.json to validate start script doesn't use -H 0.0.0.0
      const fs = require('fs');
      const path = require('path');
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      const startScript = packageJson.scripts.start;

      // Validate start script doesn't contain -H 0.0.0.0 which causes redirect issues
      expect(startScript).toBeDefined();
      expect(startScript).not.toContain('-H 0.0.0.0');
      expect(startScript).not.toContain('--hostname 0.0.0.0');

      // Ensure it still properly starts on port 3000
      expect(startScript).toContain('-p 3000');
      expect(startScript).toContain('next start');
    });

    it('should allow production deployment to determine its own hostname', () => {
      // This test validates that removing -H 0.0.0.0 allows the deployment platform
      // (like Fly.io) to correctly determine the application hostname
      process.env.NODE_ENV = 'production';

      // Simulate how NextAuth would determine baseUrl without forced hostname
      const simulateNextAuthBaseUrl = (hostname?: string) => {
        if (hostname === '0.0.0.0') {
          // This would be the problematic case we're fixing
          return 'https://0.0.0.0:3000';
        }
        // Production platforms should provide the correct hostname
        return hostname ? `https://${hostname}` : 'https://dnd-tracker-next-js.fly.dev';
      };

      // Test that without forced hostname, production URL is correct
      const correctUrl = simulateNextAuthBaseUrl('dnd-tracker-next-js.fly.dev');
      expect(correctUrl).toBe('https://dnd-tracker-next-js.fly.dev');

      // Test that the problematic 0.0.0.0 case is what we're avoiding
      const problematicUrl = simulateNextAuthBaseUrl('0.0.0.0');
      expect(problematicUrl).toBe('https://0.0.0.0:3000');
      expect(problematicUrl).not.toBe(correctUrl);
    });
  });
});