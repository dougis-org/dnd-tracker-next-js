#!/usr/bin/env node

/**
 * Navigation Flow Test with Existing User
 * Tests navigation between protected pages with a known good user account
 * Focuses on reproducing the client-side exception issue
 */

const { chromium } = require('playwright');

// Configuration - Using the user we created earlier
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://dnd-tracker-next-js.fly.dev';
const TEST_USER_EMAIL = 'test-user-1754250538495@example.com'; // Known good user
const TEST_USER_PASSWORD = 'TestPassword123!';
const HEADLESS = process.env.HEADLESS !== 'false';

class ExistingUserNavigationTest {
  constructor() {
    this.baseUrl = PRODUCTION_URL;
    this.browser = null;
    this.page = null;
    this.results = {
      login: { success: false, details: null },
      navigations: [],
      errorDetails: []
    };
  }

  async initialize() {
    console.log('🔍 Navigation Test with Existing User');
    console.log('=' .repeat(50));
    console.log(`📍 Testing URL: ${this.baseUrl}`);
    console.log(`📧 User: ${TEST_USER_EMAIL}`);
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
      console.log(`🔍 [Stack]: ${error.stack}`);
      this.results.errorDetails.push({
        type: 'pageerror',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: this.page.url()
      });
    });
    
    this.page.on('requestfailed', (request) => {
      const failure = request.failure();
      console.log(`❌ [Network Error]: ${failure.errorText} ${request.url()}`);
      this.results.errorDetails.push({
        type: 'requestfailed', 
        message: `${failure.errorText} - ${request.url()}`,
        timestamp: new Date().toISOString(),
        url: this.page.url()
      });
    });
  }

  async performLogin() {
    await this.page.goto(`${this.baseUrl}/signin`);
    await this.page.waitForLoadState('networkidle');
    await this.page.fill('input[name="email"]', TEST_USER_EMAIL);
    await this.page.fill('input[name="password"]', TEST_USER_PASSWORD);
    await this.page.click('button[type="submit"]');
    await this.page.waitForLoadState('networkidle');
  }

  async testLogin() {
    console.log('🔐 Testing Login...');
    const startTime = Date.now();
    
    try {
      await this.performLogin();
      
      const currentUrl = this.page.url();
      const duration = Date.now() - startTime;
      const isSuccess = currentUrl.includes('/dashboard') || 
        (!currentUrl.includes('/signin') && !currentUrl.includes('/error'));
      
      this.results.login = {
        success: isSuccess,
        details: isSuccess 
          ? { redirectUrl: currentUrl, duration }
          : { error: 'Login failed', currentUrl, duration }
      };
      
      console.log(isSuccess 
        ? `   ✅ Login successful (${duration}ms)\n   📍 Redirected to: ${currentUrl}`
        : `   ❌ Login failed: ${currentUrl}`
      );
      return isSuccess;
    } catch (error) {
      this.results.login = {
        success: false,
        details: { error: error.message, duration: Date.now() - startTime }
      };
      console.log(`   ❌ Login error: ${error.message}`);
      return false;
    }
  }

  async checkForErrors() {
    const hasApplicationError = await this.page.locator(':has-text("Application error")').count() > 0;
    const hasErrorPage = this.page.url().includes('/error') || this.page.url().includes('/signin');
    const bodyText = await this.page.textContent('body');
    const hasClientError = bodyText.includes('client-side exception') || bodyText.includes('Application error');
    
    return { hasApplicationError, hasErrorPage, hasClientError, bodyText };
  }

  async testPageNavigation(pageName, route) {
    console.log(`🔄 Testing Navigation to ${pageName}...`);
    const startTime = Date.now();
    
    try {
      const beforeUrl = this.page.url();
      console.log(`   📍 Starting from: ${beforeUrl}`);
      
      await this.page.goto(`${this.baseUrl}${route}`);
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(3000);
      
      const afterUrl = this.page.url();
      const duration = Date.now() - startTime;
      const { hasApplicationError, hasErrorPage, hasClientError, bodyText } = await this.checkForErrors();
      
      const result = {
        pageName,
        route,
        success: !hasApplicationError && !hasErrorPage && !hasClientError,
        beforeUrl,
        afterUrl,
        duration,
        pageTitle: await this.page.title(),
        hasApplicationError,
        hasErrorPage,
        hasClientError,
        timestamp: new Date().toISOString()
      };
      
      if (hasClientError) {
        result.errorText = bodyText.substring(0, 500);
        console.log(`   ❌ Client-side error detected!\n   📄 Error content: ${result.errorText}...`);
      }
      
      this.results.navigations.push(result);
      
      if (result.success) {
        console.log(`   ✅ Navigation successful (${duration}ms)`);
        console.log(`   📍 Page title: ${pageTitle}`);
      } else {
        console.log(`   ❌ Navigation failed (${duration}ms)`);
        console.log(`   📍 Before: ${beforeUrl}`);
        console.log(`   📍 After: ${afterUrl}`);
        if (hasApplicationError) console.log(`   🔍 Application error detected`);
        if (hasErrorPage) console.log(`   🔍 Redirected to error/signin page`);
        if (hasClientError) console.log(`   🔍 Client-side exception detected`);
      }
      
      return result;
      
    } catch (error) {
      const result = {
        pageName,
        route,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
      this.results.navigations.push(result);
      console.log(`   ❌ Navigation error: ${error.message}`);
      return result;
    }
  }

  async runNavigationSequence() {
    try {
      await this.initialize();
      
      // Step 1: Login
      const loginSuccess = await this.testLogin();
      if (!loginSuccess) {
        console.log('❌ Stopping test - login failed');
        return this.results;
      }
      
      // Step 2: Navigate through protected pages in sequence
      const pages = [
        { name: 'Dashboard', route: '/dashboard' },
        { name: 'Characters', route: '/characters' },
        { name: 'Parties', route: '/parties' },
        { name: 'Encounters', route: '/encounters' },
        { name: 'Dashboard Again', route: '/dashboard' }, // Test going back
        { name: 'Characters Again', route: '/characters' } // Test repeat navigation
      ];
      
      for (const page of pages) {
        await this.testPageNavigation(page.name, page.route);
        
        // Small delay between navigations
        await this.page.waitForTimeout(1000);
      }
      
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

  generateDetailedReport() {
    console.log('\n📊 Detailed Navigation Test Report');
    console.log('=' .repeat(60));
    console.log(`Production URL: ${this.baseUrl}`);
    console.log(`Test Date: ${new Date().toISOString()}`);
    console.log(`Test User: ${TEST_USER_EMAIL}`);
    console.log('');
    
    // Login Result
    const loginStatus = this.results.login.success ? '✅ PASS' : '❌ FAIL';
    const loginDuration = this.results.login.details?.duration || 0;
    console.log(`${loginStatus} Login (${loginDuration}ms)`);
    if (!this.results.login.success) {
      console.log(`     Error: ${this.results.login.details?.error}`);
    }
    console.log('');
    
    // Navigation Results
    console.log('Navigation Sequence Results:');
    console.log('-' .repeat(30));
    
    let successCount = 0;
    this.results.navigations.forEach((nav, index) => {
      const status = nav.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${status} ${nav.pageName} (${nav.duration}ms)`);
      
      if (nav.success) {
        successCount++;
      } else {
        if (nav.hasApplicationError) console.log(`     ⚠️  Application error detected`);
        if (nav.hasClientError) console.log(`     ⚠️  Client-side exception detected`);
        if (nav.hasErrorPage) console.log(`     ⚠️  Redirected to error/signin page`);
        if (nav.error) console.log(`     ❌ Error: ${nav.error}`);
      }
    });
    
    console.log('');
    console.log(`Navigation Success Rate: ${successCount}/${this.results.navigations.length}`);
    
    // Error Analysis
    if (this.results.errorDetails.length > 0) {
      console.log('\n🔍 Detailed Error Analysis:');
      console.log('-' .repeat(40));
      
      const errorsByType = {};
      this.results.errorDetails.forEach(error => {
        if (!errorsByType[error.type]) {
          errorsByType[error.type] = [];
        }
        errorsByType[error.type].push(error);
      });
      
      Object.entries(errorsByType).forEach(([type, errors]) => {
        console.log(`\n${type.toUpperCase()} Errors (${errors.length}):`);
        errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.message}`);
          if (error.url) console.log(`     URL: ${error.url}`);
          if (error.stack) {
            console.log(`     Stack: ${error.stack.split('\n')[0]}`);
          }
          console.log(`     Time: ${error.timestamp}`);
        });
      });
    }
    
    // Issue Summary
    const hasNavigationIssues = this.results.navigations.some(nav => !nav.success);
    const hasClientErrors = this.results.navigations.some(nav => nav.hasClientError);
    
    console.log('\n🎯 Issue Summary:');
    console.log('-' .repeat(20));
    console.log(`Login Issues: ${this.results.login.success ? 'None' : 'YES'}`);
    console.log(`Navigation Issues: ${hasNavigationIssues ? 'YES' : 'None'}`);
    console.log(`Client-side Exceptions: ${hasClientErrors ? 'YES' : 'None'}`);
    console.log(`Network Errors: ${this.results.errorDetails.filter(e => e.type === 'requestfailed').length}`);
    console.log(`Page Errors: ${this.results.errorDetails.filter(e => e.type === 'pageerror').length}`);
    
    return {
      overall: this.results.login.success && !hasNavigationIssues ? 'PASS' : 'FAIL',
      hasClientErrors,
      hasNavigationIssues,
      results: this.results
    };
  }
}

async function main() {
  const tester = new ExistingUserNavigationTest();
  
  try {
    await tester.runNavigationSequence();
    const report = tester.generateDetailedReport();
    
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

module.exports = ExistingUserNavigationTest;