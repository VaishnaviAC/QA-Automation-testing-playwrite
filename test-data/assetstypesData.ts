/**
 * Test data for the Asset Types module.
 * Keep all reusable values, expected lists, and data generators here so
 * assetstype.spec.ts stays free of hard-coded literals.
 */

/** The 9 Asset Types expected to exist as seed/default data. */
export const expectedAssetTypes = [
  'Laptop',
  'Monitor',
  'Mobile phone',
  'Mouse',
  'Keyboard',
  'Other Peripheral',
  'Combo',
  'PenDrive',
  'SimCard',
];

export const EXPECTED_ASSET_TYPE_COUNT = 9;

/**
 * Generates a unique Asset Type name for a test run, so parallel tests
 * (and repeated runs) never collide with each other or with seed data.
 */
export function uniqueTypeName(prefix = 'QA_Type'): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export const assetTypeTestData = {
  valid: {
    description: 'Automated QA test asset type - safe to delete',
  },
  duplicate: 'Laptop', // an existing seed type name, for duplicate-name checks
  onlySpaces: '   ',
  numeric: '12345',
  specialChars: '@#$%^&*()!',
  veryLong: 'A'.repeat(300),
  minLength: 'A',
};

export const customField = {
  label: 'Operating System',
  type: 'Text',
};