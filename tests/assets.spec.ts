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
  statusFilterDefaultLabel,
  allStatusOptions,
  typeOptions,
  typeFilterDefaultLabel,
  allTypeOptions,
  typeCombinations,
  importFixtures,
  importModalText,
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

// =============================================================================
// Assets Page - "All Status" Dropdown Filter
// =============================================================================
//
// Manual test cases covered (mapped 1:1 to automated tests below):
//
//   TC_STATUS_01 - Default state: trigger shows "All Status", full unfiltered
//                  list displayed on page load.
//   TC_STATUS_02 - Selecting "All" returns the same unfiltered full list as
//                  the default state.
//   TC_STATUS_03 - Selecting "Available" filters the table to only Available
//                  assets.
//   TC_STATUS_04 - Selecting "Assigned" filters the table to only Assigned
//                  assets.
//   TC_STATUS_05 - Selecting "Maintenance" filters the table to only
//                  Maintenance assets (or shows the empty state if none).
//   TC_STATUS_06 - Selecting "Retired" filters the table to only Retired
//                  assets (or shows the empty state if none).
//   TC_STATUS_07 - The "No assets found" empty-state message (heading +
//                  subtext) renders correctly whenever a status filter has
//                  zero matching assets.
//   TC_STATUS_08 - The "Assets: X of Y" result-count text stays accurate
//                  for every filtered status.
//   TC_STATUS_09 - Switching directly between two status filters (no Clear
//                  in between) replaces the previous filter rather than
//                  combining results from both.
//   TC_STATUS_10 - Clicking "Clear" resets the filter: trigger label reverts
//                  to "All Status" and the full list is restored.
//   TC_STATUS_11 - The dropdown menu closes automatically after selecting a
//                  status option.
//   TC_STATUS_12 - Applying a status filter resets pagination back to page 1.
//
// (Combining a status filter with an active search term is intentionally
// NOT repeated here — that AND-logic scenario is already covered by
// TC_SRCH_31, so re-testing it here would be a duplicate.)
// =============================================================================

test.describe('Assets Page - All Status Filter', () => {
  test('TC_STATUS_01 - default state shows "All Status" label and the full unfiltered list', async () => {
    await expect(assetsPage.statusFilterButton).toHaveText(statusFilterDefaultLabel);
    const totalCount = await assetsPage.getTotalCount();
    expect(totalCount).toBeGreaterThan(0);
  });

  test('TC_STATUS_02 - selecting "All" returns the same unfiltered full list as default', async () => {
    const baselineTotal = await assetsPage.getTotalCount();

    await assetsPage.filterByStatus(statusOptions.all);
    const totalAfterAll = await assetsPage.getTotalCount();

    expect(totalAfterAll).toBe(baselineTotal);
  });

  test('TC_STATUS_03 - selecting "Available" filters the table to only Available assets', async () => {
    await assetsPage.filterByStatus(statusOptions.available);
    const rowCount = await assetsPage.getVisibleRowCount();

    if (rowCount === 0) {
      await expect(assetsPage.emptyStateHeading).toBeVisible();
    } else {
      await assetsPage.expectAllRowsToContain(statusOptions.available);
    }
  });

  test('TC_STATUS_04 - selecting "Assigned" filters the table to only Assigned assets', async () => {
    await assetsPage.filterByStatus(statusOptions.assigned);
    const rowCount = await assetsPage.getVisibleRowCount();

    if (rowCount === 0) {
      await expect(assetsPage.emptyStateHeading).toBeVisible();
    } else {
      await assetsPage.expectAllRowsToContain(statusOptions.assigned);
    }
  });

  test('TC_STATUS_05 - selecting "Maintenance" filters the table to only Maintenance assets', async () => {
    await assetsPage.filterByStatus(statusOptions.maintenance);
    const rowCount = await assetsPage.getVisibleRowCount();

    if (rowCount === 0) {
      await expect(assetsPage.emptyStateHeading).toBeVisible();
    } else {
      await assetsPage.expectAllRowsToContain(statusOptions.maintenance);
    }
  });

  test('TC_STATUS_06 - selecting "Retired" filters the table to only Retired assets', async () => {
    await assetsPage.filterByStatus(statusOptions.retired);
    const rowCount = await assetsPage.getVisibleRowCount();

    if (rowCount === 0) {
      await expect(assetsPage.emptyStateHeading).toBeVisible();
    } else {
      await assetsPage.expectAllRowsToContain(statusOptions.retired);
    }
  });

  test('TC_STATUS_07 - empty-state validation message displays when a status filter has zero matching assets', async () => {
    // Data-driven rather than hardcoded: whichever status currently has zero
    // matches (seed data can change over time — e.g. Maintenance today,
    // Retired tomorrow), this test finds it and validates the full
    // empty-state UI against it.
    let foundEmptyStatus = false;

    for (const status of [
      statusOptions.available,
      statusOptions.assigned,
      statusOptions.maintenance,
      statusOptions.retired,
    ]) {
      await assetsPage.filterByStatus(status);
      const rowCount = await assetsPage.getVisibleRowCount();

      if (rowCount === 0) {
        foundEmptyStatus = true;
        await expect(assetsPage.emptyStateHeading).toHaveText(uiText.emptyStateHeading);
        await expect(assetsPage.emptyStateSubtext).toHaveText(uiText.emptyStateSubtext);
        break;
      }
    }

    test.skip(
      !foundEmptyStatus,
      'Every status currently has at least one matching asset — no empty-state scenario to validate in this run.',
    );
  });

  test('TC_STATUS_08 - "Assets: X of Y" result-count text stays accurate for every filtered status', async () => {
    for (const status of allStatusOptions) {
      await assetsPage.filterByStatus(status);

      const totalCount = await assetsPage.getTotalCount();
      const rowCount = await assetsPage.getVisibleRowCount();

      // Rows shown on the current page can be <= total (pagination), never more.
      expect(rowCount).toBeLessThanOrEqual(totalCount);
    }
  });

  test('TC_STATUS_09 - switching directly between two status filters replaces the previous filter', async () => {
    await assetsPage.filterByStatus(statusOptions.available);
    const availableRowCount = await assetsPage.getVisibleRowCount();
    if (availableRowCount > 0) {
      await assetsPage.expectAllRowsToContain(statusOptions.available);
    }

    // Switch directly to Assigned, without clearing first.
    await assetsPage.filterByStatus(statusOptions.assigned);
    const assignedRowCount = await assetsPage.getVisibleRowCount();

    if (assignedRowCount === 0) {
      await expect(assetsPage.emptyStateHeading).toBeVisible();
    } else {
      // Every visible row must now be Assigned — none of the previous
      // Available-only rows should have leaked through.
      await assetsPage.expectAllRowsToContain(statusOptions.assigned);
      const rowTexts = await assetsPage.getRowTexts();
      for (const text of rowTexts) {
        expect(text).not.toContain(statusOptions.available);
      }
    }
  });

  test('TC_STATUS_10 - clicking "Clear" resets the filter to "All Status" and restores the full list', async () => {
    const baselineTotal = await assetsPage.getTotalCount();

    await assetsPage.filterByStatus(statusOptions.assigned);
    await assetsPage.getVisibleRowCount();

    await assetsPage.clearStatusFilter();

    await expect(assetsPage.statusFilterButton).toHaveText(statusFilterDefaultLabel);
    const totalAfterClear = await assetsPage.getTotalCount();
    expect(totalAfterClear).toBe(baselineTotal);
  });

  test('TC_STATUS_11 - the dropdown menu closes automatically after selecting a status option', async () => {
    await assetsPage.filterByStatus(statusOptions.assigned);
    const dropdownStillOpen = await assetsPage.isStatusDropdownOpen();
    expect(dropdownStillOpen).toBe(false);
  });

  test('TC_STATUS_12 - applying a status filter resets pagination back to page 1', async ({ page }) => {
    await assetsPage.filterByStatus(statusOptions.assigned);
    await page.waitForLoadState('networkidle');

    // "Assets: 1-N of Y" confirms the view is back on the first page.
    await expect(assetsPage.totalCountText).toContainText('1-');
  });

  test('TC_STATUS_13 - empty-state message displays for a Search + Status combination with zero matches', async () => {
    // Distinct from TC_STATUS_07 (which tests a status filter alone with no
    // data): here, emptiness is driven by combining an impossible search
    // term with a valid status filter — a different trigger path for the
    // same message, exercised via the new reusable verifyEmptyStateMessage().
    await assetsPage.search(invalidSearchTerms.nonExisting);
    await assetsPage.filterByStatus(statusOptions.assigned);

    await assetsPage.getVisibleRowCount();
    await assetsPage.verifyEmptyStateMessage(uiText.emptyStateHeading, uiText.emptyStateSubtext);
  });
});

// =============================================================================
// Assets Page - "All Types" Dropdown Filter
// =============================================================================
//
// Manual test cases covered (mapped 1:1 to automated tests below):
//
//   TC_TYPE_01 - Dropdown UI validation: trigger visible with default label
//                "All Types"; opening it shows all 6 checkboxes plus Apply
//                and Clear.
//   TC_TYPE_02 - Clicking Apply with no checkboxes selected leaves the
//                filter unchanged (still "All Types", full list intact).
//   TC_TYPE_03 - Single type filter: table shows only the selected type.
//   TC_TYPE_04 - Multiple type filter: table shows only the selected types,
//                no unselected type leaks in.
//   TC_TYPE_05 - Selecting all six types returns the same result as the
//                unfiltered default (functionally equivalent to "All Types").
//   TC_TYPE_06 - Closing the dropdown without clicking Apply leaves the
//                filter and table unaffected.
//   TC_TYPE_07 - Changing an already-applied filter (uncheck one, check a
//                new one, Apply again) replaces the previous selection.
//   TC_TYPE_08 - Clicking Clear resets all checkboxes and the trigger label,
//                then a fresh type can be selected and applied.
//   TC_TYPE_09 - Search + Type filter combination applies AND logic.
//   TC_TYPE_10 - Reopening the dropdown after Apply shows the previously
//                selected checkboxes still checked.
//   TC_TYPE_11 - Applying a Type filter resets pagination back to page 1.
//
// (TC_TYPE_07 and TC_TYPE_08 are intentionally different *procedures* —
// modifying an existing selection vs. explicitly clearing first — per the
// two distinct edge cases requested, even though both end in "a different
// type is now applied.")
// =============================================================================

test.describe('Assets Page - All Types Filter', () => {
  test('TC_TYPE_01 - dropdown shows default label and all six type options with Apply/Clear', async () => {
    await assetsPage.verifyDefaultAllTypes(typeFilterDefaultLabel);

    await assetsPage.openAllTypesDropdown();
    for (const type of allTypeOptions) {
      await expect(assetsPage.page.locator('label').filter({ hasText: type })).toBeVisible();
    }
    await expect(assetsPage.typeApplyButton).toBeVisible();
    await expect(assetsPage.typeClearButton).toBeVisible();
  });

  test('TC_TYPE_02 - clicking Apply with no checkboxes selected leaves the list unfiltered', async () => {
    const baselineTotal = await assetsPage.getTotalCount();

    await assetsPage.openAllTypesDropdown();
    await assetsPage.clickApply();

    await assetsPage.verifyDefaultAllTypes(typeFilterDefaultLabel);
    const totalAfterApply = await assetsPage.getTotalCount();
    expect(totalAfterApply).toBe(baselineTotal);
  });

  test('TC_TYPE_03 - single type filter shows only that type in every row', async () => {
    await assetsPage.filterByType(typeOptions.laptop);
    await assetsPage.getVisibleRowCount();
    await assetsPage.verifyTableContainsOnlyTypes([typeOptions.laptop]);
  });

  test('TC_TYPE_04 - multiple type filter shows only the selected types, none other', async () => {
    await assetsPage.filterByTypes(typeCombinations.laptopAndMonitor);
    await assetsPage.getVisibleRowCount();
    await assetsPage.verifyTableContainsOnlyTypes(typeCombinations.laptopAndMonitor);
  });

  test('TC_TYPE_05 - selecting all six types returns the same result as the unfiltered default', async () => {
    const baselineTotal = await assetsPage.getTotalCount();

    await assetsPage.openAllTypesDropdown();
    await assetsPage.selectAllTypes();
    await assetsPage.clickApply();

    const totalAfterSelectAll = await assetsPage.getTotalCount();
    expect(totalAfterSelectAll).toBe(baselineTotal);
  });

  test('TC_TYPE_06 - closing the dropdown without Apply leaves the filter and table unaffected', async () => {
    const baselineTotal = await assetsPage.getTotalCount();

    await assetsPage.openAllTypesDropdown();
    await assetsPage.selectType(typeOptions.keyboard);
    await assetsPage.heading.click(); // click outside the dropdown to close it without applying

    await assetsPage.verifyDefaultAllTypes(typeFilterDefaultLabel);
    const totalAfterClose = await assetsPage.getTotalCount();
    expect(totalAfterClose).toBe(baselineTotal);
  });

  test('TC_TYPE_07 - changing an already-applied filter replaces the previous selection', async () => {
    await assetsPage.filterByType(typeOptions.laptop);
    await assetsPage.getVisibleRowCount();
    await assetsPage.verifyTableContainsOnlyTypes([typeOptions.laptop]);

    // Modify the existing selection: uncheck Laptop, check Keyboard, re-apply.
    await assetsPage.openAllTypesDropdown();
    await assetsPage.selectType(typeOptions.laptop); // toggles off
    await assetsPage.selectType(typeOptions.keyboard); // toggles on
    await assetsPage.clickApply();

    const rowCount = await assetsPage.getVisibleRowCount();
    if (rowCount > 0) {
      await assetsPage.verifyTableContainsOnlyTypes([typeOptions.keyboard]);
    } else {
      await expect(assetsPage.emptyStateHeading).toBeVisible();
    }
  });

  test('TC_TYPE_08 - Clear resets checkboxes, then a new type can be selected and applied', async () => {
    await assetsPage.filterByType(typeOptions.monitor);
    await assetsPage.getVisibleRowCount();

    await assetsPage.openAllTypesDropdown();
    await assetsPage.clickClear();

    // Clear only unchecks the in-progress checkboxes — it does NOT commit
    // the change by itself. The trigger label and table stay exactly as
    // they were (still reflecting the previously applied "Monitor" filter)
    // until Apply is explicitly clicked. Confirmed against real app
    // behavior — Clear is a "reset the form" action, not a "reset the
    // filter" action.
    await assetsPage.verifySelectedTypes([]);

    await assetsPage.clickApply();
    await assetsPage.verifyDefaultAllTypes(typeFilterDefaultLabel);

    await assetsPage.filterByType(typeOptions.mouse);
    const rowCount = await assetsPage.getVisibleRowCount();
    if (rowCount > 0) {
      await assetsPage.verifyTableContainsOnlyTypes([typeOptions.mouse]);
    } else {
      await expect(assetsPage.emptyStateHeading).toBeVisible();
    }
  });

  test('TC_TYPE_09 - Search combined with Type filter applies AND logic', async () => {
    await assetsPage.searchAndSubmit(knownAssets.byName.partialToken);
    await assetsPage.filterByType(typeOptions.laptop);

    const rowCount = await assetsPage.getVisibleRowCount();
    if (rowCount > 0) {
      const rowTexts = await assetsPage.getRowTexts();
      for (const text of rowTexts) {
        expect(text.toLowerCase()).toContain(knownAssets.byName.partialToken.toLowerCase());
      }
      await assetsPage.verifyTableContainsOnlyTypes([typeOptions.laptop]);
    } else {
      await expect(assetsPage.emptyStateHeading).toBeVisible();
    }
  });

  test('TC_TYPE_10 - reopening the dropdown after Apply shows the previously selected checkboxes', async () => {
    await assetsPage.filterByTypes(typeCombinations.laptopAndMonitor);
    await assetsPage.getVisibleRowCount();

    await assetsPage.openAllTypesDropdown();
    await assetsPage.verifySelectedTypes(typeCombinations.laptopAndMonitor);
  });

  test('TC_TYPE_11 - applying a Type filter resets pagination back to page 1', async () => {
    await assetsPage.filterByType(typeOptions.laptop);
    await assetsPage.getVisibleRowCount();

    await expect(assetsPage.totalCountText).toContainText('1-');
  });
});

// =============================================================================
// Assets Page - Import Assets Modal
// =============================================================================
//
// Fixture files used below (see test-data/assetsData.ts -> importFixtures):
//   - malformed-data.xlsx : valid .xlsx, but with headers that don't match
//     any expected type-prefixed column (e.g. "LaptopName"). Originally
//     intended to trigger a server-side "Import failed", but a real test
//     run proved the app validates headers CLIENT-SIDE first — this fixture
//     fails that check and Upload never becomes enabled (see TC_IMPORT_05/10
//     skip notes below).
//   - empty-file.xlsx     : a completely blank workbook (no headers, no rows).
//   - invalid-format.txt  : not a spreadsheet at all, for extension rejection.
// Place a `fixtures/` folder at the project root (sibling of tests/,
// pages/, test-data/) containing these three files.
//
// NOT AUTOMATED — intentionally excluded or currently skipped:
//   - "Successful import creates new asset rows." Automating this needs a
//     .xlsx that exactly matches the app's real expected schema (the modal
//     hints at per-type prefixed columns like LaptopName/LaptopBrand, but the
//     full column set for every asset type isn't known).
//   - TC_IMPORT_05 and TC_IMPORT_10 are currently test.skip()'d for the same
//     reason: both need a fixture that passes the app's confirmed client-side
//     header validation but fails server-side, which requires knowing the
//     real schema. Once you can share the actual downloaded template's
//     column headers (or a known-good sample file), these are straightforward
//     to un-skip and fix (and to add a genuine "successful import" test as
//     TC_IMPORT_11).
//
// Manual test cases covered (mapped 1:1 to automated tests below):
//   TC_IMPORT_01 - Import modal opens with correct heading and instructional text.
//   TC_IMPORT_02 - "Download Template" triggers a .xlsx file download.
//   TC_IMPORT_03 - The file-select drop-zone and its "Only .xlsx files are
//                  accepted" hint are visible.
//   TC_IMPORT_04 - Selecting a non-.xlsx file does not enable a successful upload.
//   TC_IMPORT_05 - [SKIPPED, pending real schema] Uploading a .xlsx with an
//                  unrecognized column schema shows "Import failed".
//   TC_IMPORT_06 - Uploading a completely empty .xlsx is handled gracefully
//                  (no crash, no false success).
//   TC_IMPORT_07 - Clicking "Upload" with no file selected does not crash or
//                  falsely succeed.
//   TC_IMPORT_08 - "Cancel" closes the modal without applying any changes.
//   TC_IMPORT_09 - Reopening the modal after Cancel resets to a clean default
//                  state (no leftover selected file).
//   TC_IMPORT_10 - [SKIPPED, pending real schema] The asset table's total
//                  count is unchanged after a failed import.
// =============================================================================

test.describe('Assets Page - Import Assets', () => {
  test('TC_IMPORT_01 - Import modal opens with correct heading and instructional text', async () => {
    await assetsPage.openImportModal();

    await expect(assetsPage.importModalHeading).toBeVisible();
    await expect(assetsPage.downloadTemplateButton).toBeVisible();
    await expect(assetsPage.importFileSelectArea).toBeVisible();
    await expect(assetsPage.page.getByText(importModalText.fileTypeHint)).toBeVisible();
    await expect(assetsPage.importUploadButton).toBeVisible();
    await expect(assetsPage.importCancelButton).toBeVisible();
  });

  test('TC_IMPORT_02 - "Download Template" triggers a .xlsx file download', async () => {
    await assetsPage.openImportModal();

    const download = await assetsPage.downloadTemplate();
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('TC_IMPORT_03 - file-select drop-zone and .xlsx-only hint are visible', async () => {
    await assetsPage.openImportModal();

    await expect(assetsPage.importFileSelectArea).toBeVisible();
    await expect(assetsPage.page.getByText(importModalText.fileTypeHint)).toBeVisible();
  });

  test('TC_IMPORT_04 - selecting a non-.xlsx file does not enable a successful upload', async () => {
    await assetsPage.openImportModal();
    await assetsPage.selectFileForImport(importFixtures.wrongExtension);

    // The app must not allow a non-.xlsx file to proceed to Upload at all.
    await expect(assetsPage.importUploadButton).toBeDisabled();
  });

  test('TC_IMPORT_05 - uploading a .xlsx with an unrecognized column schema shows "Import failed"', async () => {
    test.skip(
      true,
      'Confirmed via test run: the app validates .xlsx column headers ' +
      "client-side before enabling Upload, so a fixture with arbitrary/wrong " +
      'headers never reaches the server-side "Import failed" state this test ' +
      'needs. Requires the real template schema to build a fixture that ' +
      'passes header validation but fails on data content — see chat for options.',
    );

    await assetsPage.openImportModal();
    await assetsPage.selectFileForImport(importFixtures.malformedData);

    await expect(assetsPage.importUploadButton).toBeEnabled();
    await assetsPage.clickUpload();

    await expect(assetsPage.importFailedMessage).toBeVisible();
  });

  test('TC_IMPORT_06 - uploading a completely empty .xlsx is handled gracefully', async () => {
    await assetsPage.openImportModal();
    await assetsPage.selectFileForImport(importFixtures.empty);

    // A file with zero headers/rows may legitimately be blocked at
    // selection time (a distinct "no data in this file" check) rather than
    // reaching the server — so branch on the actual state instead of
    // assuming one outcome.
    const uploadEnabled = await assetsPage.importUploadButton.isEnabled();

    if (uploadEnabled) {
      await assetsPage.clickUpload();
      await expect(assetsPage.importFailedMessage).toBeVisible();
    } else {
      await expect(assetsPage.importUploadButton).toBeDisabled();
    }
  });

  test('TC_IMPORT_07 - clicking Upload with no file selected does not crash or falsely succeed', async ({ page }) => {
    await assetsPage.openImportModal();

    // No file was ever provided — Upload should be disabled, not clickable.
    await expect(assetsPage.importUploadButton).toBeDisabled();
    // Page must still be responsive — a real crash would leave the app in
    // a broken state where basic navigation elements are gone.
    await expect(page.getByRole('link', { name: 'Assets' })).toBeVisible();
  });

  test('TC_IMPORT_08 - "Cancel" closes the modal without applying any changes', async () => {
    const baselineTotal = await assetsPage.getTotalCount();

    await assetsPage.openImportModal();
    await assetsPage.cancelImport();

    await expect(assetsPage.importModalHeading).not.toBeVisible();
    const totalAfterCancel = await assetsPage.getTotalCount();
    expect(totalAfterCancel).toBe(baselineTotal);
  });

  test('TC_IMPORT_09 - reopening the modal after Cancel resets to a clean default state', async () => {
    await assetsPage.openImportModal();
    await assetsPage.selectFileForImport(importFixtures.malformedData);
    await assetsPage.cancelImport();

    await assetsPage.openImportModal();
    // Default drop-zone prompt should be showing again — not a leftover
    // "selected file" state from before Cancel.
    await expect(assetsPage.importFileSelectArea).toBeVisible();
  });

  test('TC_IMPORT_10 - asset table total count is unchanged after a failed import', async () => {
    test.skip(
      true,
      'Same root cause as TC_IMPORT_05: needs a fixture that reaches the ' +
      'server-side "Import failed" state, which requires the real template ' +
      'schema. See TC_IMPORT_05 for details.',
    );

    const baselineTotal = await assetsPage.getTotalCount();

    await assetsPage.openImportModal();
    await assetsPage.selectFileForImport(importFixtures.malformedData);
    await expect(assetsPage.importUploadButton).toBeEnabled();
    await assetsPage.clickUpload();
    await expect(assetsPage.importFailedMessage).toBeVisible();
    await assetsPage.cancelImport();

    const totalAfterFailedImport = await assetsPage.getTotalCount();
    expect(totalAfterFailedImport).toBe(baselineTotal);
  });
});