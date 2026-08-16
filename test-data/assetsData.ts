/**
 * Centralized test data for AssetIQ - Assets Page automation.
 *
 * Kept separate from the spec file so that:
 *  - Test data can be reused across multiple spec files (Search, Filters,
 *    CRUD, Pagination, etc.) as new features are automated.
 *  - Values can be updated in one place if the underlying seed/demo data
 *    in the app changes, without touching test logic.
 *
 * NOTE: Wherever possible, tests avoid asserting on hardcoded absolute
 * record counts (e.g. "Assets: 1-12 of 84") since seed data can grow/shrink
 * over time (e.g. other suites creating "Automation Test Asset ..." rows,
 * as seen in the app). Instead, tests validate relative/behavioral outcomes
 * (row count > 0, every visible row contains the search term, empty state
 * shown, etc.). Only a few values below are used for exact-match assertions
 * because they correspond to fields that should be unique (Asset Code,
 * Serial Number).
 */

export const loginCredentials = {
  email: 'admin@accurateic.in',
  password: '12345',
};

export const baseUrl = 'http://192.168.10.63:4030';

/**
 * Known-good, currently-seeded records (from the app as observed).
 * Used for positive / exact / partial / case-insensitive search scenarios.
 * If your seed data changes, update these values.
 */
export const knownAssets = {
  byName: {
    exact: 'Dell MTR',
    partialToken: 'Think', // matches "ThinkPad-T14s-Gen-1", "ThinkPad-L14-Gen-3"
    startsWith: '12th', // matches "12th Gen Thinkpad i7 1215U"
    lowerCaseOfExact: 'dell mtr', // for case-insensitivity check against "Dell MTR"
  },
  byEmployeeName: {
    exact: 'Ravi Jagtap',
    partialToken: 'hre', // matches "Shreyas Dhabikar"
  },
  byAssetCode: {
    exact: 'AST-0034', // should return exactly one row
    numericFragment: '0034',
  },
  bySerialNumber: {
    exact: 'PC1WXQLL', // should return exactly one row
    mixedCaseOfExact: 'pc1wxqll',
    alphaNumeric: 'R6NRKD02067324E',
  },
};

/** Search terms that should always return zero results. */
export const invalidSearchTerms = {
  nonExisting: 'XYZ12345NOTFOUND',
  specialCharacters: '!@#@#$$@',
};

/** Whitespace-variant search terms, all logically equivalent to "Dell MTR". */
export const whitespaceVariants = {
  leadingSpaces: '   Dell MTR',
  trailingSpaces: 'Dell MTR   ',
  multipleInnerSpaces: 'Dell     MTR',
  exactPhraseWithSpace: 'Dell MTR',
};

/** Boundary / stress-test values. */
export const boundaryValues = {
  singleChar: 'a',
  veryLongString: 'A'.repeat(150),
};

/**
 * Status filter dropdown option labels, as seen in the UI when the
 * dropdown is OPEN (these are the clickable option buttons).
 * NOTE: 'all' here is the selectable option labeled "All" inside the
 * dropdown — this is different from statusFilterDefaultLabel below, which
 * is the trigger button's own default/reset display text ("All Status").
 */
export const statusOptions = {
  all: 'All',
  available: 'Available',
  assigned: 'Assigned',
  maintenance: 'Maintenance',
  retired: 'Retired',
};

/**
 * The status filter trigger button's default label, shown on initial page
 * load and restored after clicking "Clear". Confirmed via codegen/UI.
 */
export const statusFilterDefaultLabel = 'All Status';

/** All selectable status options, in dropdown order — used to iterate
 * every status in a single data-driven test rather than hardcoding one
 * status per test case. */
export const allStatusOptions = [
  statusOptions.all,
  statusOptions.available,
  statusOptions.assigned,
  statusOptions.maintenance,
  statusOptions.retired,
];

/**
 * Type filter dropdown option labels — the six checkboxes shown when the
 * dropdown is open. NOTE: unlike Status, Type has no "All" checkbox option;
 * the default "All Types" state is simply what shows when zero checkboxes
 * are selected (see typeFilterDefaultLabel below).
 */
export const typeOptions = {
  laptop: 'Laptop',
  monitor: 'Monitor',
  mobilePhone: 'Mobile phone',
  mouse: 'Mouse',
  keyboard: 'Keyboard',
  otherPeripheral: 'Other Peripheral',
};

/**
 * The type filter trigger button's default label, shown on initial page
 * load and whenever zero checkboxes are selected (including after Clear).
 */
export const typeFilterDefaultLabel = 'All Types';

/** All six selectable type options, in the order shown in the dropdown UI —
 * used to iterate every type in data-driven tests (e.g. selectAllTypes,
 * dropdown UI validation) instead of hardcoding each one per test case. */
export const allTypeOptions = [
  typeOptions.laptop,
  typeOptions.monitor,
  typeOptions.mobilePhone,
  typeOptions.mouse,
  typeOptions.keyboard,
  typeOptions.otherPeripheral,
];

/** Reusable multi-select combination for the "multiple type filter" and
 * "change an existing filter" scenarios. */
export const typeCombinations = {
  laptopAndMonitor: [typeOptions.laptop, typeOptions.monitor],
};

/** UI copy strings, used to assert the empty-state renders correctly. */
export const uiText = {
  emptyStateHeading: 'No assets found',
  emptyStateSubtext: 'Try another filter or add your first asset.',
  searchPlaceholder:
    'Search by Asset Name, Employee Name, Asset Code, or Serial Number',
};

/**
 * Exact combined-filter scenario captured from the app screenshot
 * (2026-08-13_12-38n2.png): Employee search "Mrunali Shinde" + Status
 * "Assigned" + Type "Laptop" & "Monitor" together returned exactly these
 * 3 rows. Used for TC_SRCH_32 to assert deterministic, exact results
 * instead of only relative checks.
 *
 * NOTE: like all image-derived data, this is a snapshot of the seed data
 * at the time the screenshot was taken. If Mrunali Shinde's assigned
 * assets change later, update expectedAssetCodes/expectedCount to match.
 */
export const combinedFilterScenario = {
  employeeName: 'Mrunali Shinde',
  status: statusOptions.assigned,
  types: [typeOptions.laptop, typeOptions.monitor],
  expectedAssetCodes: ['AST-0017', 'AST-0016'],
  expectedCount: 2,
};

// ---------------------------------------------------------------------------
// Import Assets feature
// ---------------------------------------------------------------------------

import * as path from 'path';

/**
 * Fixture file paths for the Import Assets tests. All three are generated
 * fixtures (not real production data) — see the accompanying README note
 * in assets.spec.ts for how they were built and what each one exercises.
 *
 * Resolved via path.join(__dirname, ...) rather than a plain relative
 * string, so these paths work correctly no matter what directory
 * `npx playwright test` is run from. Assumes a `fixtures/` folder at the
 * project root, as a sibling of `test-data/` and `tests/` — adjust the
 * `../fixtures` segment below if yours lives elsewhere.
 */
const fixturesDir = path.join(__dirname, '..', 'fixtures');

export const importFixtures = {
  /** A .xlsx with an unrecognized column schema (headers the app's import
   * validation won't match against any expected type-prefixed columns).
   * Deterministically triggers the "Import failed" state. */
  malformedData: path.join(fixturesDir, 'malformed-data.xlsx'),
  /** A completely empty .xlsx (no headers, no rows). */
  empty: path.join(fixturesDir, 'empty-file.xlsx'),
  /** Wrong file extension entirely — not a spreadsheet at all. */
  wrongExtension: path.join(fixturesDir, 'invalid-format.txt'),
};

/** Expected static copy inside the Import modal, for UI-text assertions. */
export const importModalText = {
  heading: 'Import Assets',
  fileTypeHint: 'Only .xlsx files are accepted',
  failureMessage: 'Import failed',
};