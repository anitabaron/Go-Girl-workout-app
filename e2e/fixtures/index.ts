/**
 * Fixtures exports
 * 
 * Centralized export point for all test fixtures
 */
export {
  authenticateUser,
  logout,
  isAuthenticated,
  getTestUserCredentials,
  getAuthCookies,
  setAuthCookies,
  type TestUserCredentials,
} from './auth';

export {
  teardownDatabase,
  teardownUserData,
  teardownAllData,
  type TeardownOptions,
} from './db-teardown';
