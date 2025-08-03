#!/usr/bin/env node

/**
 * Complete Production Authentication Test Runner
 * Sets up test user and runs comprehensive authentication tests
 * 
 * Usage: node scripts/run-production-auth-tests.js
 */

const ProductionTestUserSetup = require('./setup-production-test-user');
const ProductionAuthTester = require('./test-production-auth');

class CompleteProductionAuthTestRunner {
  constructor() {
    this.productionUrl = process.env.PRODUCTION_URL || 'https://dnd-tracker-next-js.fly.dev';
    this.testUserEmail = process.env.TEST_USER_EMAIL || `test-user-${Date.now()}@example.com`;
    this.testUserPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
    
    // Set environment variables for child scripts
    process.env.PRODUCTION_URL = this.productionUrl;
    process.env.TEST_USER_EMAIL = this.testUserEmail;
    process.env.TEST_USER_PASSWORD = this.testUserPassword;
  }

  async runCompleteTest() {
    console.log('🧪 Complete Production Authentication Test Suite');
    console.log('=' .repeat(60));
    console.log(`🔗 Production URL: ${this.productionUrl}`);
    console.log(`📧 Test User: ${this.testUserEmail}`);
    console.log(`📅 Started: ${new Date().toISOString()}`);
    console.log('');

    const results = {
      userSetup: { success: false, error: null },
      authTests: { success: false, error: null, results: null },
      overall: { success: false, duration: 0 }
    };

    const startTime = Date.now();

    try {
      // Step 1: Set up test user
      console.log('📋 Step 1: Setting up test user...');
      const userSetup = new ProductionTestUserSetup();
      const setupResult = await userSetup.createTestUser();
      
      results.userSetup = setupResult;
      
      if (!setupResult.success) {
        throw new Error(`User setup failed: ${setupResult.error}`);
      }
      
      console.log('✅ Test user setup completed');
      
      // Wait a moment for user creation to propagate
      console.log('⏳ Waiting 3 seconds for user creation to propagate...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 2: Run authentication tests
      console.log('\n📋 Step 2: Running authentication tests...');
      const authTester = new ProductionAuthTester();
      const testResults = await authTester.runAllTests();
      
      results.authTests = testResults;
      
      // Step 3: Generate comprehensive report
      console.log('\n📋 Step 3: Generating comprehensive report...');
      results.overall = {
        success: setupResult.success && testResults.success,
        duration: Date.now() - startTime
      };
      
      this.generateComprehensiveReport(results);
      
      return results;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      results.overall = {
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      };
      
      this.generateComprehensiveReport(results);
      return results;
    }
  }

  generateComprehensiveReport(results) {
    console.log('\n📊 COMPREHENSIVE PRODUCTION AUTHENTICATION REPORT');
    console.log('=' .repeat(80));
    
    const overallStatus = results.overall.success ? '✅ PASS' : '❌ FAIL';
    console.log(`Overall Status: ${overallStatus}`);
    console.log(`Total Duration: ${results.overall.duration}ms`);
    console.log(`Production URL: ${this.productionUrl}`);
    console.log(`Test User: ${this.testUserEmail}`);
    console.log(`Test Date: ${new Date().toISOString()}`);
    
    console.log('\n🔧 SETUP PHASE');
    console.log('-' .repeat(30));
    const setupStatus = results.userSetup.success ? '✅ SUCCESS' : '❌ FAILED';
    console.log(`User Setup: ${setupStatus}`);
    if (results.userSetup.error) {
      console.log(`  Error: ${results.userSetup.error}`);
    }
    
    console.log('\n🧪 AUTHENTICATION TESTS');
    console.log('-' .repeat(30));
    
    if (results.authTests.results) {
      const authResults = results.authTests.results;
      
      Object.entries(authResults).forEach(([testName, result]) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const duration = `${result.duration}ms`;
        
        console.log(`${testName}: ${status} (${duration})`);
        if (result.error) {
          console.log(`  Error: ${result.error}`);
        }
        
        // Show detailed results for specific tests
        if (testName === 'protectedRoutes' && result.results) {
          console.log('  Route Protection Details:');
          result.results.forEach(route => {
            const routeStatus = route.protected ? '🔒' : '🔓';
            console.log(`    ${routeStatus} ${route.route}: ${route.status || route.finalUrl}`);
          });
        }
        
        if (testName === 'sessionPersistence' && result.details) {
          console.log('  Session Persistence Details:');
          result.details.forEach(page => {
            const pageStatus = page.success ? '✅' : '❌';
            console.log(`    ${pageStatus} ${page.page}: ${page.url || page.error}`);
          });
        }
      });
    } else if (results.authTests.error) {
      console.log(`Authentication Tests: ❌ FAILED`);
      console.log(`  Error: ${results.authTests.error}`);
    }
    
    console.log('\n📈 SUMMARY');
    console.log('-' .repeat(30));
    
    if (results.authTests.results) {
      const totalTests = Object.keys(results.authTests.results).length + 1; // +1 for setup
      const passedTests = (results.userSetup.success ? 1 : 0) + 
                         Object.values(results.authTests.results).filter(r => r.success).length;
      
      console.log(`Total Tests: ${totalTests}`);
      console.log(`Passed: ${passedTests}`);
      console.log(`Failed: ${totalTests - passedTests}`);
      console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    }
    
    console.log('\n🎯 RECOMMENDATIONS');
    console.log('-' .repeat(30));
    
    if (results.overall.success) {
      console.log('✅ Production authentication is working correctly');
      console.log('✅ All security measures are properly implemented');
      console.log('✅ Session management is functioning as expected');
    } else {
      console.log('❌ Production authentication has issues that need attention');
      
      if (!results.userSetup.success) {
        console.log('🔧 Fix user registration/creation process');
      }
      
      if (results.authTests.results) {
        const failedTests = Object.entries(results.authTests.results)
          .filter(([_, result]) => !result.success);
        
        failedTests.forEach(([testName, result]) => {
          console.log(`🔧 Fix ${testName}: ${result.error}`);
        });
      }
    }
    
    console.log('\n💾 Test artifacts can be found in the console output above');
    console.log('🔄 Re-run this script after making fixes to validate changes');
  }
}

async function main() {
  const runner = new CompleteProductionAuthTestRunner();
  const results = await runner.runCompleteTest();
  
  // Exit with appropriate code
  process.exit(results.overall.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CompleteProductionAuthTestRunner;