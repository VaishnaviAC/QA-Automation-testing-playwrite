import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model class for the AssetIQ Employees module.
 *
 * Structurally very similar to AssetsPage — same "Label: X-Y of Z"
 * count pattern at the bottom of the list.
 */
export class EmployeesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;

  // Text like "Employees: 1-12 of 38"
  readonly totalCountText: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Employees', exact: true });
    this.searchInput = page.getByPlaceholder('Search by Employee Name, Employee ID, Email, or Division');
    this.totalCountText = page.getByText(/Employees:.*of\s+\d+/);
  }

  async goto() {
    await this.page.goto('/employees');
    // Wait for the employee list to finish loading before reading
    // the total count, avoiding a race with the initial data fetch.
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Reads the "Employees: X-Y of Z" text and returns just the total (Z).
   *
   * Retries a few times before accepting a 0, since this app fetches
   * data client-side and can briefly show a "0 of 0" loading state.
   * See AssetsPage.getTotalCount() for a fuller explanation.
   */
  async getTotalCount(): Promise<number> {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const text = await this.totalCountText.textContent();
      const match = text?.match(/of\s+(\d+)/);

      if (match) {
        const count = parseInt(match[1], 10);
        if (count !== 0 || attempt === maxAttempts - 1) {
          return count;
        }
      }

      await this.page.waitForTimeout(300);
    }

    throw new Error('Could not read a stable employee count after multiple attempts');
  }

  // ===========================================================================
  // NEW CODE ADDED BELOW — Search Bar / Filter Dropdown / Fetch Button support
  // Everything above this line is the original, unmodified file content.
  // ===========================================================================

  /** Filter dropdown option labels, exactly as rendered in the UI. */
  static readonly FILTER_OPTIONS = ['All Employees', 'Active Employees', 'Inactive Employees'] as const;

  /** "Next page" pagination control. */
  get nextPageButton(): Locator {
    return this.page.getByRole('button', { name: 'Next page' });
  }

  /** The "Fetch" action button that pulls in the latest employee data. */
  get fetchButton(): Locator {
    return this.page.getByRole('button', { name: 'Fetch', exact: true });
  }

  /** Confirmation toast/text shown after a successful fetch. */
  get fetchConfirmationText(): Locator {
    return this.page.getByText('Fetched from Surveillance');
  }

  /**
   * The filter dropdown trigger. Its accessible name always equals the
   * currently selected option (e.g. "All Employees"), so we match on any
   * of the three known option labels rather than a fixed name.
   */
  get filterDropdownTrigger(): Locator {
    return this.page.getByRole('button', {
      name: /^(All Employees|Active Employees|Inactive Employees)$/,
    });
  }

  /**
   * Locator for a specific filter option once the dropdown is open.
   *
   * When the option being selected matches the currently-selected filter,
   * the trigger button and the dropdown's option row share the same
   * accessible name (e.g. both say "Active Employees"). The trigger is
   * always the first match and the open option row is always the last,
   * so target .last() to avoid a strict-mode ambiguity error.
   */
  filterOption(name: (typeof EmployeesPage.FILTER_OPTIONS)[number]): Locator {
    return this.page.getByRole('button', { name, exact: true }).last();
  }

  /** Types into the search box and submits with Enter. */
  async search(query: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  /** Clears the search box (equivalent to removing all typed text). */
  async clearSearch(): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill('');
  }

  /** Reads the current value typed into the search box. */
  async getSearchValue(): Promise<string> {
    return this.searchInput.inputValue();
  }

  /**
   * Opens the filter dropdown and selects the given option.
   */
  async selectFilter(option: (typeof EmployeesPage.FILTER_OPTIONS)[number]): Promise<void> {
    await this.filterDropdownTrigger.click();
    await this.filterOption(option).click();
  }

  /** Returns the label of the currently selected filter option. */
  async getCurrentFilter(): Promise<string | null> {
    return this.filterDropdownTrigger.textContent();
  }

  /** Clicks "Fetch" and waits for the confirmation message to appear. */
  async fetchEmployeeData(): Promise<void> {
    await this.fetchButton.click();
    await this.fetchConfirmationText.waitFor({ state: 'visible' });
  }

  /** True if the fetch confirmation message is currently visible. */
  async isFetchConfirmationVisible(): Promise<boolean> {
    return this.fetchConfirmationText.isVisible();
  }

  /** Advances to the next page of results. */
  async goToNextPage(): Promise<void> {
    await this.nextPageButton.click();
  }

  /**
   * Locator for a status cell value ("Yes"/"No") in the Active column,
   * useful for verifying filter results (e.g. no "No" rows under Active filter).
   */
  activeStatusCell(value: 'Yes' | 'No'): Locator {
    return this.page.getByRole('cell', { name: value, exact: true });
  }
}