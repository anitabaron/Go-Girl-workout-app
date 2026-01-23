import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'node:path';

/**
 * Load environment variables from .env.test file
 * This makes test environment variables available in Playwright config and tests
 */
config({ path: resolve(process.cwd(), '.env.test') });

/**
 * Playwright configuration for E2E tests
 * Configured with Chromium/Desktop Chrome only as per project guidelines
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      // Pass environment variables from .env.test to Next.js dev server
      // This ensures the app uses E2E Supabase instance instead of localhost
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      // Map NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY to NEXT_PUBLIC_SUPABASE_ANON_KEY
      // (app uses ANON_KEY, but .env.test might have PUBLISHABLE_DEFAULT_KEY)
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
        '',
    },
  },
});
