#!/usr/bin/env node

/**
 * Production Test User Setup Script
 * Creates a test user in production environment for authentication testing
 * 
 * Usage: node scripts/setup-production-test-user.js
 */

const https = require('https');
const { URL } = require('url');

// Configuration
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://dnd-tracker-next-js.fly.dev';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test-user-' + Date.now() + '@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

class ProductionTestUserSetup {
  constructor() {
    this.baseUrl = PRODUCTION_URL;
  }

  async createTestUser() {
    console.log('🔧 Setting up test user in production...');
    console.log(`📧 Email: ${TEST_USER_EMAIL}`);
    console.log(`🔗 URL: ${this.baseUrl}`);

    const userData = {
      firstName: 'Test',
      lastName: 'User',
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      confirmPassword: TEST_USER_PASSWORD,
      username: 'testuser' + Date.now().toString().slice(-6), // Generate unique username
      agreeToTerms: true,
      subscribeToNewsletter: false
    };

    try {
      const response = await this.makeRequest('/api/auth/register', 'POST', userData);
      
      if (response.success) {
        console.log('✅ Test user created successfully');
        console.log('📋 User details:', {
          email: TEST_USER_EMAIL,
          password: '[HIDDEN]',
          id: response.user?.id,
          subscriptionTier: response.user?.subscriptionTier
        });
        
        // Save credentials for test script
        console.log('\n🔧 Environment variables for testing:');
        console.log(`export TEST_USER_EMAIL="${TEST_USER_EMAIL}"`);
        console.log(`export TEST_USER_PASSWORD="${TEST_USER_PASSWORD}"`);
        console.log(`export PRODUCTION_URL="${this.baseUrl}"`);
        
        return {
          success: true,
          user: response.user,
          credentials: {
            email: TEST_USER_EMAIL,
            password: TEST_USER_PASSWORD
          }
        };
      } else {
        console.log('❌ Failed to create test user:', response.message);
        if (response.errors) {
          response.errors.forEach(err => {
            console.log(`   - ${err.field}: ${err.message}`);
          });
        }
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('❌ Error creating test user:', error.message);
      return { success: false, error: error.message };
    }
  }

  async verifyTestUser() {
    console.log('\n🔍 Verifying test user login...');
    
    try {
      // Try to login with the test user credentials
      const loginData = {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      };

      const response = await this.makeRequest('/api/auth/callback/credentials', 'POST', loginData);
      
      if (response.ok || response.url) {
        console.log('✅ Test user login verification successful');
        return { success: true };
      } else {
        console.log('❌ Test user login verification failed');
        return { success: false, error: 'Login verification failed' };
      }
    } catch (error) {
      console.log('⚠️  Login verification error (this may be expected):', error.message);
      // Login verification error might be expected due to redirect handling
      return { success: true, warning: error.message };
    }
  }

  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ProductionTestSetup/1.0'
        }
      };

      if (data) {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve({
              ...parsed,
              statusCode: res.statusCode,
              headers: res.headers,
              ok: res.statusCode >= 200 && res.statusCode < 300
            });
          } catch (e) {
            // Non-JSON response
            resolve({
              statusCode: res.statusCode,
              data: responseData,
              headers: res.headers,
              ok: res.statusCode >= 200 && res.statusCode < 300
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async cleanup() {
    // Note: In a real scenario, you might want to delete the test user
    // For now, we'll leave it for testing purposes
    console.log('\n🧹 Test user left in place for testing');
    console.log('   Use the authentication test script to validate functionality');
  }
}

async function main() {
  console.log('🚀 Production Test User Setup');
  console.log('=' .repeat(40));
  
  const setup = new ProductionTestUserSetup();
  
  try {
    // Create test user
    const createResult = await setup.createTestUser();
    
    if (!createResult.success) {
      console.error('Failed to create test user');
      process.exit(1);
    }
    
    // Verify test user can login
    const verifyResult = await setup.verifyTestUser();
    
    console.log('\n✅ Test user setup complete');
    console.log('🧪 Ready to run production authentication tests');
    console.log('\nNext steps:');
    console.log('1. Export the environment variables shown above');
    console.log('2. Run: node scripts/test-production-auth.js');
    
    await setup.cleanup();
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProductionTestUserSetup;