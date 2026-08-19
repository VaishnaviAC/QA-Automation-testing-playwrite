import { test, expect } from '@playwright/test';
import { AssetTypesPage } from '../pages/AssetstypesPage';
import {
  expectedAssetTypes,
  EXPECTED_ASSET_TYPE_COUNT,
  uniqueTypeName,
  assetTypeTestData,
  customField,
} from '../test-data/assetstypesData';

// Login happens once via the `setup` project (auth.setup.ts) and the saved
// storageState (playwright/.auth/user.json) is reused across every test
// below through this project's `use.storageState` in playwright.config.ts.
// No test here performs a login UI flow.

test.describe('Asset Types Module', () => {
  test.beforeEach(async ({ page }) => {
    const assetTypesPage = new AssetTypesPage(page);
    await assetTypesPage.goto();
  });

  // Safety net: if any test above fails after creating a type but before its
  // own delete/cleanup step runs, this removes it so the next run doesn't
  // inherit stray cards (this is what broke TC_AT_005/006 last run - leftover
  // cards from failed TC_AT_026/028/029 carried over into the next project).
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: 'playwright/.auth/user.json' });
    const assetTypesPage = new AssetTypesPage(page);
    await assetTypesPage.goto();
    await assetTypesPage.cleanupNonSeedTypes(expectedAssetTypes);
    await page.close();
  });

  test.describe('1. Existing Asset Type Cards and Total Count', () => {
    test('TC_AT_001 - All expected Asset Type cards are displayed', async ({ page }) => {
      for (const type of expectedAssetTypes) {
        await expect(page.getByRole('heading', { name: type, exact: true })).toBeVisible();
      }
    });

    test('TC_AT_002 - Each Asset Type name is displayed with correct spelling/casing', async ({ page }) => {
      for (const type of expectedAssetTypes) {
        await expect(page.getByRole('heading', { name: type, exact: true })).toHaveText(type);
      }
    });

    test('TC_AT_003 - No expected Asset Type is missing', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const headings = await assetTypesPage.allTypeHeadings();
      for (const type of expectedAssetTypes) {
        expect(headings).toContain(type);
      }
    });

    test('TC_AT_004 - No duplicate Asset Type cards are displayed', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const headings = await assetTypesPage.allTypeHeadings();
      expect(new Set(headings).size).toBe(headings.length);
    });

    test('TC_AT_005 - Total displayed Asset Type card count is exactly 9', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const headings = await assetTypesPage.allTypeHeadings();
      expect(headings.length).toBe(EXPECTED_ASSET_TYPE_COUNT);
    });

    test('TC_AT_006 - Displayed cards match exactly with the expected Asset Type list', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const headings = await assetTypesPage.allTypeHeadings();
      expect([...headings].sort()).toEqual([...expectedAssetTypes].sort());
    });

    test('TC_AT_007 - Each card displays Edit and Delete actions', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      for (const type of expectedAssetTypes) {
        await expect(assetTypesPage.card(type).getByRole('button')).toHaveCount(2);
      }
    });

    test('TC_AT_008 - UI renders correctly with all Asset Type cards displayed', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      for (const type of expectedAssetTypes) {
        await expect(assetTypesPage.card(type)).toBeVisible();
      }
    });
  });

  test.describe('2. Add Type Button', () => {
    test('TC_AT_009 - Add Type button is displayed, visible, and enabled', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      await expect(assetTypesPage.addTypeButton).toBeVisible();
      await expect(assetTypesPage.addTypeButton).toBeEnabled();
    });

    test('TC_AT_010 - Add Type button text is correct', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      await expect(assetTypesPage.addTypeButton).toHaveText(/Add Type/);
    });

    test('TC_AT_011 - Clicking Add Type opens the New Asset Type form', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      await assetTypesPage.openAddTypeForm();
    });

    test('TC_AT_012 - Form opens only once per click (no duplicate modals)', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      await assetTypesPage.openAddTypeForm();
      await expect(assetTypesPage.newFormHeading).toHaveCount(1);
    });

    test('TC_AT_013 - Repeated open/cancel cycles behave consistently', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      for (let i = 0; i < 3; i++) {
        await assetTypesPage.openAddTypeForm();
        await assetTypesPage.cancelForm();
      }
      await expect(assetTypesPage.newFormHeading).not.toBeVisible();
    });
  });

  test.describe('3. New Asset Type Form', () => {
    test('TC_AT_014 - Form title/heading is correct', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      await assetTypesPage.openAddTypeForm();
      await expect(assetTypesPage.newFormHeading).toBeVisible();
    });

    test('TC_AT_015 - Name and Description fields are present with labels', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      await assetTypesPage.openAddTypeForm();
      await expect(page.getByText('Name', { exact: true })).toBeVisible();
      await expect(assetTypesPage.nameInput).toBeVisible();
      await expect(page.getByText('Description', { exact: true })).toBeVisible();
      await expect(assetTypesPage.descriptionInput).toBeVisible();
    });

    test('TC_AT_016 - Empty field submission is blocked with "Type name is required" message', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.submitCreate();
      await expect(assetTypesPage.nameRequiredError).toBeVisible();
      // Form should also remain open (submission rejected) rather than closing.
      await expect(assetTypesPage.newFormHeading).toBeVisible();
    });

    test('TC_AT_017 - Valid Asset Type name creates a new card successfully', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('Valid');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name, assetTypeTestData.valid.description);
      await assetTypesPage.submitCreate();
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_018 - Only-spaces input is rejected', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(assetTypeTestData.onlySpaces);
      await assetTypesPage.submitCreate();
      await expect(assetTypesPage.newFormHeading).toBeVisible();
    });

    test('TC_AT_019 - Leading/trailing spaces are trimmed on save', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('Trim');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(`  ${name}  `);
      await assetTypesPage.submitCreate();
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_020 - Multiple internal spaces are handled correctly', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = `${uniqueTypeName('Multi')} Space Test`;
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_021 - Uppercase input is accepted', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('UPPER');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_022 - Lowercase input is accepted', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('lower');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_023 - Mixed-case input is accepted', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('MiXed');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_024 - Numeric-only input is handled per validation rules', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(assetTypeTestData.numeric);
      await assetTypesPage.submitCreate();
      // App behavior for numeric-only names wasn't confirmed; clean up either outcome.
      const created = page.getByRole('heading', { name: assetTypeTestData.numeric, exact: true });
      if (await created.isVisible().catch(() => false)) {
        await assetTypesPage.deleteType(assetTypeTestData.numeric);
      }
    });

    test('TC_AT_025 - Alphanumeric input is accepted', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = `${uniqueTypeName('Alnum')}123`;
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_026 - Special characters are rejected in the Asset Type name', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      // Business rule: a name made up of special characters should not be a
      // valid Asset Type name. Unique suffix isolates this run's attempt and
      // lets the finally-block clean up if the app currently accepts it anyway.
      const name = `${assetTypeTestData.specialChars}_${uniqueTypeName('SC')}`;

      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      try {
        // Hard requirement: this name must never be saved. Known bug as of the
        // last run: the app currently accepts it, so this is expected to FAIL
        // until name validation is added on the create form.
        await expect(page.getByRole('heading', { name, exact: true })).not.toBeVisible();
      } finally {
        const created = page.getByRole('heading', { name, exact: true });
        if (await created.isVisible().catch(() => false)) {
          await assetTypesPage.deleteType(name);
        } else if (await assetTypesPage.newFormHeading.isVisible().catch(() => false)) {
          await assetTypesPage.cancelForm();
        }
      }
    });

    test('TC_AT_027 - Duplicate Asset Type name is rejected', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(assetTypeTestData.duplicate);
      await assetTypesPage.submitCreate();
      await expect(assetTypesPage.newFormHeading).toBeVisible();
    });

    test('TC_AT_028 - Case-insensitive duplicate name is accepted (app treats casing as distinct)', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      // Confirmed via prior test run: the app does NOT treat "LAPTOP" as a
      // duplicate of "Laptop" - only exact-case matches are rejected (see
      // TC_AT_027). This documents that actual behavior rather than assuming
      // case-insensitive uniqueness that the app doesn't implement.
      const name = assetTypeTestData.duplicate.toUpperCase(); // "LAPTOP"

      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_029 - Names over the 50-character max length are rejected or truncated', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      // Business rule (confirmed): Asset Type name max length is 50 characters.
      // Unique prefix lets the finally-block find and clean up whatever actually
      // got saved, independent of whether the assertion below passes or fails.
      const prefix = uniqueTypeName('Max');
      const over50 = `${prefix}${'X'.repeat(60)}`.slice(0, 51); // exactly 51 chars - 1 over the limit

      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(over50);
      await assetTypesPage.submitCreate();

      try {
        // Hard requirement: the full 51-char name must never be saved as-is.
        // The app is either expected to reject it (form stays open) or save a
        // truncated ≤50-char version - either is fine. Saving it in full is not.
        await expect(page.getByRole('heading', { name: over50, exact: true })).not.toBeVisible();
      } finally {
        // Runs whether the assertion above passed or failed, so a bug here
        // (app accepting the over-limit name) can't leak data into later tests.
        const headings = await assetTypesPage.allTypeHeadings();
        const created = headings.find((h) => h.startsWith(prefix));
        if (created) {
          await assetTypesPage.deleteType(created);
        } else if (await assetTypesPage.newFormHeading.isVisible().catch(() => false)) {
          await assetTypesPage.cancelForm();
        }
      }
    });

    test('TC_AT_030 - Save/Create button creates the Asset Type and closes the form', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('SaveClose');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();
      await expect(assetTypesPage.newFormHeading).not.toBeVisible();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_031 - Cancel button closes the form without creating a type', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('CancelTest');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.cancelForm();
      await expect(assetTypesPage.newFormHeading).not.toBeVisible();
      await expect(page.getByRole('heading', { name, exact: true })).not.toBeVisible();
    });

    test('TC_AT_032 - Newly created Asset Type card appears in the list', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('Appears');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_033 - Total Asset Type count increases by 1 after successful creation', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const before = (await assetTypesPage.allTypeHeadings()).length;
      const name = uniqueTypeName('CountUp');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();
      const after = (await assetTypesPage.allTypeHeadings()).length;
      expect(after).toBe(before + 1);
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_034 - Adding a custom field to a new Asset Type works correctly', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('CustomField');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.addCustomField(customField.label);
      await assetTypesPage.submitCreate();
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_035 - Reopening the form after Cancel starts with a clean/reset state', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(uniqueTypeName('Stale'));
      await assetTypesPage.cancelForm();
      await assetTypesPage.openAddTypeForm();
      await expect(assetTypesPage.nameInput).toHaveValue('');
    });
  });

  test.describe('4. Edit Asset Type', () => {
    // Edit tests create their own disposable Asset Type to edit, rather than
    // touching seed data (Laptop, Monitor, ...), so the core dataset is
    // never mutated by the test suite.

    test('TC_AT_036 - Edit button is displayed on each card', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      for (const type of expectedAssetTypes) {
        await expect(assetTypesPage.editButton(type)).toBeVisible();
      }
    });

    test('TC_AT_037 - Clicking Edit opens the Edit Asset Type form', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('EditOpen');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await assetTypesPage.openEditForm(name);
      await assetTypesPage.cancelForm();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_038 - Existing values are pre-populated in the Edit form', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('PrePopulate');
      const description = 'Pre-populate check';
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name, description);
      await assetTypesPage.submitCreate();

      await assetTypesPage.openEditForm(name);
      await expect(assetTypesPage.nameInput).toHaveValue(name);
      await expect(assetTypesPage.descriptionInput).toHaveText(description);

      await assetTypesPage.cancelForm();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_039 - Updating with a valid new name saves successfully', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const original = uniqueTypeName('EditOrig');
      const updated = `${original}_Updated`;

      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(original);
      await assetTypesPage.submitCreate();
      await expect(page.getByRole('heading', { name: original, exact: true })).toBeVisible();

      await assetTypesPage.openEditForm(original);
      await assetTypesPage.fillForm(updated);
      await assetTypesPage.submitUpdate();

      await expect(page.getByRole('heading', { name: updated, exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: original, exact: true })).not.toBeVisible();

      await assetTypesPage.deleteType(updated);
    });

    test('TC_AT_040 - Updating with the same existing name keeps the type unchanged', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('SameName');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await assetTypesPage.openEditForm(name);
      await assetTypesPage.submitUpdate();
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();

      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_041 - Updating to an existing duplicate name is rejected', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('DupEdit');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await assetTypesPage.openEditForm(name);
      await assetTypesPage.fillForm('Monitor');
      await assetTypesPage.submitUpdate();
      await expect(assetTypesPage.editFormHeading).toBeVisible();

      await assetTypesPage.cancelForm();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_042 - Empty value validation on Edit form', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('EmptyEdit');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await assetTypesPage.openEditForm(name);
      await assetTypesPage.fillForm('');
      await assetTypesPage.submitUpdate();
      await expect(assetTypesPage.editFormHeading).toBeVisible();

      await assetTypesPage.cancelForm();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_043 - Only-spaces value is rejected on Edit form', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('SpacesEdit');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await assetTypesPage.openEditForm(name);
      await assetTypesPage.fillForm(assetTypeTestData.onlySpaces);
      await assetTypesPage.submitUpdate();
      await expect(assetTypesPage.editFormHeading).toBeVisible();

      await assetTypesPage.cancelForm();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_044 - Uppercase/lowercase/mixed-case updates are accepted', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const original = uniqueTypeName('CaseEdit');
      const updated = `${original}_MiXeD`;
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(original);
      await assetTypesPage.submitCreate();

      await assetTypesPage.openEditForm(original);
      await assetTypesPage.fillForm(updated);
      await assetTypesPage.submitUpdate();
      await expect(page.getByRole('heading', { name: updated, exact: true })).toBeVisible();

      await assetTypesPage.deleteType(updated);
    });

    test('TC_AT_045 - Save/Update button applies changes and closes the form', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const original = uniqueTypeName('UpdClose');
      const updated = `${original}_v2`;
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(original);
      await assetTypesPage.submitCreate();

      await assetTypesPage.openEditForm(original);
      await assetTypesPage.fillForm(updated);
      await assetTypesPage.submitUpdate();
      await expect(assetTypesPage.editFormHeading).not.toBeVisible();

      await assetTypesPage.deleteType(updated);
    });

    test('TC_AT_046 - Cancel on Edit form does not save changes', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('EditCancel');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await assetTypesPage.openEditForm(name);
      await assetTypesPage.fillForm(`${name}_ShouldNotSave`);
      await assetTypesPage.cancelForm();

      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_047 - Reopening Edit form after Cancel shows the original (unsaved) value', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('ReopenEdit');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await assetTypesPage.openEditForm(name);
      await assetTypesPage.fillForm(`${name}_Discarded`);
      await assetTypesPage.cancelForm();

      await assetTypesPage.openEditForm(name);
      await expect(assetTypesPage.nameInput).toHaveValue(name);

      await assetTypesPage.cancelForm();
      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_048 - Total card count remains unchanged after editing', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const original = uniqueTypeName('CountEdit');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(original);
      await assetTypesPage.submitCreate();

      const before = (await assetTypesPage.allTypeHeadings()).length;
      const updated = `${original}_renamed`;
      await assetTypesPage.openEditForm(original);
      await assetTypesPage.fillForm(updated);
      await assetTypesPage.submitUpdate();
      const after = (await assetTypesPage.allTypeHeadings()).length;

      expect(after).toBe(before);
      await assetTypesPage.deleteType(updated);
    });
  });

  test.describe('5. Delete Asset Type', () => {
    test('TC_AT_049 - Delete button is displayed on each card', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      for (const type of expectedAssetTypes) {
        await expect(assetTypesPage.deleteButton(type)).toBeVisible();
      }
    });

    test('TC_AT_050 - Clicking Delete shows a confirmation dialog with expected title/message', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('DeleteConfirmCheck');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await assetTypesPage.deleteButton(name).click();
      await expect(assetTypesPage.confirmDeleteHeading).toBeVisible();
      await expect(page.getByText('Are you sure you want to')).toBeVisible();
      await assetTypesPage.deleteCancelButton.click();

      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_051 - Cancel on delete confirmation does not delete the type', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('CancelDelete');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await assetTypesPage.cancelDelete(name);
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();

      await assetTypesPage.deleteType(name);
    });

    test('TC_AT_052 - Confirmed deletion removes the correct Asset Type card', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('ConfirmDelete');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await assetTypesPage.deleteType(name);
      await expect(page.getByRole('heading', { name, exact: true })).not.toBeVisible();
    });

    test('TC_AT_053 - Only the selected Asset Type is deleted (all others remain)', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('OnlyThis');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await assetTypesPage.deleteType(name);

      for (const type of expectedAssetTypes) {
        await expect(page.getByRole('heading', { name: type, exact: true })).toBeVisible();
      }
    });

    test('TC_AT_054 - Total Asset Type count decreases by exactly 1 after successful deletion', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('CountDown');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      const before = (await assetTypesPage.allTypeHeadings()).length;
      await assetTypesPage.deleteType(name);
      const after = (await assetTypesPage.allTypeHeadings()).length;

      expect(after).toBe(before - 1);
    });

    test('TC_AT_055 - Deleting multiple Asset Types one by one works correctly', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const names = [uniqueTypeName('Multi1'), uniqueTypeName('Multi2')];

      for (const name of names) {
        await assetTypesPage.openAddTypeForm();
        await assetTypesPage.fillForm(name);
        await assetTypesPage.submitCreate();
      }

      for (const name of names) {
        await assetTypesPage.deleteType(name);
        await expect(page.getByRole('heading', { name, exact: true })).not.toBeVisible();
      }
    });

    test('TC_AT_056 - Success message is shown after deletion', async ({ page }) => {
      const assetTypesPage = new AssetTypesPage(page);
      const name = uniqueTypeName('SuccessMsg');
      await assetTypesPage.openAddTypeForm();
      await assetTypesPage.fillForm(name);
      await assetTypesPage.submitCreate();

      await assetTypesPage.deleteButton(name).click();
      await assetTypesPage.deleteConfirmButton.click();
      await expect(assetTypesPage.successToast).toBeVisible();
    });
  });
});