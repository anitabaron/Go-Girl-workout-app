#!/usr/bin/env node

/**
 * Script to manually run database teardown for E2E tests
 * 
 * Usage:
 *   pnpm e2e:teardown              # Clean all test data
 *   pnpm e2e:teardown --user=ID    # Clean data for specific user
 * 
 * Requirements:
 *   - .env.test file with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - E2E_TEST_ENV=true for remote test databases
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { teardownAllData, teardownUserData } from '../e2e/fixtures/db-teardown';

// Load environment variables from .env.test
config({ path: resolve(process.cwd(), '.env.test') });

async function main() {
  const args = process.argv.slice(2);
  const userIdArg = args.find(arg => arg.startsWith('--user='));
  const userId = userIdArg ? userIdArg.split('=')[1] : undefined;

  console.log('🧹 E2E Database Teardown');
  console.log('');

  // Check environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  
  if (!supabaseUrl) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL is not set in .env.test');
    process.exit(1);
  }

  if (!anonKey) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY is not set in .env.test');
    process.exit(1);
  }

  console.log(`📍 Target: ${supabaseUrl}`);
  console.log('');

  try {
    if (userId) {
      console.log(`🗑️  Cleaning up data for user: ${userId}`);
      await teardownUserData(userId, true); // verbose = true
      console.log('');
      console.log('✅ Teardown completed successfully for user:', userId);
    } else {
      console.log('🗑️  Cleaning up ALL test data...');
      console.log('⚠️  WARNING: This will delete all data from the test database!');
      console.log('');
      await teardownAllData(true); // verbose = true
      console.log('');
      console.log('✅ Teardown completed successfully');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('');
    console.error('❌ Error during teardown:', errorMessage);
    process.exit(1);
  }
}

main();
