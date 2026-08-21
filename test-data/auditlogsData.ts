/**
 * Static test data for the Audit Logs automated test suite.
 * Keeping this separate from the spec file makes it easy to update
 * expected values (e.g. actor names, filter labels, credentials) in one place.
 */

// NOTE: login/credentials are NOT defined here — they live in environment
// variables (ASSETIQ_EMAIL / ASSETIQ_PASSWORD) consumed by `auth.setup.ts`,
// which runs ONCE for the whole run via a Playwright "setup" project and
// saves a `storageState`. Every spec (including this one) inherits that
// authenticated session automatically; see AuditLogsPage.goto().

export const DEFAULT_FILTER_LABEL = 'All Actions';

/**
 * All options in the filter dropdown, in the order they appear on screen.
 * These are the Title-Case labels shown on the dropdown TRIGGER once selected
 * (e.g. the button reads "Assign" after selecting it). The dropdown's
 * LIST ITEMS render the same values in lowercase due to a CSS text-transform,
 * which is why AuditLogsPage.selectFilter() lowercases before matching —
 * confirmed against a real recorded trace (getByRole('button', { name: 'assign', exact: true })).
 *
 * IMPORTANT (confirmed by a real test run): the table's own "Action" CELL
 * text also renders lowercase (e.g. "assign", not "Assign") even though the
 * dropdown trigger shows Title Case once selected. Only the trigger label is
 * Title-Case — table cell comparisons must be done case-insensitively.
 */
export const FILTER_OPTIONS = [
  'All Actions',
  'Assign',
  'Assigned',
  'Create',
  'Import',
  'Login',
  'Logout',
  'Retired',
  'Returned',
] as const;

/** Filter options excluding the default "All Actions" — i.e. the ones that should narrow results. */
export const SPECIFIC_FILTER_OPTIONS = FILTER_OPTIONS.filter(
  (f) => f !== DEFAULT_FILTER_LABEL
);

/** On-screen table column headers, left to right. */
export const TABLE_COLUMN_HEADERS = [
  'Time',
  'Actor',
  'Role',
  'Action',
  'Entity',
  'Description',
] as const;

/**
 * Column headers as they appear in the EXPORTED .xlsx file.
 * CONFIRMED DIFFERENT FROM THE ON-SCREEN TABLE by a real downloaded file:
 * the export omits the "Role" column entirely. Order: Time, Actor, Action,
 * Entity, Description. Also note the exported "Time" cell uses a full
 * locale datetime string (e.g. "8/20/2026, 10:44:59 AM"), not the
 * on-screen relative format (e.g. "Aug 20, 16:14") — the two should never
 * be asserted equal to each other.
 */
export const EXPORT_COLUMN_HEADERS = ['Time', 'Actor', 'Action', 'Entity', 'Description'] as const;

export const PAGE_SIZE = 12;

/** Known actor seen consistently in the current data set. */
export const KNOWN_ACTOR_NAME = 'Vaishnavi Patil';
export const KNOWN_ROLE = 'Admin';

/** Substring of the search box's accessible name / placeholder — confirmed via recorded trace. */
export const SEARCH_PLACEHOLDER_SUBSTRING = 'Search by Action, Entity,';

/**
 * Search test cases: one representative case per field the search bar
 * is documented to support. `expectedColumn` is the column every
 * resulting row should be checked against.
 */
export interface SearchTestCase {
  id: string;
  fieldLabel: 'Action' | 'Entity' | 'Description' | 'Employee Name' | 'Role';
  term: string;
  expectedColumn: 'action' | 'entity' | 'description' | 'actor' | 'role';
}

export const SEARCH_TEST_CASES: SearchTestCase[] = [
  { id: 'SR-01', fieldLabel: 'Action', term: 'login', expectedColumn: 'action' },
  { id: 'SR-02', fieldLabel: 'Entity', term: 'auth', expectedColumn: 'entity' },
  { id: 'SR-03', fieldLabel: 'Description', term: 'returned by', expectedColumn: 'description' },
  { id: 'SR-04', fieldLabel: 'Employee Name', term: KNOWN_ACTOR_NAME, expectedColumn: 'actor' },
  { id: 'SR-05', fieldLabel: 'Role', term: KNOWN_ROLE, expectedColumn: 'role' },
];

/** Extra action-keyword search terms confirmed against a real recorded trace. */
export const ACTION_KEYWORD_SEARCH_TERMS = [
  'assigned',
  'login',
  'logout',
  'import',
  'returned',
  'retire',
] as const;

export const NO_MATCH_SEARCH_TERM = 'zzzzz-does-not-exist-123';

export const EXPECTED_EXPORT_FILE_EXTENSION = '.xlsx';