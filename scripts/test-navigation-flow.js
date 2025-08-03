#!/usr/bin/env node

/**
 * Enhanced Navigation Flow Test Script
 * Tests the complete user journey: register -> login -> navigate between protected pages
 * Specifically designed to reproduce the client-side exception issue
 */

const { chromium } = require('playwright');

// Configuration
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://dnd-tracker-next-js.fly.dev';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'nav-test-' + Date.now() + '@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
const HEADLESS = process.env.HEADLESS !== 'false';

class NavigationFlowTester {
  constructor() {
    this.baseUrl = PRODUCTION_URL;
    this.browser = null;
    this.page = null;
    this.results = {
      registration: { success: false, details: null },
      login: { success: false, details: null },
      firstNavigation: { success: false, details: null },
      secondNavigation: { success: false, details: null },
      thirdNavigation: { success: false, details: null },
      errorDetails: []
    };
  }

  async initialize() {
    console.log('🚀 Enhanced Navigation Flow Test');
    console.log('=' .repeat(50));
    console.log(`📍 Testing URL: ${this.baseUrl}`);
    console.log(`📧 Test Email: ${TEST_USER_EMAIL}`);
    console.log(`🔧 Headless Mode: ${HEADLESS}`);
    console.log('');

    this.browser = await chromium.launch({ 
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Enhanced error tracking
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      console.log(`🔍 [Browser ${type.toUpperCase()}]: ${text}`);
      
      if (type === 'error' || type === 'warn') {
        this.results.errorDetails.push({
          type,
          message: text,
          timestamp: new Date().toISOString(),
          url: this.page.url()
        });
      }
    });
    
    this.page.on('pageerror', (error) => {
      console.log(`❌ [Page Error]: ${error.message}`);
      this.results.errorDetails.push({
        type: 'pageerror',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: this.page.url()
      });
    });
    
    this.page.on('requestfailed', (request) => {
      console.log(`❌ [Network Error]: ${request.failure().errorText} ${request.url()}`);
      this.results.errorDetails.push({
        type: 'requestfailed',
        message: `${request.failure().errorText} - ${request.url()}`,
        timestamp: new Date().toISOString(),
        url: this.page.url()
      });
    });
  }

  async testRegistration() {
    console.log('📝 Testing User Registration...');
    const startTime = Date.now();
    
    try {
      await this.page.goto(`${this.baseUrl}/signup`);
      await this.page.waitForLoadState('networkidle');
      
      // Fill registration form
      await this.page.fill('input[name="firstName"]', 'Navigation');
      await this.page.fill('input[name="lastName"]', 'Test');
      await this.page.fill('input[name="email"]', TEST_USER_EMAIL);
      await this.page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await this.page.fill('input[name="confirmPassword"]', TEST_USER_PASSWORD);
      await this.page.fill('input[name="username"]', 'navtest' + Date.now().toString().slice(-6));
      await this.page.check('input[name="agreeToTerms"]');
      
      // Submit registration
      await this.page.click('button[type="submit"]');
      await this.page.waitForLoadState('networkidle');
      
      const currentUrl = this.page.url();
      const duration = Date.now() - startTime;
      
      if (currentUrl.includes('/signin') || currentUrl.includes('/dashboard')) {
        this.results.registration = {
          success: true,
          details: { redirectUrl: currentUrl, duration }
        };
        console.log(`   ✅ Registration successful (${duration}ms)`);
        console.log(`   📍 Redirected to: ${currentUrl}`);
      } else {
        this.results.registration = {
          success: false,
          details: { error: 'Unexpected redirect URL', currentUrl, duration }
        };
        console.log(`   ❌ Registration failed - unexpected redirect: ${currentUrl}`);
      }
    } catch (error) {
      this.results.registration = {
        success: false,
        details: { error: error.message, duration: Date.now() - startTime }
      };
      console.log(`   ❌ Registration error: ${error.message}`);
    }
  }

  async testLogin() {
    console.log('🔐 Testing Login Flow...');
    const startTime = Date.now();
    
    try {
      // Navigate to signin if not already there
      if (!this.page.url().includes('/signin')) {
        await this.page.goto(`${this.baseUrl}/signin`);
        await this.page.waitForLoadState('networkidle');
      }
      
      // Fill login form
      await this.page.fill('input[name="email"]', TEST_USER_EMAIL);
      await this.page.fill('input[name="password"]', TEST_USER_PASSWORD);
      
      // Submit login
      await this.page.click('button[type="submit"]');
      await this.page.waitForLoadState('networkidle');
      
      const currentUrl = this.page.url();
      const duration = Date.now() - startTime;
      
      if (currentUrl.includes('/dashboard') || 
          (!currentUrl.includes('/signin') && !currentUrl.includes('/error'))) {
        this.results.login = {
          success: true,
          details: { redirectUrl: currentUrl, duration }
        };
        console.log(`   ✅ Login successful (${duration}ms)`);
        console.log(`   📍 Redirected to: ${currentUrl}`);
      } else {
        this.results.login = {
          success: false,
          details: { error: 'Login failed', currentUrl, duration }
        };
        console.log(`   ❌ Login failed - still on signin/error page: ${currentUrl}`);
      }
    } catch (error) {
      this.results.login = {
        success: false,
        details: { error: error.message, duration: Date.now() - startTime }
      };
      console.log(`   ❌ Login error: ${error.message}`);
    }
  }

  async testProtectedPageNavigation(pageName, route, testKey) {
    console.log(`🔄 Testing Navigation to ${pageName}...`);
    const startTime = Date.now();
    
    try {
      const beforeUrl = this.page.url();
      console.log(`   📍 Starting from: ${beforeUrl}`);
      
      // Navigate to the protected page
      await this.page.goto(`${this.baseUrl}${route}`);
      await this.page.waitForLoadState('domcontentloaded');
      
      // Wait a bit more to see if errors occur
      await this.page.waitForTimeout(3000);
      
      const afterUrl = this.page.url();
      const duration = Date.now() - startTime;
      
      // Check for error page or application error
      const hasApplicationError = await this.page.locator(':has-text("Application error")').count() > 0;
      const hasErrorPage = afterUrl.includes('/error') || afterUrl.includes('/signin');
      
      if (hasApplicationError || hasErrorPage) {
        this.results[testKey] = {
          success: false,
          details: { 
            error: hasApplicationError ? 'Application error displayed' : 'Redirected to error/signin',
            beforeUrl,
            afterUrl,
            duration
          }
        };
        console.log(`   ❌ Navigation to ${pageName} failed`);
        console.log(`   📍 Before: ${beforeUrl}`);
        console.log(`   📍 After: ${afterUrl}`);
        
        if (hasApplicationError) {
          console.log(`   🔍 Application error detected on page`);
          // Try to get more error details from the page
          const errorText = await this.page.textContent('body');
          console.log(`   📄 Page content snippet: ${errorText.substring(0, 200)}...`);
        }
      } else {
        this.results[testKey] = {
          success: true,
          details: { beforeUrl, afterUrl, duration }
        };
        console.log(`   ✅ Navigation to ${pageName} successful (${duration}ms)`);
        console.log(`   📍 Loaded: ${afterUrl}`);
      }
      
    } catch (error) {
      this.results[testKey] = {
        success: false,
        details: { error: error.message, duration: Date.now() - startTime }
      };
      console.log(`   ❌ Navigation to ${pageName} error: ${error.message}`);
    }
  }

  async runFullNavigationTest() {
    try {
      await this.initialize();
      
      // Step 1: Register new user
      await this.testRegistration();
      if (!this.results.registration.success) {
        console.log('❌ Stopping test - registration failed');
        return this.results;
      }
      
      // Step 2: Login
      await this.testLogin();
      if (!this.results.login.success) {
        console.log('❌ Stopping test - login failed');
        return this.results;
      }
      
      // Step 3: Navigate to first protected page (Dashboard)
      await this.testProtectedPageNavigation('Dashboard', '/dashboard', 'firstNavigation');
      
      // Step 4: Navigate to second protected page (Characters) - This should trigger the issue
      await this.testProtectedPageNavigation('Characters', '/characters', 'secondNavigation');
      
      // Step 5: Navigate to third protected page (Parties) - Additional test
      await this.testProtectedPageNavigation('Parties', '/parties', 'thirdNavigation');
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Test suite error:', error);
      this.results.errorDetails.push({
        type: 'suite_error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return this.results;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  generateReport() {
    console.log('\n📊 Enhanced Navigation Flow Test Report');
    console.log('=' .repeat(60));
    console.log(`Production URL: ${this.baseUrl}`);
    console.log(`Test Date: ${new Date().toISOString()}`);
    console.log(`Test User: ${TEST_USER_EMAIL}`);
    console.log('');
    
    // Test Results Summary
    const tests = [
      { name: 'Registration', result: this.results.registration },
      { name: 'Login', result: this.results.login },
      { name: 'First Navigation (Dashboard)', result: this.results.firstNavigation },
      { name: 'Second Navigation (Characters)', result: this.results.secondNavigation },
      { name: 'Third Navigation (Parties)', result: this.results.thirdNavigation }
    ];
    
    let passCount = 0;
    tests.forEach(test => {
      const status = test.result.success ? '✅ PASS' : '❌ FAIL';
      const duration = test.result.details?.duration || 0;
      console.log(`${status} ${test.name} (${duration}ms)`);
      if (test.result.success) passCount++;
      
      if (!test.result.success && test.result.details?.error) {
        console.log(`     Error: ${test.result.details.error}`);
      }
    });
    
    console.log('');
    console.log(`Overall Status: ${passCount === tests.length ? '✅ ALL PASS' : '❌ ISSUES FOUND'} (${passCount}/${tests.length})`);
    
    // Error Details
    if (this.results.errorDetails.length > 0) {
      console.log('\n🔍 Error Details:');
      console.log('-' .repeat(40));
      this.results.errorDetails.forEach((error, index) => {
        console.log(`${index + 1}. [${error.type.toUpperCase()}] ${error.message}`);
        if (error.url) console.log(`   URL: ${error.url}`);
        if (error.stack) console.log(`   Stack: ${error.stack.split('\n')[0]}`);
        console.log(`   Time: ${error.timestamp}`);
        console.log('');
      });
    }
    
    return {
      overall: passCount === tests.length ? 'PASS' : 'FAIL',
      passCount,
      totalTests: tests.length,
      results: this.results
    };
  }
}

async function main() {
  const tester = new NavigationFlowTester();
  
  try {
    await tester.runFullNavigationTest();
    const report = tester.generateReport();
    
    // Exit with appropriate code
    process.exit(report.overall === 'PASS' ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = NavigationFlowTester;