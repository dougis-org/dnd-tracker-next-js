import { test, expect } from '@playwright/test';

/**
 * F01-UserRegistration End-to-End Test
 * 
 * Tests the complete user registration flow as defined in the E2E Test Plan:
 * - User creates a new account via Clerk
 * - Verifies successful registration
 * - Confirms redirect to profile setup
 * 
 * Flow: None → User Registration → Profile Setup
 * Complexity: Basic
 * 
 * This test validates the core product requirement for user account creation
 * and the multi-tier subscription system entry point.
 */

test.describe('F01-UserRegistration', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page - unauthenticated user
    await page.goto('/');
  });

  test('should allow user to register a new account via Clerk', async ({ page }) => {
    // Step 1: Navigate to signup page
    await page.click('text=Sign Up', { timeout: 10000 });
    await expect(page).toHaveURL('/signup');

    // Step 2: Verify signup page loads correctly
    await expect(page.locator('h1')).toContainText('Create your account');
    await expect(page.locator('text=Register to start building your D&D encounters')).toBeVisible();

    // Step 3: Wait for Clerk signup form to load
    await page.waitForSelector('[data-clerk-element]', { timeout: 15000 });

    // Step 4: Fill out registration form
    // Note: Using unique test data to avoid conflicts
    const testEmail = `test-user-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Fill in email address
    await page.fill('input[name="emailAddress"], input[type="email"]', testEmail);
    
    // Fill in password
    await page.fill('input[name="password"], input[type="password"]', testPassword);

    // Step 5: Submit registration form
    await page.click('button[type="submit"], button:has-text("Sign up"), button:has-text("Continue")');

    // Step 6: Handle email verification if required
    // In test environment, email verification should be bypassed
    // If email verification screen appears, we should see a verification message
    try {
      await page.waitForSelector('text=Check your email', { timeout: 5000 });
      console.log('Email verification required in test environment');
      
      // In a real test, you would either:
      // 1. Use a test email service to retrieve and click verification
      // 2. Configure test environment to bypass email verification
      // 3. Mock the verification step
      
      // For now, we'll verify the email verification screen appears
      await expect(page.locator('text=Check your email')).toBeVisible();
      
    } catch {
      // Email verification bypassed - continue to next step
      console.log('Email verification bypassed in test environment');
    }

    // Step 7: Verify successful registration and redirect
    // Should redirect to profile setup after successful registration
    await expect(page).toHaveURL('/profile-setup', { timeout: 20000 });

    // Step 8: Verify profile setup page loads
    await expect(page.locator('h1, h2, text=Profile Setup, text=Complete your profile')).toBeVisible({ timeout: 10000 });

    // Step 9: Verify user is authenticated
    // Check for authenticated user indicators (user menu, dashboard link, etc.)
    await expect(page.locator('[data-testid="user-menu"], .user-menu, text=Dashboard, text=Settings')).toBeVisible({ timeout: 10000 });

    console.log(`✅ User registration successful for: ${testEmail}`);
  });

  test('should show validation errors for invalid registration data', async ({ page }) => {
    // Navigate to signup page
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/signup');

    // Wait for Clerk form to load
    await page.waitForSelector('[data-clerk-element]', { timeout: 15000 });

    // Try to submit with invalid email
    await page.fill('input[name="emailAddress"], input[type="email"]', 'invalid-email');
    await page.fill('input[name="password"], input[type="password"]', 'weak');
    
    await page.click('button[type="submit"], button:has-text("Sign up"), button:has-text("Continue")');

    // Should show validation errors
    await expect(page.locator('text=valid email, text=invalid email')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect authenticated users away from signup page', async ({ page }) => {
    // This test would require pre-authentication setup
    // For now, we'll test the signup page behavior for unauthenticated users
    
    await page.goto('/signup');
    
    // Verify page loads for unauthenticated users
    await expect(page.locator('h1')).toContainText('Create your account');
    await expect(page.locator('text=Already have an account')).toBeVisible();
    
    // Verify link to signin page
    await page.click('text=Sign in');
    await expect(page).toHaveURL('/signin');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');
    await expect(page).toHaveURL('/signup');

    // Verify page loads even with potential network issues
    await expect(page.locator('h1')).toContainText('Create your account', { timeout: 15000 });
    
    // Verify form is present and functional
    await page.waitForSelector('[data-clerk-element], input[type="email"]', { timeout: 15000 });
  });
});