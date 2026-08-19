import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Asset Types page (/asset-types).
 *
 * NOTE ON PER-CARD BUTTON LOCATORS:
 * The Edit/Delete icons on each card are icon-only buttons with no visible
 * text and no confirmed aria-label (only screenshots + one codegen recording
 * were available while writing this, not live DOM access). `card()` locates
 * the card by its heading text and walks up to the nearest ancestor <div>
 * with a class containing "rounded" (the card's visual container in the
 * screenshots). `editButton`/`deleteButton` then take the first/second
 * button inside that card, matching the pencil-then-trash icon order seen
 * in the UI. If your actual markup differs, run `npx playwright codegen`
 * against /asset-types and swap in the real selector/aria-label here —
 * every other test in the spec file will keep working unchanged.
 */
export class AssetTypesPage {
  readonly page: Page;

  readonly pageHeading: Locator;
  readonly addTypeButton: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly addFieldButton: Locator;
  readonly fieldLabelInput: Locator;
  readonly createButton: Locator;
  readonly updateButton: Locator;
  readonly cancelButton: Locator;
  readonly newFormHeading: Locator;
  readonly editFormHeading: Locator;
  readonly confirmDeleteHeading: Locator;
  readonly nameRequiredError: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageHeading = page.getByRole('heading', { name: 'Asset Types', exact: true });
    this.addTypeButton = page.getByRole('button', { name: 'Add Type' });

    this.nameInput = page.getByRole('textbox', { name: 'e.g. Laptop' });
    this.descriptionInput = page.locator('.min-h-\\[120px\\]');
    this.addFieldButton = page.getByRole('button', { name: 'Add field' });
    this.fieldLabelInput = page.getByRole('textbox', { name: 'Label (e.g. Operating system)' });

    this.createButton = page.getByRole('button', { name: 'Create', exact: true });
    this.updateButton = page.getByRole('button', { name: 'Update', exact: true });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });

    this.newFormHeading = page.getByRole('heading', { name: 'New Asset Type' });
    this.editFormHeading = page.getByRole('heading', { name: 'Edit Asset Type' });

    this.confirmDeleteHeading = page.getByRole('heading', { name: 'Confirm Delete' });
    this.nameRequiredError = page.getByText('Type name is required');
    this.deleteConfirmButton = page.getByRole('button', { name: 'Delete', exact: true });
    this.deleteCancelButton = page.getByRole('button', { name: 'Cancel', exact: true });

    // .last() matters: deleting two types in quick succession can leave two
    // "Asset type deleted" toasts on screen briefly, which trips Playwright's
    // strict-mode check on a plain getByText(). Always assert on the latest one.
    this.successToast = page.getByText('Asset type deleted').last();
  }

  /** Navigate straight to the Asset Types page (session already authenticated via storageState). */
  async goto() {
    await this.page.goto('/asset-types');
    await expect(this.pageHeading).toBeVisible();
  }

  /** Locate a card's container by its heading text. See class-level note above. */
  card(typeName: string): Locator {
    return this.page
      .getByRole('heading', { name: typeName, exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
  }

  /** All Asset Type card headings currently rendered (used for count/duplicate checks). */
  async allTypeHeadings(): Promise<string[]> {
    // Adjust the tag below (h3) if the app renders card titles with a different heading level.
    return this.page.locator('h3').allTextContents();
  }

  editButton(typeName: string): Locator {
    return this.card(typeName).getByRole('button').first();
  }

  deleteButton(typeName: string): Locator {
    return this.card(typeName).getByRole('button').last();
  }

  async openAddTypeForm() {
    await this.addTypeButton.click();
    await expect(this.newFormHeading).toBeVisible();
  }

  async openEditForm(typeName: string) {
    await this.editButton(typeName).click();
    await expect(this.editFormHeading).toBeVisible();
  }

  /** Fill the Name field, and optionally the Description field, in whichever form is open. */
  async fillForm(name: string, description?: string) {
    await this.nameInput.fill(name);
    if (description !== undefined) {
      await this.descriptionInput.fill(description);
    }
  }

  async addCustomField(label: string) {
    await this.addFieldButton.click();
    await this.fieldLabelInput.last().fill(label);
  }

  async submitCreate() {
    await this.createButton.click();
  }

  async submitUpdate() {
    await this.updateButton.click();
  }

  async cancelForm() {
    await this.cancelButton.click();
  }

  /** Open delete confirmation, confirm it, and wait for the success toast. */
  async deleteType(typeName: string) {
    await this.deleteButton(typeName).click();
    await expect(this.confirmDeleteHeading).toBeVisible();
    await this.deleteConfirmButton.click();
    await expect(this.successToast).toBeVisible();
    // Let the toast finish its own dismiss cycle before the next action runs,
    // so a fast follow-up delete doesn't race a still-visible toast.
    await this.successToast.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }

  /** Open delete confirmation and cancel out without deleting. */
  async cancelDelete(typeName: string) {
    await this.deleteButton(typeName).click();
    await expect(this.confirmDeleteHeading).toBeVisible();
    await this.deleteCancelButton.click();
  }

  /**
   * Deletes every card whose name isn't in the given seed list. Run this as
   * a suite-level afterAll safety net so a test that fails mid-way (before
   * its own cleanup runs) can't leave data behind that breaks later runs.
   * Best-effort: a failure deleting one stray card doesn't stop the others.
   */
  async cleanupNonSeedTypes(seedNames: string[]) {
    const headings = await this.allTypeHeadings();
    const extras = headings.filter((h) => !seedNames.includes(h));
    for (const name of extras) {
      try {
        await this.deleteType(name);
      } catch {
        // best-effort cleanup only
      }
    }
  }
}