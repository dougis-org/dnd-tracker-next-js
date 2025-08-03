#!/usr/bin/env node

/**
 * Simple Navigation Test using Puppeteer
 * Tests the specific navigation flow that causes client-side exceptions
 */

const puppeteer = require('puppeteer');

const PRODUCTION_URL = 'https://dnd-tracker-next-js.fly.dev';
const TEST_USER_EMAIL = 'test-user-1754250538495@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

async function testNavigationFlow() {
  console.log('🔍 Simple Navigation Flow Test');
  console.log('=' .repeat(40));
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`🔍 [Browser ${msg.type()}]: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`❌ [Page Error]: ${error.message}`);
  });
  
  page.on('requestfailed', request => {
    console.log(`❌ [Request Failed]: ${request.url()} - ${request.failure().errorText}`);
  });
  
  let errors = [];
  
  try {
    // Step 1: Go to signin
    console.log('1. Navigating to signin page...');
    await page.goto(`${PRODUCTION_URL}/signin`, { waitUntil: 'networkidle0' });
    console.log(`   Current URL: ${page.url()}`);
    
    // Step 2: Login
    console.log('2. Attempting login...');
    await page.type('input[name="email"]', TEST_USER_EMAIL);
    await page.type('input[name="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log(`   After login URL: ${page.url()}`);
    
    if (page.url().includes('/signin')) {
      console.log('❌ Login failed - still on signin page');
      return;
    }
    
    // Step 3: Navigate to first protected page (Characters)
    console.log('3. Navigating to Characters page...');
    await page.goto(`${PRODUCTION_URL}/characters`, { waitUntil: 'networkidle0' });
    console.log(`   Characters URL: ${page.url()}`);
    
    // Check for application error
    const hasError = await page.evaluate(() => {
      return document.body.textContent.includes('Application error') ||
             document.body.textContent.includes('client-side exception');
    });
    
    if (hasError) {
      console.log('❌ Application error detected on Characters page');
      const bodyText = await page.evaluate(() => document.body.textContent);
      console.log(`   Error content: ${bodyText.substring(0, 300)}...`);
      errors.push('Characters page shows application error');
    } else {
      console.log('✅ Characters page loaded successfully');
    }
    
    // Step 4: Navigate to second protected page (Parties)
    console.log('4. Navigating to Parties page...');
    await page.goto(`${PRODUCTION_URL}/parties`, { waitUntil: 'networkidle0' });
    console.log(`   Parties URL: ${page.url()}`);
    
    // Check for application error
    const hasError2 = await page.evaluate(() => {
      return document.body.textContent.includes('Application error') ||
             document.body.textContent.includes('client-side exception');
    });
    
    if (hasError2) {
      console.log('❌ Application error detected on Parties page');
      const bodyText = await page.evaluate(() => document.body.textContent);
      console.log(`   Error content: ${bodyText.substring(0, 300)}...`);
      errors.push('Parties page shows application error');
    } else {
      console.log('✅ Parties page loaded successfully');
    }
    
    // Step 5: Navigate to third protected page (Dashboard)
    console.log('5. Navigating back to Dashboard...');
    await page.goto(`${PRODUCTION_URL}/dashboard`, { waitUntil: 'networkidle0' });
    console.log(`   Dashboard URL: ${page.url()}`);
    
    // Check for application error
    const hasError3 = await page.evaluate(() => {
      return document.body.textContent.includes('Application error') ||
             document.body.textContent.includes('client-side exception');
    });
    
    if (hasError3) {
      console.log('❌ Application error detected on Dashboard page');
      const bodyText = await page.evaluate(() => document.body.textContent);
      console.log(`   Error content: ${bodyText.substring(0, 300)}...`);
      errors.push('Dashboard page shows application error');
    } else {
      console.log('✅ Dashboard page loaded successfully');
    }
    
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
    errors.push(`Test execution error: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(20));
  if (errors.length === 0) {
    console.log('✅ All navigation tests passed');
  } else {
    console.log(`❌ Found ${errors.length} issues:`);
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  return errors;
}

// Install puppeteer if it's not available
async function ensurePuppeteer() {
  try {
    require('puppeteer');
  } catch (error) {
    console.log('Installing puppeteer...');
    const { execSync } = require('child_process');
    execSync('npm install puppeteer', { stdio: 'inherit' });
  }
}

async function main() {
  try {
    await ensurePuppeteer();
    const errors = await testNavigationFlow();
    process.exit(errors.length === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Failed to run test:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testNavigationFlow };