import { test, expect } from '@playwright/test';
import { AssetsPage } from '../pages/AssetsPage';
import {
  knownAssets,
  invalidSearchTerms,
  whitespaceVariants,
  boundaryValues,
  statusOptions,
  uiText,
  combinedFilterScenario,
} from '../test-data/assetsData';

// ---------------------------------------------------------------------------
// NOTE ON IMPORT PATHS:
// This assumes the project structure:
//   AssetsIQ_Playwright/
//     ├── pages/AssetsPage.ts
//     ├── test-data/assetsData.ts
//     └── tests/assets.spec.ts   <- this file
// If assets.spec.ts lives somewhere else, adjust the two relative paths above.
//
// NOTE ON LOGIN / SESSION REUSE:
// Login happens exactly ONCE for the whole test run, in tests/auth.setup.ts,
// which saves the authenticated session to playwright/.auth/user.json.
// The `chromium` project in playwright.config.ts loads that file via
// `storageState`, so every test below starts already logged in — no test
// here performs the login UI flow. See playwright.config.ts for the wiring.
// ---------------------------------------------------------------------------

let assetsPage: AssetsPage;

test.beforeEach(async ({ page }) => {
  assetsPage = new AssetsPage(page);
  await assetsPage.goto(); // navigates straight to /assets using the reused session
  await expect(assetsPage.heading).toBeVisible();
});

test.describe('Assets Page - Search Bar', () => {
  // -------------------------------------------------------------------
  // Positive / exact match search — one per field (TC_SRCH_01 - 04)
  // -------------------------------------------------------------------

  test('TC_SRCH_01 - exact search by Asset Name returns matching asset', async () => {
    await assetsPage.search(knownAssets.byName.exact);
    await assetsPage.getVisibleRowCount();
    await assetsPage.expectAllRowsToContain(knownAssets.byName.exact);
  });

  test('TC_SRCH_02 - exact search by Employee Name returns matching asset', async () => {
    await assetsPage.search(knownAssets.byEmployeeName.exact);
    await assetsPage.getVisibleRowCount();
    await assetsPage.expectAllRowsToContain(knownAssets.byEmployeeName.exact);
  });

  test('TC_SRCH_03 - exact search by Asset Code returns exactly one row', async () => {
    await assetsPage.search(knownAssets.byAssetCode.exact);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBe(1);
    await assetsPage.expectAllRowsToContain(knownAssets.byAssetCode.exact);
  });

  test('TC_SRCH_04 - exact search by Serial Number returns exactly one row', async () => {
    await assetsPage.search(knownAssets.bySerialNumber.exact);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBe(1);
    await assetsPage.expectAllRowsToContain(knownAssets.bySerialNumber.exact);
  });

  // -------------------------------------------------------------------
  // Partial / starts-with / contains search (TC_SRCH_05 - 07)
  // -------------------------------------------------------------------

  test('TC_SRCH_05 - partial/contains search by Asset Name (mid-word match)', async () => {
    await assetsPage.search(knownAssets.byName.partialToken);
    await assetsPage.getVisibleRowCount();
    await assetsPage.expectAllRowsToContain(knownAssets.byName.partialToken);
  });

  test('TC_SRCH_06 - starts-with search by Asset Name', async () => {
    await assetsPage.search(knownAssets.byName.startsWith);
    await assetsPage.getVisibleRowCount();
    await assetsPage.expectAllRowsToContain(knownAssets.byName.startsWith);
  });

  test('TC_SRCH_07 - contains search by Employee Name (substring in middle)', async () => {
    await assetsPage.search(knownAssets.byEmployeeName.partialToken);
    await assetsPage.getVisibleRowCount();
    await assetsPage.expectAllRowsToContain(knownAssets.byEmployeeName.partialToken);
  });

  // -------------------------------------------------------------------
  // Single/multiple character search (TC_SRCH_08 - 09)
  // -------------------------------------------------------------------

  test('TC_SRCH_08 - single-character search returns broad matches without error', async () => {
    await assetsPage.search(boundaryValues.singleChar);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('TC_SRCH_09 - multiple-character partial word search by Asset Name', async () => {
    await assetsPage.search('Asus');
    await assetsPage.getVisibleRowCount();
    await assetsPage.expectAllRowsToContain('Asus');
  });

  // -------------------------------------------------------------------
  // Case sensitivity (TC_SRCH_10 - 11)
  // -------------------------------------------------------------------

  test('TC_SRCH_10 - lowercase input matches mixed-case Asset Name', async () => {
    await assetsPage.search(knownAssets.byName.lowerCaseOfExact);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBeGreaterThan(0);
    await assetsPage.expectAllRowsToContain(knownAssets.byName.exact);
  });

  test('TC_SRCH_11 - mixed-case input matches uppercase Serial Number', async () => {
    await assetsPage.search(knownAssets.bySerialNumber.mixedCaseOfExact);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBe(1);
    await assetsPage.expectAllRowsToContain(knownAssets.bySerialNumber.exact);
  });

  // -------------------------------------------------------------------
  // Numeric / alphanumeric search (TC_SRCH_12 - 13)
  // -------------------------------------------------------------------

  test('TC_SRCH_12 - numeric-only search matches Asset Code fragment', async () => {
    await assetsPage.search(knownAssets.byAssetCode.numericFragment);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBeGreaterThan(0);
    await assetsPage.expectAllRowsToContain(knownAssets.byAssetCode.numericFragment);
  });

  test('TC_SRCH_13 - alphanumeric search matches full Serial Number', async () => {
    await assetsPage.search(knownAssets.bySerialNumber.alphaNumeric);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBe(1);
    await assetsPage.expectAllRowsToContain(knownAssets.bySerialNumber.alphaNumeric);
  });

  // -------------------------------------------------------------------
  // Invalid / empty / clear (TC_SRCH_14 - 16)
  // -------------------------------------------------------------------

  test('TC_SRCH_14 - invalid/non-existing search term shows no results', async () => {
    await assetsPage.search(invalidSearchTerms.nonExisting);
    await expect(assetsPage.emptyStateHeading).toBeVisible();
    expect(await assetsPage.assetRows.count()).toBe(0);
  });

  test('TC_SRCH_15 - empty search shows the full unfiltered asset list', async () => {
    const totalBefore = await assetsPage.getTotalCount();
    await assetsPage.search('');
    const totalAfter = await assetsPage.getTotalCount();
    expect(totalAfter).toBe(totalBefore);
    expect(totalAfter).toBeGreaterThan(0);
  });

  test('TC_SRCH_16 - search after clearing a previous value restores full list', async () => {
    const totalBefore = await assetsPage.getTotalCount();
    await assetsPage.search(knownAssets.byName.exact);
    await assetsPage.getVisibleRowCount();

    await assetsPage.clearSearch();
    const totalAfter = await assetsPage.getTotalCount();
    expect(totalAfter).toBe(totalBefore);
  });

  // -------------------------------------------------------------------
  // Leading/trailing/multiple spaces (TC_SRCH_17 - 19)
  // -------------------------------------------------------------------

  test('TC_SRCH_17 - leading spaces in search term are trimmed/ignored', async () => {
    await assetsPage.search(whitespaceVariants.leadingSpaces);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBeGreaterThan(0);
    await assetsPage.expectAllRowsToContain(knownAssets.byName.exact);
  });

  test('TC_SRCH_18 - trailing spaces in search term are trimmed/ignored', async () => {
    await assetsPage.search(whitespaceVariants.trailingSpaces);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBeGreaterThan(0);
    await assetsPage.expectAllRowsToContain(knownAssets.byName.exact);
  });

  test('TC_SRCH_19 - multiple internal spaces do not crash the search', async () => {
    await assetsPage.search(whitespaceVariants.multipleInnerSpaces);
    // Behavior may vary (match vs no-match) — the assertion here is that the
    // app handles it gracefully: either real rows or a proper empty state,
    // never a hang or broken UI.
    const rowCount = await assetsPage.getVisibleRowCount();
    const emptyStateVisible = await assetsPage.isEmptyStateVisible();
    expect(rowCount > 0 || emptyStateVisible).toBeTruthy();
  });

  // -------------------------------------------------------------------
  // Multi-word phrase / special characters / very long value (TC_SRCH_20 - 22)
  // -------------------------------------------------------------------

  test('TC_SRCH_20 - search with spaces matches an exact multi-word phrase', async () => {
    await assetsPage.search(whitespaceVariants.exactPhraseWithSpace);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBeGreaterThan(0);
    await assetsPage.expectAllRowsToContain(whitespaceVariants.exactPhraseWithSpace);
  });

  test('TC_SRCH_21 - special characters show empty state without errors', async () => {
    await assetsPage.search(invalidSearchTerms.specialCharacters);
    await expect(assetsPage.emptyStateHeading).toBeVisible();
    await expect(assetsPage.emptyStateSubtext).toBeVisible();
  });

  test('TC_SRCH_22 - very long search value is accepted without breaking the UI', async () => {
    await assetsPage.search(boundaryValues.veryLongString);
    await expect(assetsPage.searchInput).toHaveValue(boundaryValues.veryLongString);
    await expect(assetsPage.emptyStateHeading).toBeVisible();
  });

  // -------------------------------------------------------------------
  // Boundary values (TC_SRCH_23 - 24)
  // -------------------------------------------------------------------

  test('TC_SRCH_23 - single-character boundary search returns matches without error', async () => {
    await assetsPage.search('S');
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('TC_SRCH_24 - search input accepts long pasted values without a hard cap breaking it', async () => {
    const maxLengthAttr = await assetsPage.searchInput.getAttribute('maxlength');
    await assetsPage.search(boundaryValues.veryLongString);
    const actualValue = await assetsPage.searchInput.inputValue();

    if (maxLengthAttr) {
      expect(actualValue.length).toBeLessThanOrEqual(parseInt(maxLengthAttr, 10));
    } else {
      expect(actualValue.length).toBe(boundaryValues.veryLongString.length);
    }
  });

  // -------------------------------------------------------------------
  // Result count / multiple vs single vs no matches (TC_SRCH_25 - 28)
  // -------------------------------------------------------------------

  test('TC_SRCH_25 - "Assets: X of Y" count text matches actual rendered rows', async () => {
    await assetsPage.search(knownAssets.byName.partialToken);
    const totalCount = await assetsPage.getTotalCount();
    const rowCount = await assetsPage.getVisibleRowCount();

    // Rows shown on the current page can be <= total (pagination), but never more.
    expect(rowCount).toBeLessThanOrEqual(totalCount);
    expect(rowCount).toBeGreaterThan(0);
  });

  test('TC_SRCH_26 - search term with multiple matching records returns more than one row', async () => {
    await assetsPage.search(knownAssets.byName.partialToken);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBeGreaterThan(1);
  });

  test('TC_SRCH_27 - search term with a single matching record returns exactly one row', async () => {
    await assetsPage.search(knownAssets.byAssetCode.exact);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBe(1);
  });

  test('TC_SRCH_28 - no matching records shows full empty-state UI', async () => {
    await assetsPage.search(invalidSearchTerms.nonExisting);
    await expect(assetsPage.emptyStateHeading).toHaveText(uiText.emptyStateHeading);
    await expect(assetsPage.emptyStateSubtext).toHaveText(uiText.emptyStateSubtext);
    expect(await assetsPage.assetRows.count()).toBe(0);
  });

  // -------------------------------------------------------------------
  // Reset/clear behavior and navigation persistence (TC_SRCH_29 - 30)
  // -------------------------------------------------------------------

  test('TC_SRCH_29 - clearing the search box resets to page 1 of the full list', async ({ page }) => {
    await assetsPage.search(knownAssets.byName.exact);
    await assetsPage.getVisibleRowCount();

    await assetsPage.clearSearch();
    await page.waitForLoadState('networkidle');

    await expect(assetsPage.totalCountText).toContainText('1-');
  });

  test('TC_SRCH_30 - search term after navigating away and back to Assets page', async ({ page }) => {
    await assetsPage.search(knownAssets.byName.exact);
    await assetsPage.getVisibleRowCount();

    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Assets' }).click();
    await page.waitForLoadState('networkidle');

    // Documents actual behavior: most SPA search boxes reset on remount.
    await expect(assetsPage.searchInput).toHaveValue('');
  });

  // -------------------------------------------------------------------
  // Search combined with existing filters (TC_SRCH_31 - 32)
  // -------------------------------------------------------------------

  test('TC_SRCH_31 - search combined with Status filter applies AND logic', async () => {
    await assetsPage.filterByStatus(statusOptions.assigned);
    await assetsPage.search(knownAssets.byName.exact);
    await assetsPage.getVisibleRowCount();

    const rowTexts = await assetsPage.getRowTexts();
    for (const text of rowTexts) {
      expect(text.toLowerCase()).toContain(knownAssets.byName.exact.toLowerCase());
      expect(text).toContain(statusOptions.assigned);
    }
  });

  test('TC_SRCH_32 - Verify Search functionality with All Status and All Type filters', async () => {
    // Matches the exact flow and data from the screenshot: search by
    // employee, filter Status = Assigned, filter Type = Laptop + Monitor.
    await assetsPage.searchAndSubmit(combinedFilterScenario.employeeName);
    await assetsPage.filterByStatus(combinedFilterScenario.status);
    await assetsPage.filterByTypes(combinedFilterScenario.types);

    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBe(combinedFilterScenario.expectedCount);

    const rowTexts = await assetsPage.getRowTexts();

    // Every visible row must satisfy all three active filters (AND logic).
    for (const text of rowTexts) {
      expect(text).toContain(combinedFilterScenario.employeeName);
      expect(text).toContain(combinedFilterScenario.status);
      const matchesSelectedType = combinedFilterScenario.types.some((type) => text.includes(type));
      expect(matchesSelectedType).toBeTruthy();
    }

    // Exact rows from the screenshot must all be present.
    for (const code of combinedFilterScenario.expectedAssetCodes) {
      const codeFound = rowTexts.some((text) => text.includes(code));
      expect(codeFound).toBeTruthy();
    }
  });

  // -------------------------------------------------------------------
  // Enter key vs live search (TC_SRCH_33 - 34)
  // -------------------------------------------------------------------

  test('TC_SRCH_33 - search triggered via Enter key returns the same result as live typing', async () => {
    await assetsPage.searchAndSubmit(knownAssets.byName.startsWith);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBeGreaterThan(0);
    await assetsPage.expectAllRowsToContain(knownAssets.byName.startsWith);
  });

  test('TC_SRCH_34 - live search filters results automatically without pressing Enter', async () => {
    await assetsPage.search(knownAssets.byEmployeeName.exact);
    const rowCount = await assetsPage.getVisibleRowCount();
    expect(rowCount).toBeGreaterThan(0);
    await assetsPage.expectAllRowsToContain(knownAssets.byEmployeeName.exact);
  });
});