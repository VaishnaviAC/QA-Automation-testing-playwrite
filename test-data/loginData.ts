/// <reference types="node" />
/**
 * Test data specific to the Login page (used by tests/login.spec.ts).
 *
 * Credentials are pulled from environment variables (via a .env file)
 * when available, falling back to the known values otherwise — see the
 * "NOTE" below for how to wire up a real .env file.
 *
 * NOTE: For process.env.ADMIN_EMAIL / process.env.ADMIN_PASSWORD to
 * actually pick up real values instead of the fallback, you need to:
 *   1. Create a .env file in the project root with:
 *        ADMIN_EMAIL=vaishnavi.patil@accurateic.in
 *        ADMIN_PASSWORD=Password@123
 *   2. Install dotenv: npm install dotenv --save-dev
 *   3. Load it at the top of playwright.config.ts:
 *        import 'dotenv/config';
 * Until then, the fallback values below are used, so tests keep working
 * exactly as before.
 */

export const loginData = {
  // Valid credentials for a successful login
  validUser: {
    email: process.env.ADMIN_EMAIL ?? 'vaishnavi.patil@accurateic.in',
    password: process.env.ADMIN_PASSWORD ?? 'Password@123',
  },

  // Deliberately invalid inputs, used in the negative login test cases
  invalidUser: {
    wrongPassword: 'wrong@123',
    malformedEmail: 'abcde',
  },

  // Exact error message text the app shows — used to assert against
  errorMessages: {
    incorrectPassword: 'Incorrect password',
    invalidEmailFormat: 'Enter a valid email address',
  },

  // Success toast/message shown briefly after a successful login
  successMessage: 'Login successful',
};