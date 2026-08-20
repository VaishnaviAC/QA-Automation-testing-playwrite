/**
 * Test data for the Assignments module.
 * Search terms below are taken from an actual recorded search session
 * against the app (Employee Name, Asset Name, Serial Number) plus a couple
 * of inferred/estimated values flagged below — confirm those against real
 * data before relying on them for exact-match assertions.
 */

export const searchTerms = {
  employeeName: 'Ashish Goswami',
  // Matches a real row's Asset Code (AST-0066) seen in the recorded session.
  assetCodePartial: '0066',
  // A 5-digit Employee ID pattern (e.g. 15468, 15419) - this exact value
  // wasn't confirmed against a real row, only the ID *format*. Swap in a
  // real Employee ID from your data if this doesn't match anything.
  employeeId: '15445',
  assetNamePartial: 'dell mtr',
  serialNumber: 'GVR2634',
  nonExistent: 'ZZZ_NoSuchRecord_999',
  specialChars: '@#$%^&*',
  leadingTrailingSpaces: '  dell mtr  ',
};

/** Number of assets to select for the multi-select assets dropdown test. */
export const multiSelectAssetCount = 2;

export const remarksText = 'Automated QA test assignment - safe to return';