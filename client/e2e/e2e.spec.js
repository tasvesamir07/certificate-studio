import { test, expect } from '@playwright/test';

test.describe('Certificate Studio E2E Smoke Tests', () => {
  test('should load login page by default', async ({ page }) => {
    await page.goto('http://localhost:3000/user/login');
    
    // Check that we can see either Login or Sign Up
    await expect(page.locator('button:has-text("Login")').first()).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test('should toggle between login and sign up tabs', async ({ page }) => {
    await page.goto('http://localhost:3000/user/login');
    
    // Click signup tab
    const signupTab = page.locator('button:has-text("Sign Up")').first();
    await expect(signupTab).toBeVisible();
    await signupTab.click();
    
    // Display Name input label should show up
    await expect(page.locator('label:has-text("Display Name")')).toBeVisible();
  });

  test('should show verification error for invalid code and navigate to login', async ({ page }) => {
    // Navigate to verification page with a bad code
    await page.goto('http://localhost:3000/verify/invalid-test-code');
    
    // Should show verification failed card
    await expect(page.locator('h2:has-text("Verification Failed")')).toBeVisible();
    
    // Click 'Go to Studio'
    const goToStudioBtn = page.locator('button:has-text("Go to Studio")');
    await expect(goToStudioBtn).toBeVisible();
    await goToStudioBtn.click();
    
    // Should redirect back to login page
    await expect(page).toHaveURL(/.*\/user\/login/);
  });
});
