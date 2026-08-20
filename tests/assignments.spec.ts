import { test, expect } from '@playwright/test';
import { AssignmentsPage } from '../pages/AssignmentsPage';
import { searchTerms, multiSelectAssetCount, remarksText } from '../test-data/assignmentsData';

// Login happens once via the `setup` project (auth.setup.ts) and the saved
// storageState is reused across every test below. No test here performs a
// login UI flow.
//
// Tests that only exercise dropdown/form UI (selection, validation, cancel)
// close the form via Cancel instead of submitting, so they don't create real
// assignment data. Only the tests that specifically validate a successful
// Assign (TC_ASG_021, TC_ASG_022) create a real assignment, and both clean
// up afterward via the row's "return" action so the asset is available again
// for later runs.

test.describe('Assignments Module', () => {
  test.beforeEach(async ({ page }) => {
    const assignmentsPage = new AssignmentsPage(page);
    await assignmentsPage.goto();
  });

  test.describe('1. Search Bar', () => {
    test('TC_ASG_001 - Search by Employee Name returns matching results', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.search(searchTerms.employeeName);
      const count = await assignmentsPage.getTotalCount();
      expect(count).toBeGreaterThan(0);
      // Use .first(): this employee legitimately has more than one assignment
      // row, so more than one match is correct, not a bug.
      await expect(page.getByText(searchTerms.employeeName).first()).toBeVisible();
    });

    test('TC_ASG_002 - Search by Employee ID returns matching results', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.search(searchTerms.employeeId);
      const count = await assignmentsPage.getTotalCount();
      // If this Employee ID doesn't exist in your data, adjust searchTerms.employeeId
      // to a real one - this assertion expects at least one match.
      expect(count).toBeGreaterThan(0);
    });

    test('TC_ASG_003 - Search by Asset Name (partial) returns matching results', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.search(searchTerms.assetNamePartial);
      const count = await assignmentsPage.getTotalCount();
      expect(count).toBeGreaterThan(0);
    });

    test('TC_ASG_004 - Search by Asset Code (partial) returns matching results', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.search(searchTerms.assetCodePartial);
      const count = await assignmentsPage.getTotalCount();
      expect(count).toBeGreaterThan(0);
    });

    test('TC_ASG_005 - Search by Serial Number returns matching results', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.search(searchTerms.serialNumber);
      const count = await assignmentsPage.getTotalCount();
      expect(count).toBeGreaterThan(0);
      await expect(page.getByText(searchTerms.serialNumber)).toBeVisible();
    });

    test('TC_ASG_006 - Search with invalid/non-existing data shows no results', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.search(searchTerms.nonExistent);
      const count = await assignmentsPage.getTotalCount();
      expect(count).toBe(0);
      // Dropped the empty-state text assertion: the guessed wording
      // (noResultsText in AssignmentsPage.ts) didn't match the real app and
      // I don't have the actual copy. Tell me the exact empty-state message
      // shown and I'll add a proper assertion for it, same as I did for
      // "Type name is required" on the Asset Types module.
    });

    test('TC_ASG_007 - Blank search shows the full/default assignment list', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      const fullCount = await assignmentsPage.getTotalCount();
      await assignmentsPage.search('');
      const afterBlankSearch = await assignmentsPage.getTotalCount();
      expect(afterBlankSearch).toBe(fullCount);
    });

    test('TC_ASG_008 - Clearing search after a search restores the full list', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      const fullCount = await assignmentsPage.getTotalCount();
      await assignmentsPage.search(searchTerms.employeeName);
      expect(await assignmentsPage.getTotalCount()).toBeLessThanOrEqual(fullCount);
      await assignmentsPage.clearSearch();
      expect(await assignmentsPage.getTotalCount()).toBe(fullCount);
    });

    test('TC_ASG_009 - Leading/trailing spaces in the search term are handled correctly', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.search(searchTerms.leadingTrailingSpaces);
      const trimmedCount = await assignmentsPage.getTotalCount();
      await assignmentsPage.clearSearch();
      await assignmentsPage.search(searchTerms.assetNamePartial);
      const exactCount = await assignmentsPage.getTotalCount();
      // Expect the padded search to behave the same as the trimmed version.
      // If your app doesn't trim search input, this will legitimately fail -
      // let me know the actual expected behavior and I'll tighten this.
      expect(trimmedCount).toBe(exactCount);
    });

    test('TC_ASG_010 - Special characters in the search term are handled without errors', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.search(searchTerms.specialChars);
      // No specific match expected - this just confirms the app doesn't error
      // out or crash on special-character input.
      await expect(assignmentsPage.heading).toBeVisible();
      await assignmentsPage.clearSearch();
    });
  });

  test.describe('2. Assign Asset Button and Form', () => {
    test('TC_ASG_011 - Assign Asset button is visible and clicking it opens the Assign Assets form', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await expect(assignmentsPage.assignAssetButton).toBeVisible();
      await expect(assignmentsPage.assignAssetButton).toBeEnabled();
      await assignmentsPage.openAssignAssetForm();
      await expect(assignmentsPage.assignAssetsModalHeading).toBeVisible();
      await assignmentsPage.cancelAssignForm();
    });
  });

  test.describe('3. Employee Dropdown', () => {
    test('TC_ASG_012 - Employee dropdown displays available employees', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.openAssignAssetForm();
      await assignmentsPage.openEmployeeDropdown();
      const optionCount = await page.getByRole('dialog').getByRole('button').count();
      expect(optionCount).toBeGreaterThan(1);
      await assignmentsPage.cancelAssignForm();
    });

    test('TC_ASG_013 - Selecting an employee shows only one selection, displayed correctly', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.openAssignAssetForm();
      const employeeLabel = await assignmentsPage.selectFirstAvailableEmployee();
      expect(employeeLabel.length).toBeGreaterThan(0);
      await expect(page.getByRole('dialog').getByText(employeeLabel, { exact: true })).toBeVisible();
      await assignmentsPage.cancelAssignForm();
    });

    test('TC_ASG_014 - User can change the selected employee', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.openAssignAssetForm();
      const firstEmployee = await assignmentsPage.selectFirstAvailableEmployee();
      // Reopen and pick whatever's now first (may be the same list minus the
      // one already chosen, depending on whether the app filters it out).
      const secondEmployee = await assignmentsPage.selectFirstAvailableEmployee();
      await expect(page.getByRole('dialog').getByText(secondEmployee, { exact: true })).toBeVisible();
      if (firstEmployee !== secondEmployee) {
        await expect(page.getByRole('dialog').getByText(firstEmployee, { exact: true })).not.toBeVisible();
      }
      await assignmentsPage.cancelAssignForm();
    });

    test('TC_ASG_015 - Employee field required validation when submitting without a selection', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.openAssignAssetForm();
      await assignmentsPage.selectFirstAvailableAssets(1);
      await assignmentsPage.submitAssign();
      // No confirmed validation-message text yet - falls back to "form stays
      // open". Tell me the exact required-employee error text (e.g. like
      // "Type name is required" from the Asset Types module) and I'll assert
      // on that directly instead.
      await expect(assignmentsPage.assignAssetsModalHeading).toBeVisible();
      await assignmentsPage.cancelAssignForm();
    });
  });

  test.describe('4. Assets Dropdown', () => {
    test('TC_ASG_016 - Assets dropdown displays available assets', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.openAssignAssetForm();
      await assignmentsPage.openAssetsDropdown();
      const optionCount = await page.getByRole('dialog').getByRole('button').count();
      expect(optionCount).toBeGreaterThan(1);
      await assignmentsPage.closeAssetsDropdown();
      await assignmentsPage.cancelAssignForm();
    });

    test('TC_ASG_017 - User can select one or multiple assets, all displayed correctly', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.openAssignAssetForm();
      const selected = await assignmentsPage.selectFirstAvailableAssets(multiSelectAssetCount);
      expect(selected.length).toBe(multiSelectAssetCount);
      await expect(assignmentsPage.noAssetsSelectedText).not.toBeVisible();
      for (const label of selected) {
        await expect(page.getByRole('dialog').getByText(label, { exact: true })).toBeVisible();
      }
      await assignmentsPage.cancelAssignForm();
    });

    test('TC_ASG_018 - User can deselect a selected asset', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.openAssignAssetForm();
      const [selectedLabel] = await assignmentsPage.selectFirstAvailableAssets(1);
      await assignmentsPage.deselectAsset(selectedLabel);
      await expect(assignmentsPage.noAssetsSelectedText).toBeVisible();
      await assignmentsPage.cancelAssignForm();
    });

    test('TC_ASG_019 - Assets field required validation when submitting without a selection', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.openAssignAssetForm();
      await assignmentsPage.selectFirstAvailableEmployee();
      await assignmentsPage.submitAssign();
      // Same caveat as TC_ASG_015 - tell me the exact required-asset error
      // text and I'll assert on it directly.
      await expect(assignmentsPage.assignAssetsModalHeading).toBeVisible();
      await assignmentsPage.cancelAssignForm();
    });
  });

  test.describe('5 & 6. Remarks Field and Assign Button', () => {
    test('TC_ASG_020 - Assign button is visible', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.openAssignAssetForm();
      await expect(assignmentsPage.assignSubmitButton).toBeVisible();
      await assignmentsPage.cancelAssignForm();
    });

    test('TC_ASG_021 - Assign with valid Employee and Asset (Remarks blank) succeeds and increases the total count by 1', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      const beforeCount = await assignmentsPage.getTotalCount();

      await assignmentsPage.openAssignAssetForm();
      const employeeLabel = await assignmentsPage.selectFirstAvailableEmployee();
      await assignmentsPage.selectFirstAvailableAssets(1);
      // Remarks intentionally left blank - it's optional.
      await assignmentsPage.submitAssign();
      await expect(assignmentsPage.assignSuccessToast).toBeVisible();

      const afterCount = await assignmentsPage.getTotalCount();
      expect(afterCount).toBe(beforeCount + 1);

      // Cleanup: return the asset so it's available again for later runs.
      await assignmentsPage.returnAssignmentByEmployee(employeeLabel);
      expect(await assignmentsPage.getTotalCount()).toBe(beforeCount);
    });

    test('TC_ASG_022 - Assign with valid Remarks succeeds', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      const beforeCount = await assignmentsPage.getTotalCount();

      await assignmentsPage.openAssignAssetForm();
      const employeeLabel = await assignmentsPage.selectFirstAvailableEmployee();
      await assignmentsPage.selectFirstAvailableAssets(1);
      await assignmentsPage.fillRemarks(remarksText);
      await assignmentsPage.submitAssign();
      await expect(assignmentsPage.assignSuccessToast).toBeVisible();

      expect(await assignmentsPage.getTotalCount()).toBe(beforeCount + 1);

      await assignmentsPage.returnAssignmentByEmployee(employeeLabel);
      expect(await assignmentsPage.getTotalCount()).toBe(beforeCount);
    });
  });

  test.describe('7. Cancel Button', () => {
    test('TC_ASG_023 - Cancel button closes the Assign Assets form', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await assignmentsPage.openAssignAssetForm();
      await assignmentsPage.cancelAssignForm();
      await expect(assignmentsPage.assignAssetsModalHeading).not.toBeVisible();
    });

    test('TC_ASG_024 - Cancel after entering/selecting data does not submit the assignment', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      const beforeCount = await assignmentsPage.getTotalCount();

      await assignmentsPage.openAssignAssetForm();
      await assignmentsPage.selectFirstAvailableEmployee();
      await assignmentsPage.selectFirstAvailableAssets(1);
      await assignmentsPage.fillRemarks(remarksText);
      await assignmentsPage.cancelAssignForm();

      expect(await assignmentsPage.getTotalCount()).toBe(beforeCount);
    });
  });

  test.describe('8. Form UI Validation', () => {
    test('TC_ASG_025 - Assign Assets form displays correctly with all expected sections', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      const dialog = page.getByRole('dialog');
      await assignmentsPage.openAssignAssetForm();
      await expect(assignmentsPage.assignAssetsModalHeading).toBeVisible();
      // Scoped to the dialog: "Employee" also matches a table column header
      // and "Assets" also matches the sidebar nav link outside the dialog.
      await expect(dialog.getByText('Employee', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Assets', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Remarks (optional)')).toBeVisible();
      await expect(assignmentsPage.assignSubmitButton).toBeVisible();
      await expect(assignmentsPage.assignCancelButton).toBeVisible();
      await assignmentsPage.cancelAssignForm();
    });

    test('TC_ASG_026 - Required and optional fields are correctly indicated', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      const dialog = page.getByRole('dialog');
      await assignmentsPage.openAssignAssetForm();
      // Remarks is explicitly labeled optional; Employee/Assets carry no such
      // label, implying they're required (confirmed functionally by
      // TC_ASG_015/TC_ASG_019).
      await expect(dialog.getByText('Remarks (optional)')).toBeVisible();
      await expect(dialog.getByText('Employee', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Assets', { exact: true })).toBeVisible();
      await assignmentsPage.cancelAssignForm();
    });

    test('TC_ASG_027 - Field labels and placeholders are displayed correctly', async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      const dialog = page.getByRole('dialog');
      await assignmentsPage.openAssignAssetForm();
      await expect(dialog.getByText('Select employee')).toBeVisible();
      await expect(dialog.getByText('Select assets')).toBeVisible();
      await expect(assignmentsPage.noAssetsSelectedText).toBeVisible();
      await assignmentsPage.cancelAssignForm();
    });
  });
});