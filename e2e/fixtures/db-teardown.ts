import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import type { Database } from '../../src/db/database.types';

/**
 * Load environment variables from .env.test file
 */
config({ path: resolve(process.cwd(), '.env.test') });

/**
 * Validates that we're running teardown on a test environment
 * Prevents accidental cleanup of production or development databases
 */
function validateTestEnvironment(supabaseUrl: string): void {
  const urlLower = supabaseUrl.toLowerCase();
  
  // Always allow localhost for local testing
  if (urlLower.includes('localhost') || urlLower.includes('127.0.0.1')) {
    return; // Local testing is always allowed
  }

  // Check for explicit test environment flag
  const isExplicitTestEnv = process.env.E2E_TEST_ENV === 'true';
  
  // Check if URL contains test/staging indicators
  const hasTestIndicator = urlLower.includes('test') || urlLower.includes('staging');
  
  // Block URLs that explicitly indicate production
  const productionIndicators = ['production', 'prod'];
  const isExplicitlyProduction = productionIndicators.some(indicator => 
    urlLower.includes(indicator)
  );

  if (isExplicitlyProduction) {
    throw new Error(
      `SAFETY CHECK FAILED: Supabase URL explicitly indicates production: ${supabaseUrl}\n` +
      'Teardown is blocked to prevent accidental data loss.\n' +
      'If this is actually a test environment, rename the project or set E2E_TEST_ENV=true.'
    );
  }

  // For remote Supabase URLs (supabase.co), require either:
  // 1. Explicit test environment flag (E2E_TEST_ENV=true), OR
  // 2. URL contains "test" or "staging"
  if (urlLower.includes('supabase.co')) {
    if (!isExplicitTestEnv && !hasTestIndicator) {
      throw new Error(
        `SAFETY CHECK FAILED: Remote Supabase URL without test environment confirmation: ${supabaseUrl}\n` +
        'Teardown is blocked to prevent accidental data loss.\n' +
        'To allow teardown, either:\n' +
        '  1. Set E2E_TEST_ENV=true in .env.test, OR\n' +
        '  2. Ensure the URL contains "test" or "staging"'
      );
    }
  }

  // If we got here, environment is validated
  if (isExplicitTestEnv) {
    console.log(`[DB Teardown] Test environment confirmed via E2E_TEST_ENV=true`);
  }
}

/**
 * Creates a Supabase client for E2E test database teardown
 * Prefers service_role key (bypasses RLS), falls back to anon key
 */
function createTestSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_SERVICE_KEY;
  const anonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set in .env.test. Cannot perform database teardown.'
    );
  }

  // Validate we're on a test environment
  validateTestEnvironment(supabaseUrl);

  // Prefer service_role key (bypasses RLS) for teardown
  if (serviceRoleKey) {
    return createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Fallback to anon key (may be blocked by RLS)
  if (anonKey) {
    console.warn(
      '[DB Teardown] Using anon key - teardown may be blocked by RLS.\n' +
      'For reliable teardown, set SUPABASE_SERVICE_ROLE_KEY in .env.test'
    );
    return createClient<Database>(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  throw new Error(
    'Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is set in .env.test. Cannot perform database teardown.'
  );
}

/**
 * Options for database teardown
 */
export interface TeardownOptions {
  /**
   * User ID to clean up data for. If not provided, cleans up all test data.
   * Useful for cleaning up data created by a specific test user.
   */
  userId?: string;
  
  /**
   * Whether to log cleanup operations
   */
  verbose?: boolean;
}

/**
 * Valid table names for database operations
 */
type TableName =
  | 'workout_plans'
  | 'workout_sessions'
  | 'exercises'
  | 'workout_session_exercises'
  | 'ai_requests'
  | 'ai_usage'
  | 'personal_records'
  | 'workout_plan_exercises'
  | 'workout_session_sets';

/**
 * Helper function to delete data from a table
 */
async function deleteFromTable(
  supabase: SupabaseClient<Database>,
  tableName: TableName,
  userId: string | undefined,
  log: (message: string) => void
): Promise<void> {
  // Count rows before deletion
  let countBefore = 0;
  if (userId) {
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    countBefore = count || 0;
  } else {
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', '1970-01-01');
    countBefore = count || 0;
  }

  if (userId) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      log(`❌ Error deleting ${tableName}: ${error.message}`);
      log(`   Code: ${error.code}, Details: ${error.details || 'N/A'}`);
    } else {
      log(`   Deleted ${countBefore} rows from ${tableName}`);
    }
  } else {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .gte('created_at', '1970-01-01');
    
    if (error) {
      log(`❌ Error deleting ${tableName}: ${error.message}`);
      log(`   Code: ${error.code}, Details: ${error.details || 'N/A'}`);
    } else {
      log(`   Deleted ${countBefore} rows from ${tableName}`);
    }
  }
}

/**
 * Helper function to delete workout_session_sets for a user
 */
async function deleteWorkoutSessionSets(
  supabase: SupabaseClient<Database>,
  userId: string | undefined,
  log: (message: string) => void
): Promise<void> {
  if (userId) {
    // Get all sessions for user
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      
      // Get all session exercises for these sessions
      const { data: sessionExercises } = await supabase
        .from('workout_session_exercises')
        .select('id')
        .in('session_id', sessionIds);

      if (sessionExercises && sessionExercises.length > 0) {
        const sessionExerciseIds = sessionExercises.map(se => se.id);
        // Count before deletion
        const { count: countBefore } = await supabase
          .from('workout_session_sets')
          .select('*', { count: 'exact', head: true })
          .in('session_exercise_id', sessionExerciseIds);
        
        const { error } = await supabase
          .from('workout_session_sets')
          .delete()
          .in('session_exercise_id', sessionExerciseIds);
        
        if (error) {
          log(`❌ Error deleting workout_session_sets: ${error.message}`);
          log(`   Code: ${error.code}, Details: ${error.details || 'N/A'}`);
        } else {
          log(`   Deleted ${countBefore || 0} workout_session_sets`);
        }
      }
    }
  } else {
    // Count before deletion
    const { count: countBefore } = await supabase
      .from('workout_session_sets')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', '1970-01-01');
    
    const { error } = await supabase
      .from('workout_session_sets')
      .delete()
      .gte('created_at', '1970-01-01');
    
    if (error) {
      log(`❌ Error deleting workout_session_sets: ${error.message}`);
      log(`   Code: ${error.code}, Details: ${error.details || 'N/A'}`);
    } else {
      log(`   Deleted ${countBefore || 0} workout_session_sets`);
    }
  }
}

/**
 * Helper function to delete workout_session_exercises for a user
 */
async function deleteWorkoutSessionExercises(
  supabase: SupabaseClient<Database>,
  userId: string | undefined,
  log: (message: string) => void
): Promise<void> {
  if (userId) {
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      // Count before deletion
      const { count: countBefore } = await supabase
        .from('workout_session_exercises')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds);
      
      const { error } = await supabase
        .from('workout_session_exercises')
        .delete()
        .in('session_id', sessionIds);
      
      if (error) {
        log(`❌ Error deleting workout_session_exercises: ${error.message}`);
        log(`   Code: ${error.code}, Details: ${error.details || 'N/A'}`);
      } else {
        log(`   Deleted ${countBefore || 0} workout_session_exercises`);
      }
    }
  } else {
    // Count before deletion
    const { count: countBefore } = await supabase
      .from('workout_session_exercises')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', '1970-01-01');
    
    const { error } = await supabase
      .from('workout_session_exercises')
      .delete()
      .gte('created_at', '1970-01-01');
    
    if (error) {
      log(`❌ Error deleting workout_session_exercises: ${error.message}`);
      log(`   Code: ${error.code}, Details: ${error.details || 'N/A'}`);
    } else {
      log(`   Deleted ${countBefore || 0} workout_session_exercises`);
    }
  }
}

/**
 * Helper function to delete workout_plan_exercises for a user
 */
async function deleteWorkoutPlanExercises(
  supabase: SupabaseClient<Database>,
  userId: string | undefined,
  log: (message: string) => void
): Promise<void> {
  if (userId) {
    const { data: plans } = await supabase
      .from('workout_plans')
      .select('id')
      .eq('user_id', userId);

    if (plans && plans.length > 0) {
      const planIds = plans.map(p => p.id);
      // Count before deletion
      const { count: countBefore } = await supabase
        .from('workout_plan_exercises')
        .select('*', { count: 'exact', head: true })
        .in('plan_id', planIds);
      
      const { error } = await supabase
        .from('workout_plan_exercises')
        .delete()
        .in('plan_id', planIds);
      
      if (error) {
        log(`❌ Error deleting workout_plan_exercises: ${error.message}`);
        log(`   Code: ${error.code}, Details: ${error.details || 'N/A'}`);
      } else {
        log(`   Deleted ${countBefore || 0} workout_plan_exercises`);
      }
    }
  } else {
    // Count before deletion
    const { count: countBefore } = await supabase
      .from('workout_plan_exercises')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', '1970-01-01');
    
    const { error } = await supabase
      .from('workout_plan_exercises')
      .delete()
      .gte('created_at', '1970-01-01');
    
    if (error) {
      log(`❌ Error deleting workout_plan_exercises: ${error.message}`);
      log(`   Code: ${error.code}, Details: ${error.details || 'N/A'}`);
    } else {
      log(`   Deleted ${countBefore || 0} workout_plan_exercises`);
    }
  }
}

/**
 * Cleans up test data from the database
 * 
 * Deletes data in the correct order to respect foreign key constraints:
 * 1. workout_session_sets
 * 2. workout_session_exercises
 * 3. personal_records
 * 4. workout_sessions
 * 5. workout_plan_exercises
 * 6. ai_requests
 * 7. workout_plans
 * 8. exercises
 * 9. ai_usage
 * 
 * @param options - Teardown options
 * @returns Promise that resolves when cleanup is complete
 */
export async function teardownDatabase(options: TeardownOptions = {}): Promise<void> {
  const { userId, verbose = false } = options;
  const supabase = createTestSupabaseClient();

  const log = (message: string) => {
    if (verbose) {
      console.log(`[DB Teardown] ${message}`);
    }
  };

  try {
    const userContext = userId ? ` for user ${userId}` : ' (all users)';
    log(`Starting database teardown${userContext}`);

    // 1. Delete workout_session_sets (via workout_session_exercises)
    log('Deleting workout_session_sets...');
    await deleteWorkoutSessionSets(supabase, userId, log);
    log('✓ workout_session_sets deleted');

    // 2. Delete workout_session_exercises
    log('Deleting workout_session_exercises...');
    await deleteWorkoutSessionExercises(supabase, userId, log);
    log('✓ workout_session_exercises deleted');

    // 3. Delete personal_records
    log('Deleting personal_records...');
    await deleteFromTable(supabase, 'personal_records', userId, log);
    log('✓ personal_records deleted');

    // 4. Delete workout_sessions
    log('Deleting workout_sessions...');
    if (userId) {
      // Count before deletion
      const { count: countBefore } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      const { error } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        log(`❌ Error deleting workout_sessions: ${error.message}`);
        log(`   Code: ${error.code}, Details: ${error.details || 'N/A'}`);
      } else {
        log(`   Deleted ${countBefore || 0} workout_sessions`);
      }
    } else {
      // Count before deletion
      const { count: countBefore } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', '1970-01-01');
      
      const { error } = await supabase
        .from('workout_sessions')
        .delete()
        .gte('started_at', '1970-01-01');
      
      if (error) {
        log(`❌ Error deleting workout_sessions: ${error.message}`);
        log(`   Code: ${error.code}, Details: ${error.details || 'N/A'}`);
      } else {
        log(`   Deleted ${countBefore || 0} workout_sessions`);
      }
    }
    log('✓ workout_sessions deleted');

    // 5. Delete workout_plan_exercises
    log('Deleting workout_plan_exercises...');
    await deleteWorkoutPlanExercises(supabase, userId, log);
    log('✓ workout_plan_exercises deleted');

    // 6. Delete ai_requests
    log('Deleting ai_requests...');
    await deleteFromTable(supabase, 'ai_requests', userId, log);
    log('✓ ai_requests deleted');

    // 7. Delete workout_plans
    log('Deleting workout_plans...');
    await deleteFromTable(supabase, 'workout_plans', userId, log);
    log('✓ workout_plans deleted');

    // 8. Delete exercises
    log('Deleting exercises...');
    await deleteFromTable(supabase, 'exercises', userId, log);
    log('✓ exercises deleted');

    // 9. Delete ai_usage
    log('Deleting ai_usage...');
    await deleteFromTable(supabase, 'ai_usage', userId, log);
    log('✓ ai_usage deleted');

    log('Database teardown completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error during database teardown: ${errorMessage}`);
    throw new Error(`Database teardown failed: ${errorMessage}`);
  }
}

/**
 * Cleans up test data for a specific user
 * 
 * @param userId - User ID to clean up data for
 * @param verbose - Whether to log cleanup operations
 * @returns Promise that resolves when cleanup is complete
 */
export async function teardownUserData(userId: string, verbose = false): Promise<void> {
  return teardownDatabase({ userId, verbose });
}

/**
 * Cleans up all test data from the database
 * 
 * WARNING: This will delete ALL data in the test database.
 * Use with caution and only in test environments.
 * 
 * @param verbose - Whether to log cleanup operations
 * @returns Promise that resolves when cleanup is complete
 */
export async function teardownAllData(verbose = false): Promise<void> {
  return teardownDatabase({ verbose });
}
