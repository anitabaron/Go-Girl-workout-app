import { teardownAllData } from './fixtures/db-teardown';

/**
 * Global teardown for Playwright E2E tests
 * 
 * This function runs after all tests have completed.
 * It cleans up all test data from the E2E database.
 * 
 * To disable teardown, set E2E_SKIP_TEARDOWN=true in .env.test
 */
async function globalTeardown() {
  // Check if teardown should be skipped
  if (process.env.E2E_SKIP_TEARDOWN === 'true') {
    console.log('[Global Teardown] Skipping database teardown (E2E_SKIP_TEARDOWN=true)');
    return;
  }

  // Verify we're in test environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.log('[Global Teardown] No Supabase URL configured, skipping teardown');
    return;
  }

  try {
    console.log('[Global Teardown] Starting database cleanup...');
    console.log(`[Global Teardown] Target: ${supabaseUrl}`);
    await teardownAllData(true); // verbose = true
    console.log('[Global Teardown] Database cleanup completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Check if it's a safety check error (should not be ignored)
    if (errorMessage.includes('SAFETY CHECK FAILED')) {
      console.error('[Global Teardown] SAFETY CHECK FAILED - Teardown blocked:', errorMessage);
      // Don't throw - but log clearly that teardown was blocked
      return;
    }
    console.error('[Global Teardown] Error during database cleanup:', errorMessage);
    // Don't throw - we don't want to fail the test run if teardown fails
    // The test database should be cleaned up manually if needed
  }
}

export default globalTeardown;
