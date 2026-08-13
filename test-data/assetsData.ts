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
    exact: 'AST-0084', // should return exactly one row
    numericFragment: '0084',
  },
  bySerialNumber: {
    exact: 'PC1WXQLL', // should return exactly one row
    mixedCaseOfExact: 'pc1wxqll',
    alphaNumeric: 'S9NRKD01536939D',
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

/** Status filter dropdown option labels, as seen in the UI. */
export const statusOptions = {
  all: 'All Status',
  available: 'Available',
  assigned: 'Assigned',
  maintenance: 'Maintenance',
};

/** Type filter dropdown option labels, as seen in the UI. */
export const typeOptions = {
  all: 'All Types',
  laptop: 'Laptop',
  monitor: 'Monitor',
  keyboard: 'Keyboard',
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
  expectedAssetCodes: ['AST-0072', 'AST-0017', 'AST-0016'],
  expectedCount: 3,
};