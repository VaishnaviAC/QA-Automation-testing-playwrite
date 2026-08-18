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
  email: 'vaishnavi.patil@accurateic.in',
  password: 'Password@123',
};

export const baseUrl = 'http://192.168.10.45:4030';

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

// ---------------------------------------------------------------------------
// Add Asset (Laptop) feature
// ---------------------------------------------------------------------------

/** Expected static copy on the Add Asset modal, for UI-text assertions. */
export const addAssetText = {
  heading: 'Add Asset',
};

/** Asset Type dropdown options, as seen in the "Select type..." dropdown. */
export const assetTypeOptions = {
  laptop: 'Laptop',
  monitor: 'Monitor',
  mobilePhone: 'Mobile phone',
  mouse: 'Mouse',
  keyboard: 'Keyboard',
  otherPeripheral: 'Other Peripheral',
};

/** Status dropdown options inside the Add Asset form. Same values as the
 * page-level Status filter, kept as a separate export since the form's
 * default ('Available', confirmed via screenshot) differs from the
 * filter's default ('All Status'). */
export const laptopFormStatusOptions = {
  available: 'Available',
  assigned: 'Assigned',
  maintenance: 'Maintenance',
  retired: 'Retired',
};

export const laptopFormStatusDefault = 'Available';

/** Condition dropdown options inside the Add Asset form. */
export const conditionOptions = {
  new: 'New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export const conditionDefault = 'Good';

/** Brand dropdown options inside the Laptop form's Custom Attributes
 * section (confirmed via codegen). */
export const brandOptions = {
  lenovo: 'Lenovo',
  hp: 'HP',
  dell: 'Dell',
  apple: 'Apple',
  asus: 'Asus',
  other: 'Other',
};

/**
 * Generates a unique Name + Serial Number pair for each Add Asset test run,
 * so re-running the suite never collides with a row a previous run already
 * created (Serial Number is expected to be unique — see TC_ADD_15). Built
 * on top of the exact valid values from the manual test data table, with a
 * timestamp suffix appended only to keep each run's row unique.
 */
export function generateUniqueLaptopAsset() {
  const stamp = Date.now();
  return {
    name: `Dell Latitude 5420 ${stamp}`,
    serialNumber: `AST-LAP-2026-${stamp}`,
  };
}

/**
 * The exact valid Laptop form data, as supplied by the manual test data
 * table (common + asset-specific fields). NOTE: `location` is kept here
 * for documentation purposes only — the real app renders Location as a
 * read-only, system-populated field (confirmed via a real test run; see
 * AssetsPage.ts fillLaptopForm()/verifyLocationIsReadonly()), so it is
 * never actually filled by fillLaptopForm().
 */
export const laptopValidData = {
  name: 'Dell Latitude 5420',
  serialNumber: 'AST-LAP-2026-001',
  status: laptopFormStatusOptions.available,
  condition: conditionOptions.new,
  location: 'Pune Office',
  purchaseDate: '2026-08-10',
  warrantyYears: '2',
  description: 'Company laptop for QA testing',
  brand: brandOptions.dell,
  cpu: 'Intel Core i5',
  gpu: 'Intel UHD Graphics',
  ramGb: '16',
  storageGb: '512',
  operatingSystem: 'Windows 11 Pro',
};

/** A full, valid set of Laptop form field values, built on top of a fresh
 * unique name/serial pair. Used for the "create successfully" happy-path
 * test and as a base object other tests can spread and override. */
export function buildValidLaptopFormData() {
  const { name, serialNumber } = generateUniqueLaptopAsset();
  return {
    ...laptopValidData,
    name,
    serialNumber,
  };
}

/**
 * The exact invalid values from the manual test data table, per field.
 * Fields with multiple listed invalid variants (e.g. "abc / @#$%") keep
 * all variants as an array so a test can iterate every one.
 */
export const laptopInvalidData = {
  name: '@#$%',
  serialNumber: '@@@###',
  location: '@#$', // documentation only — see laptopValidData note above
  purchaseDate: '32/13/2026',
  warrantyYears: '-1',
  descriptionBlank: '   ', // blank/whitespace-only
  brand: ['12345', '@#$%'],
  cpu: ['12345', '@#$%'],
  gpu: ['12345', '@#$%'],
  ramGb: ['-1', 'abc', '@#$%'],
  storageGb: ['-1', 'abc', '@#$%'],
  operatingSystem: ['12345', '@#$%'],
};

/** Boundary values not covered by the manual test data table above (kept
 * separate since they're stress/edge-case values rather than the table's
 * named "invalid data"). */
export const laptopFormBoundaryValues = {
  veryLongName: 'B'.repeat(150),
};