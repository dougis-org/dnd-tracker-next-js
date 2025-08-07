#!/usr/bin/env node

/**
 * Simple Navigation Test using Puppeteer
 * Tests the specific navigation flow that causes client-side exceptions
 */

const puppeteer = require('puppeteer');

const PRODUCTION_URL = 'https://dnd-tracker-next-js.fly.dev';
const TEST_USER_EMAIL = 'test-user-1754250538495@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

function setupPageLogging(page) {
  page.on('console', msg => {
    console.log(`🔍 [Browser ${msg.type()}]: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`❌ [Page Error]: ${error.message}`);
  });
  
  page.on('requestfailed', request => {
    console.log(`❌ [Request Failed]: ${request.url()} - ${request.failure().errorText}`);
  });
}

async function performLogin(page) {
  console.log('2. Attempting login...');
  await page.type('input[name="email"]', TEST_USER_EMAIL);
  await page.type('input[name="password"]', TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
}

async function testPageNavigation(page, pageName, route, errors) {
  console.log(`Navigating to ${pageName} page...`);
  await page.goto(`${PRODUCTION_URL}${route}`, { waitUntil: 'networkidle0' });
  console.log(`   ${pageName} URL: ${page.url()}`);
  
  const hasError = await page.evaluate(() => {
    return document.body.textContent.includes('Application error') ||
           document.body.textContent.includes('client-side exception');
  });
  
  if (hasError) {
    console.log(`❌ Application error detected on ${pageName} page`);
    const bodyText = await page.evaluate(() => document.body.textContent);
    console.log(`   Error content: ${bodyText.substring(0, 300)}...`);
    errors.push(`${pageName} page shows application error`);
  } else {
    console.log(`✅ ${pageName} page loaded successfully`);
  }
}

async function testNavigationFlow() {
  console.log('🔍 Simple Navigation Flow Test');
  console.log('=' .repeat(40));
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  setupPageLogging(page);
  
  let errors = [];
  
  try {
    console.log('1. Navigating to signin page...');
    await page.goto(`${PRODUCTION_URL}/signin`, { waitUntil: 'networkidle0' });
    console.log(`   Current URL: ${page.url()}`);
    
    await performLogin(page);
    console.log(`   After login URL: ${page.url()}`);
    
    if (page.url().includes('/signin')) {
      console.log('❌ Login failed - still on signin page');
      return;
    }
    
    console.log('3. Testing protected pages navigation...');
    await testPageNavigation(page, 'Characters', '/characters', errors);
    await testPageNavigation(page, 'Parties', '/parties', errors);
    await testPageNavigation(page, 'Dashboard', '/dashboard', errors);
    
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


async function main() {
  try {
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