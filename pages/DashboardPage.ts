import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model class for the AssetIQ Dashboard page.
 *
 * All 6 summary cards (Total Assets, Available, Assigned, Maintenance,
 * Employees, Active Assignments) share the exact same HTML structure:
 *   <p>Label</p>
 *   <p>Count</p>
 * as siblings inside the same container. Because of this, instead of
 * writing 6 separate locators, we write one reusable method that takes
 * the label as a parameter and finds the matching count next to it.
 */
export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly recentActivityHeading: Locator;
  readonly viewMoreButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // exact: true avoids accidentally matching "Dashboard" inside some
    // longer text elsewhere on the page (e.g. sidebar link also says "Dashboard")
    this.heading = page.getByRole('heading', { name: 'Dashboard', exact: true });
    this.recentActivityHeading = page.getByRole('heading', { name: 'Recent Activity' });
    this.viewMoreButton = page.getByRole('button', { name: 'View More →' });
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  /**
   * Returns the locator for a card's label text
   * (e.g. "Total Assets", "Available", "Assigned", "Maintenance",
   * "Employees", "Active Assignments"). Used to check the card is visible.
   *
   * This is scoped to the specific paragraph class used only by the
   * dashboard summary cards. A plain page.getByText("Employees") would
   * also match the sidebar's "Employees" nav link and the mobile bottom
   * nav's "Employees" link (same exact text appears 2-3 times on the
   * page), causing Playwright's strict mode to fail with "multiple
   * elements found." Scoping to this specific class avoids that collision.
   */
  cardLabel(label: string): Locator {
    return this.page
      .locator('p.text-sm.text-foreground.font-medium.whitespace-normal')
      .filter({ hasText: new RegExp(`^${label}$`) });
  }

  /**
   * Returns the locator for a card's numeric count.
   *
   * "xpath=following-sibling::p" is an XPath expression — a way of
   * describing "find the element right after this one, at the same level
   * in the HTML tree." Cypress doesn't have a built-in direct equivalent
   * for this; you'd normally need a plugin. Here it's useful because the
   * count <p> is always the very next sibling of the label <p>, regardless
   * of the card's outer wrapper classes (which could change with a redesign).
   */
  cardCount(label: string): Locator {
    return this.cardLabel(label).locator('xpath=following-sibling::p');
  }

  /**
   * Sidebar navigation link, used to move between modules
   * (Dashboard, Assets, Employees, Assignments, Audit Logs, Access Control).
   */
  navLink(name: string): Locator {
    return this.page.getByRole('link', { name });
  }

  /**
   * Locator for all Recent Activity log entries currently shown
   * (the dashboard displays only the 6 most recent by default).
   * Each entry contains a title (e.g. "Admin logged in") and a
   * "who · when" subtitle (e.g. "Admin · 18 minutes ago").
   */
  get recentActivityEntries(): Locator {
    return this.page.locator('div.space-y-3 > div.flex.items-start.gap-3');
  }

  /**
   * Returns just the title text (e.g. "Admin logged in") of a specific
   * Recent Activity entry, by its position (0 = most recent).
   */
  recentActivityTitle(index: number): Locator {
    return this.recentActivityEntries.nth(index).locator('p').first();
  }

  /**
   * Returns the title text of the first `count` Recent Activity entries,
   * retrying if any come back empty. Like the count fields, this section
   * loads its data client-side after the page renders, so reading
   * immediately can catch entries before their text has populated.
   */
  async getRecentActivityTitles(count: number): Promise<string[]> {
    // First, wait until at least `count` entries actually exist in the DOM
    // (not just that their text has populated). This catches the case
    // where the section is still rendering placeholder rows.
    await expect(this.recentActivityEntries).toHaveCount(count, { timeout: 10000 });

    const maxAttempts = 15;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const titles: string[] = [];

      for (let i = 0; i < count; i++) {
        const text = await this.recentActivityTitle(i).textContent();
        titles.push(text?.trim() ?? '');
      }

      const hasEmptyEntry = titles.some((title) => title === '');

      if (!hasEmptyEntry || attempt === maxAttempts - 1) {
        return titles;
      }

      await this.page.waitForTimeout(400);
    }

    return [];
  }
}