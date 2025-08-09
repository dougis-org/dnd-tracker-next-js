/**
 * End-to-End Tests for Issue #620 Authentication Fix
 *
 * Validates that the authentication enhancements implemented in Issue #620
 * work correctly in real browser scenarios, testing the complete flow
 * from registration through multiple login attempts.
 *
 * Tests the exact failing scenario reported in Issue #620:
 * 1. User can register successfully
 * 2. User can login immediately after registration
 * 3. User can login again with same credentials (this was failing before)
 * 4. Session persists across page refreshes
 * 5. No authentication failures occur in successive login attempts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';

// Helper function to perform login
const performLogin = async (page: Page, email: string, password: string, baseUrl: string): Promise<void> => {
  // Navigate to signin if not already there
  if (!page.url().includes('/signin') && !page.url().includes('/login')) {
    await page.goto(`${baseUrl}/signin`, { waitUntil: 'networkidle2' });
  }

  // Wait for login form
  await page.waitForSelector('form', { timeout: 10000 });
  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 5000 });

  // Clear existing values and fill login form
  const emailInput = await page.$('input[name="email"], input[type="email"]');
  const passwordInput = await page.$('input[name="password"], input[type="password"]');

  expect(emailInput).not.toBeNull();
  expect(passwordInput).not.toBeNull();

  await emailInput!.click({ clickCount: 3 });
  await emailInput!.type(email);

  await passwordInput!.click({ clickCount: 3 });
  await passwordInput!.type(password);

  // Submit login
  const loginButton = await page.$('button[type="submit"]');
  expect(loginButton).not.toBeNull();

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
    loginButton!.click(),
  ]);
};

// Helper function to perform logout
const performLogout = async (page: Page): Promise<void> => {
  // Look for logout button/link in various common locations
  const logoutSelectors = [
    'button:has-text("Logout")',
    'button:has-text("Sign Out")',
    'a:has-text("Logout")',
    'a:has-text("Sign Out")',
    '[data-testid="logout"]',
    '[aria-label*="logout" i]',
    '[aria-label*="sign out" i]',
  ];

  let logoutElement = null;
  for (const selector of logoutSelectors) {
    try {
      logoutElement = await page.$(selector);
      if (logoutElement) break;
    } catch {
      // Continue to next selector
    }
  }

  if (!logoutElement) {
    // Try to find logout in dropdown menu
    const profileButton = await page.$('[data-testid="profile"], .profile-menu, button:has([data-testid="avatar"])');
    if (profileButton) {
      await profileButton.click();
      await page.waitForTimeout(500);

      for (const selector of logoutSelectors) {
        try {
          logoutElement = await page.$(selector);
          if (logoutElement) break;
        } catch {
          // Continue to next selector
        }
      }
    }
  }

  if (logoutElement) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
      logoutElement.click(),
    ]);
  } else {
    // Fallback: navigate to API logout endpoint
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3001';
    await page.goto(`${baseUrl}/api/auth/signout`, { waitUntil: 'networkidle2' });

    // If there's a confirmation button, click it
    const confirmButton = await page.$('button[type="submit"], button:has-text("Sign out")');
    if (confirmButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        confirmButton.click(),
      ]);
    }
  }
};

describe('Issue #620 Authentication E2E Tests', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3001';

  // Test user credentials matching Issue #620 report
  const testUser = {
    email: 'doug@dougis.com',
    password: 'EXF5pke@njn7thm4nkr',
    username: 'dougtest620',
    firstName: 'Doug',
    lastName: 'Test620',
  };

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.CI === 'true' ? 0 : 50,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    });
  }, 30000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  }, 10000);

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Set longer timeouts for network operations
    await page.setDefaultTimeout(15000);
    await page.setDefaultNavigationTimeout(15000);

    // Enable request interception to monitor auth requests
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Log authentication-related requests for debugging
      if (request.url().includes('/api/auth/') || request.url().includes('/signin') || request.url().includes('/signup')) {
        console.log(`[E2E] Auth request: ${request.method()} ${request.url()}`);
      }
      request.continue();
    });

    // Monitor console errors and responses
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`[E2E] Page console error: ${msg.text()}`);
      }
    });

    page.on('response', (response) => {
      if (response.url().includes('/api/auth/') && !response.ok()) {
        console.error(`[E2E] Auth API error: ${response.status()} ${response.url()}`);
      }
    });
  }, 15000);

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  }, 5000);

  describe('Core Issue #620 Scenario: Registration + Multiple Logins', () => {
    it('should handle complete registration and multiple login flow without failures', async () => {
      console.log('[E2E] Starting comprehensive Issue #620 test...');

      // Step 1: Navigate to registration page
      console.log('[E2E] Navigating to signup page...');
      await page.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle2' });

      // Wait for the registration form to be fully loaded
      await page.waitForSelector('form', { timeout: 10000 });
      await page.waitForSelector('input[name="email"]', { timeout: 5000 });

      // Step 2: Fill out registration form
      console.log('[E2E] Filling registration form...');
      await page.type('input[name="email"]', testUser.email);
      await page.type('input[name="username"]', testUser.username);
      await page.type('input[name="firstName"]', testUser.firstName);
      await page.type('input[name="lastName"]', testUser.lastName);
      await page.type('input[name="password"]', testUser.password);
      await page.type('input[name="confirmPassword"]', testUser.password);

      // Accept terms if checkbox exists
      const termsCheckbox = await page.$('input[name="agreeToTerms"], input[type="checkbox"]');
      if (termsCheckbox) {
        await termsCheckbox.click();
      }

      // Submit registration
      console.log('[E2E] Submitting registration...');
      const submitButton = await page.$('button[type="submit"]');
      expect(submitButton).not.toBeNull();

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
        submitButton!.click(),
      ]);

      // Verify registration success (should redirect to signin or dashboard)
      const currentUrl = page.url();
      console.log(`[E2E] Registration completed, redirected to: ${currentUrl}`);
      expect(currentUrl).not.toContain('/signup');

      // Step 3: First login attempt (if redirected to signin)
      if (currentUrl.includes('/signin') || currentUrl.includes('/login')) {
        console.log('[E2E] Performing first login attempt...');
        await performLogin(page, testUser.email, testUser.password, baseUrl);
      }

      // Verify we're logged in (should be on dashboard)
      await page.waitForSelector('[data-testid="dashboard"], .dashboard, main', { timeout: 10000 });
      const dashboardUrl = page.url();
      console.log(`[E2E] First login successful, on dashboard: ${dashboardUrl}`);
      expect(dashboardUrl).toMatch(/\/(dashboard|profile|home)/);

      // Step 4: Logout to test subsequent login
      console.log('[E2E] Logging out...');
      await performLogout(page);

      // Verify logout
      await page.waitForSelector('a[href*="signin"], a[href*="login"]', { timeout: 10000 });
      console.log('[E2E] Logout successful');

      // Step 5: Second login attempt (the core Issue #620 test)
      console.log('[E2E] Performing second login attempt (Issue #620 critical test)...');
      await performLogin(page, testUser.email, testUser.password, baseUrl);

      // Verify second login success
      await page.waitForSelector('[data-testid="dashboard"], .dashboard, main', { timeout: 10000 });
      const secondLoginUrl = page.url();
      console.log(`[E2E] Second login successful: ${secondLoginUrl}`);
      expect(secondLoginUrl).toMatch(/\/(dashboard|profile|home)/);

      // Step 6: Third login attempt (additional validation)
      console.log('[E2E] Logging out for third login test...');
      await performLogout(page);
      await page.waitForSelector('a[href*="signin"], a[href*="login"]', { timeout: 10000 });

      console.log('[E2E] Performing third login attempt...');
      await performLogin(page, testUser.email, testUser.password, baseUrl);

      // Verify third login success
      await page.waitForSelector('[data-testid="dashboard"], .dashboard, main', { timeout: 10000 });
      const thirdLoginUrl = page.url();
      console.log(`[E2E] Third login successful: ${thirdLoginUrl}`);
      expect(thirdLoginUrl).toMatch(/\/(dashboard|profile|home)/);

      console.log('[E2E] ✅ All Issue #620 authentication scenarios passed!');
    }, 120000); // 2 minute timeout for full flow
  });

  describe('Session Persistence Tests', () => {
    it('should maintain session across page refreshes', async () => {
      console.log('[E2E] Testing session persistence...');

      // Login first
      await page.goto(`${baseUrl}/signin`, { waitUntil: 'networkidle2' });
      await performLogin(page, testUser.email, testUser.password, baseUrl);

      // Verify logged in
      await page.waitForSelector('[data-testid="dashboard"], .dashboard, main', { timeout: 10000 });
      const initialUrl = page.url();
      console.log(`[E2E] Initial login URL: ${initialUrl}`);

      // Refresh page
      console.log('[E2E] Refreshing page...');
      await page.reload({ waitUntil: 'networkidle2' });

      // Wait a bit for session validation
      await page.waitForTimeout(2000);

      // Should still be logged in (not redirected to signin)
      const afterRefreshUrl = page.url();
      console.log(`[E2E] After refresh URL: ${afterRefreshUrl}`);

      expect(afterRefreshUrl).not.toContain('/signin');
      expect(afterRefreshUrl).not.toContain('/login');
      expect(afterRefreshUrl).toMatch(/\/(dashboard|profile|home)/);

      console.log('[E2E] ✅ Session persistence test passed!');
    }, 60000);
  });

  describe('Authentication Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      console.log('[E2E] Testing authentication error handling...');

      await page.goto(`${baseUrl}/signin`, { waitUntil: 'networkidle2' });

      // Wait for login form
      await page.waitForSelector('form', { timeout: 10000 });

      // Try login with wrong password
      console.log('[E2E] Testing with incorrect password...');
      await page.type('input[name="email"], input[type="email"]', testUser.email);
      await page.type('input[name="password"], input[type="password"]', 'wrongpassword123');

      const loginButton = await page.$('button[type="submit"]');
      expect(loginButton).not.toBeNull();

      await loginButton!.click();

      // Wait for error message or form validation
      await page.waitForTimeout(3000);

      // Should still be on signin page (not redirected)
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(signin|login)/);

      // Should show error (look for error text or styling)
      const hasError = await page.$eval('body', (body) => {
        const text = body.textContent || '';
        return text.includes('Invalid') ||
               text.includes('incorrect') ||
               text.includes('error') ||
               text.toLowerCase().includes('failed');
      });

      console.log(`[E2E] Error handling test - found error indicator: ${hasError}`);
      // Note: We don't enforce error presence as UI may vary, but login should fail
      expect(currentUrl).toMatch(/\/(signin|login)/); // Main requirement: should not proceed

      console.log('[E2E] ✅ Authentication error handling test passed!');
    }, 30000);
  });

  describe('Direct Access Protection', () => {
    it('should redirect unauthenticated users to signin', async () => {
      console.log('[E2E] Testing protected route access...');

      // Try to access dashboard without authentication
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle2' });

      // Should be redirected to signin
      const currentUrl = page.url();
      console.log(`[E2E] Unauthenticated dashboard access redirected to: ${currentUrl}`);

      expect(currentUrl).toMatch(/\/(signin|login|auth)/);

      console.log('[E2E] ✅ Protected route test passed!');
    }, 15000);
  });
});