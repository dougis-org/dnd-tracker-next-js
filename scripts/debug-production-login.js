#!/usr/bin/env node

/**
 * Debug Production Login Script
 * Simplified script to debug login issues
 */

const puppeteer = require('puppeteer');

const PRODUCTION_URL = 'https://dnd-tracker-next-js.fly.dev';
const TEST_USER_EMAIL = 'test-user-1754201513724@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

async function debugLogin() {
  console.log('🔍 Debugging production login...');
  
  const browser = await puppeteer.launch({
    headless: false, // Run in visible mode for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`[Browser ${msg.type().toUpperCase()}]:`, msg.text());
  });
  
  // Log all network activity
  page.on('response', response => {
    console.log(`[Network]: ${response.status()} ${response.url()}`);
  });
  
  try {
    console.log('1. Navigating to signin page...');
    await page.goto(`${PRODUCTION_URL}/signin`, { waitUntil: 'networkidle2' });
    
    console.log('2. Current URL:', page.url());
    
    console.log('3. Looking for form elements...');
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.waitForSelector('input[name="password"]', { timeout: 10000 });
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    
    console.log('4. Taking screenshot...');
    await page.screenshot({ path: 'signin-page.png', fullPage: true });
    
    console.log('5. Filling form...');
    await page.type('input[name="email"]', TEST_USER_EMAIL);
    await page.type('input[name="password"]', TEST_USER_PASSWORD);
    
    console.log('6. Submitting form...');
    await page.click('button[type="submit"]');
    
    console.log('7. Waiting for navigation...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    
    console.log('8. Final URL:', page.url());
    
    console.log('✅ Login completed successfully');
    
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    
    // Take screenshot of error state
    await page.screenshot({ path: 'signin-error.png', fullPage: true });
    
    // Get page content for debugging
    const content = await page.content();
    console.log('Page content length:', content.length);
    
    // Check for any error messages
    const errorElements = await page.$$eval('[role="alert"], .alert, .error', elements => 
      elements.map(el => el.textContent.trim()).filter(text => text.length > 0)
    );
    if (errorElements.length > 0) {
      console.log('Error messages found:', errorElements);
    }
  } finally {
    console.log('9. Closing browser...');
    await browser.close();
  }
}

debugLogin().catch(console.error);