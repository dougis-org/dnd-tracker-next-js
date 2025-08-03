#!/usr/bin/env node

/**
 * Production Authentication Testing Script
 * Tests authentication flow in production environment
 * 
 * Usage: node scripts/test-production-auth.js
 * 
 * This script validates:
 * - User login flow in production
 * - Session persistence across navigation
 * - Logout functionality
 * - Protected route access
 */

const puppeteer = require('puppeteer');
const { URL } = require('url');

// Configuration
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://dnd-tracker-next-js.fly.dev';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
const TIMEOUT = 30000; // 30 seconds

class ProductionAuthTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      loginFlow: { success: false, error: null, duration: 0 },
      sessionPersistence: { success: false, error: null, duration: 0 },
      logoutFlow: { success: false, error: null, duration: 0 },
      protectedRoutes: { success: false, error: null, duration: 0, results: [] }
    };
  }

  async initialize() {
    console.log('🚀 Initializing Production Authentication Tests...');
    console.log(`📍 Testing URL: ${PRODUCTION_URL}`);
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });
    
    this.page = await this.browser.newPage();
    
    // Set user agent and timeout
    await this.page.setUserAgent('Mozilla/5.0 (compatible; ProductionAuthTester/1.0)');
    this.page.setDefaultTimeout(TIMEOUT);
    
    // Enable console logging from the page
    this.page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        console.log(`🔍 [Browser ${msg.type().toUpperCase()}]:`, msg.text());
      }
    });
    
    // Log network errors
    this.page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`❌ [Network Error]: ${response.status()} ${response.url()}`);
      }
    });
  }

  async testLoginFlow() {
    console.log('\n📝 Testing Login Flow...');
    const startTime = Date.now();
    
    try {
      // Navigate to signin page
      await this.page.goto(`${PRODUCTION_URL}/signin`, { waitUntil: 'networkidle2' });
      
      // Wait for form elements
      await this.page.waitForSelector('input[name="email"]', { timeout: 10000 });
      await this.page.waitForSelector('input[name="password"]', { timeout: 10000 });
      await this.page.waitForSelector('button[type="submit"]', { timeout: 10000 });
      
      // Fill in credentials
      await this.page.type('input[name="email"]', TEST_USER_EMAIL);
      await this.page.type('input[name="password"]', TEST_USER_PASSWORD);
      
      // Submit form and wait for response
      await this.page.click('button[type="submit"]');
      
      // Wait for either navigation or error message
      try {
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      } catch (navError) {
        // Check if we're still on signin page with an error
        const currentUrl = this.page.url();
        if (currentUrl.includes('/signin')) {
          // Look for error messages on the page
          const errorMessage = await this.page.$eval('[role="alert"], .alert-destructive', el => el.textContent.trim()).catch(() => null);
          if (errorMessage) {
            throw new Error(`Authentication failed: ${errorMessage}`);
          }
        }
        throw navError;
      }
      
      // Verify successful login (should redirect to dashboard or protected page)
      const currentUrl = this.page.url();
      const isLoggedIn = !currentUrl.includes('/signin') && !currentUrl.includes('/error');
      
      if (isLoggedIn) {
        // Check for session indicators
        const hasUserSession = await this.page.evaluate(() => {
          // Check for user data in DOM or localStorage indicators
          return document.querySelector('[data-testid="user-menu"]') !== null ||
                 document.querySelector('[data-user-authenticated="true"]') !== null ||
                 localStorage.getItem('user') !== null;
        });
        
        this.results.loginFlow = {
          success: true,
          error: null,
          duration: Date.now() - startTime,
          details: {
            redirectUrl: currentUrl,
            hasUserSession
          }
        };
        console.log('✅ Login flow successful');
        console.log(`   📍 Redirected to: ${currentUrl}`);
        console.log(`   🕐 Duration: ${this.results.loginFlow.duration}ms`);
      } else {
        throw new Error(`Login failed - still on signin page or error page: ${currentUrl}`);
      }
      
    } catch (error) {
      this.results.loginFlow = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      console.log('❌ Login flow failed:', error.message);
    }
  }

  async testSessionPersistence() {
    console.log('\n🔄 Testing Session Persistence...');
    const startTime = Date.now();
    
    try {
      if (!this.results.loginFlow.success) {
        throw new Error('Cannot test session persistence - login failed');
      }
      
      // Navigate to different pages and verify session persists
      const testPages = [
        '/dashboard',
        '/parties',
        '/encounters',
        '/characters'
      ];
      
      let persistenceResults = [];
      
      for (const testPage of testPages) {
        try {
          await this.page.goto(`${PRODUCTION_URL}${testPage}`, { waitUntil: 'networkidle2' });
          
          const currentUrl = this.page.url();
          const isAuthenticated = !currentUrl.includes('/signin') && !currentUrl.includes('/error');
          
          // Wait a moment for any async session checks
          await this.page.waitForTimeout(1000);
          
          // Check for authentication indicators
          const hasAuthIndicators = await this.page.evaluate(() => {
            return document.querySelector('[data-testid="user-menu"]') !== null ||
                   document.querySelector('[data-user-authenticated="true"]') !== null ||
                   !document.querySelector('[data-testid="login-form"]');
          });
          
          persistenceResults.push({
            page: testPage,
            success: isAuthenticated && hasAuthIndicators,
            url: currentUrl
          });
          
          console.log(`   ${isAuthenticated && hasAuthIndicators ? '✅' : '❌'} ${testPage}: ${currentUrl}`);
          
        } catch (pageError) {
          persistenceResults.push({
            page: testPage,
            success: false,
            error: pageError.message
          });
          console.log(`   ❌ ${testPage}: ${pageError.message}`);
        }
      }
      
      const successfulPages = persistenceResults.filter(r => r.success).length;
      const allSuccessful = successfulPages === testPages.length;
      
      this.results.sessionPersistence = {
        success: allSuccessful,
        error: allSuccessful ? null : `Only ${successfulPages}/${testPages.length} pages maintained session`,
        duration: Date.now() - startTime,
        details: persistenceResults
      };
      
      console.log(`${allSuccessful ? '✅' : '❌'} Session persistence: ${successfulPages}/${testPages.length} pages successful`);
      
    } catch (error) {
      this.results.sessionPersistence = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      console.log('❌ Session persistence test failed:', error.message);
    }
  }

  async testLogoutFlow() {
    console.log('\n🚪 Testing Logout Flow...');
    const startTime = Date.now();
    
    try {
      if (!this.results.loginFlow.success) {
        throw new Error('Cannot test logout - login failed');
      }
      
      // Go to a page where logout should be available
      await this.page.goto(`${PRODUCTION_URL}/dashboard`, { waitUntil: 'networkidle2' });
      
      // Look for logout button/link
      const logoutSelectors = [
        'button[data-testid="logout-button"]',
        'a[href="/api/auth/signout"]',
        'button:contains("Sign Out")',
        'button:contains("Logout")',
        '[data-testid="user-menu"] button'
      ];
      
      let logoutElement = null;
      for (const selector of logoutSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          logoutElement = selector;
          break;
        } catch (e) {
          // Try next selector
        }
      }
      
      if (!logoutElement) {
        // Try clicking on user menu first
        try {
          await this.page.click('[data-testid="user-menu"]');
          await this.page.waitForTimeout(500);
          
          // Try logout selectors again
          for (const selector of logoutSelectors) {
            try {
              await this.page.waitForSelector(selector, { timeout: 2000 });
              logoutElement = selector;
              break;
            } catch (e) {
              // Try next selector
            }
          }
        } catch (e) {
          // User menu click failed
        }
      }
      
      if (!logoutElement) {
        // Navigate directly to logout endpoint
        await this.page.goto(`${PRODUCTION_URL}/api/auth/signout`, { waitUntil: 'networkidle2' });
      } else {
        // Click logout button
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
          this.page.click(logoutElement)
        ]);
      }
      
      // Verify logout was successful
      const currentUrl = this.page.url();
      const isLoggedOut = currentUrl.includes('/signin') || 
                         currentUrl.includes('/') && !currentUrl.includes('/dashboard');
      
      // Try to access a protected route to verify logout
      await this.page.goto(`${PRODUCTION_URL}/dashboard`, { waitUntil: 'networkidle2' });
      const protectedUrl = this.page.url();
      const redirectedToLogin = protectedUrl.includes('/signin') || protectedUrl.includes('/error');
      
      this.results.logoutFlow = {
        success: isLoggedOut && redirectedToLogin,
        error: null,
        duration: Date.now() - startTime,
        details: {
          logoutUrl: currentUrl,
          protectedRouteUrl: protectedUrl,
          redirectedToLogin
        }
      };
      
      console.log(`${this.results.logoutFlow.success ? '✅' : '❌'} Logout flow`);
      console.log(`   📍 After logout: ${currentUrl}`);
      console.log(`   📍 Protected route test: ${protectedUrl}`);
      
    } catch (error) {
      this.results.logoutFlow = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      console.log('❌ Logout flow failed:', error.message);
    }
  }

  async testProtectedRoutes() {
    console.log('\n🔒 Testing Protected Route Access...');
    const startTime = Date.now();
    
    try {
      // Test without authentication first
      const protectedRoutes = [
        '/dashboard',
        '/parties',
        '/encounters',
        '/characters',
        '/api/parties',
        '/api/encounters',
        '/api/characters'
      ];
      
      let routeResults = [];
      
      for (const route of protectedRoutes) {
        try {
          const response = await this.page.goto(`${PRODUCTION_URL}${route}`, { 
            waitUntil: 'networkidle2',
            timeout: 10000 
          });
          
          const finalUrl = this.page.url();
          const status = response.status();
          
          // For API routes, check status code
          if (route.startsWith('/api/')) {
            const isProtected = status === 401 || status === 403;
            routeResults.push({
              route,
              protected: isProtected,
              status,
              finalUrl
            });
            console.log(`   ${isProtected ? '✅' : '❌'} ${route}: Status ${status}`);
          } else {
            // For page routes, check if redirected to signin
            const isProtected = finalUrl.includes('/signin') || status === 401 || status === 403;
            routeResults.push({
              route,
              protected: isProtected,
              status,
              finalUrl
            });
            console.log(`   ${isProtected ? '✅' : '❌'} ${route}: ${finalUrl} (${status})`);
          }
          
        } catch (error) {
          routeResults.push({
            route,
            protected: false,
            error: error.message
          });
          console.log(`   ❌ ${route}: Error - ${error.message}`);
        }
      }
      
      const protectedCount = routeResults.filter(r => r.protected).length;
      const allProtected = protectedCount === protectedRoutes.length;
      
      this.results.protectedRoutes = {
        success: allProtected,
        error: allProtected ? null : `Only ${protectedCount}/${protectedRoutes.length} routes properly protected`,
        duration: Date.now() - startTime,
        results: routeResults
      };
      
      console.log(`${allProtected ? '✅' : '❌'} Protected routes: ${protectedCount}/${protectedRoutes.length} properly protected`);
      
    } catch (error) {
      this.results.protectedRoutes = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      console.log('❌ Protected routes test failed:', error.message);
    }
  }

  async generateReport() {
    console.log('\n📊 Production Authentication Test Report');
    console.log('=' .repeat(50));
    
    const totalTests = Object.keys(this.results).length;
    const passedTests = Object.values(this.results).filter(r => r.success).length;
    const overallSuccess = passedTests === totalTests;
    
    console.log(`Overall Status: ${overallSuccess ? '✅ PASS' : '❌ FAIL'} (${passedTests}/${totalTests})`);
    console.log(`Production URL: ${PRODUCTION_URL}`);
    console.log(`Test Date: ${new Date().toISOString()}`);
    
    console.log('\nDetailed Results:');
    console.log('-'.repeat(30));
    
    Object.entries(this.results).forEach(([testName, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = `${result.duration}ms`;
      
      console.log(`${testName}: ${status} (${duration})`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`  Details:`, JSON.stringify(result.details, null, 2));
      }
    });
    
    // Return results for potential CI integration
    return {
      success: overallSuccess,
      results: this.results,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests
      }
    };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runAllTests() {
    try {
      await this.initialize();
      
      // Run tests in sequence
      await this.testProtectedRoutes(); // Test without auth first
      await this.testLoginFlow();
      await this.testSessionPersistence();
      await this.testLogoutFlow();
      
      // Generate and return report
      const report = await this.generateReport();
      
      return report;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return {
        success: false,
        error: error.message,
        results: this.results
      };
    } finally {
      await this.cleanup();
    }
  }
}

// CLI execution
async function main() {
  console.log('🧪 Production Authentication Test Suite');
  console.log('Testing:', PRODUCTION_URL);
  
  if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
    console.warn('⚠️  Warning: TEST_USER_EMAIL and TEST_USER_PASSWORD not set');
    console.warn('   Some tests may fail without valid test credentials');
  }
  
  const tester = new ProductionAuthTester();
  const report = await tester.runAllTests();
  
  // Exit with error code if tests failed
  process.exit(report.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProductionAuthTester;