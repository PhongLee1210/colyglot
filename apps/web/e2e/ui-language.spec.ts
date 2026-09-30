import { expect, test } from "@playwright/test";

// Same streaming/hydration race as farm.spec.ts: wait for either the
// start prompt or the farm before touching gameplay UI. The title screen
// is not localized yet, so its button label stays English in both langs.
async function ensureStarted(page: import("@playwright/test").Page) {
  const startButton = page.getByRole("button", { name: "Start", exact: true });
  const farmGold = page.getByTestId("farm-gold");
  await expect(startButton.or(farmGold)).toBeVisible({ timeout: 15_000 });
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!(await startButton.isVisible())) return;
    await startButton.click();
    try {
      await expect(farmGold).toBeVisible({ timeout: 10_000 });
      return;
    } catch {
      // hydration lost the race; click again
    }
  }
  await expect(farmGold).toBeVisible();
}

// The E2E user starts from a wiped user_settings row, so the interface
// language boots at its default (vi).
async function openSettings(
  page: import("@playwright/test").Page,
  title: string
) {
  await page.getByRole("button", { name: title }).click();
}

test.describe("interface language", () => {
  test("switches between Tiếng Việt and English and persists", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/?lang=zh-vi");
    await ensureStarted(page);

    await openSettings(page, "Cài đặt trò chơi");
    const dialog = page.getByRole("dialog", { name: "Cài đặt" });
    await expect(dialog).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");

    await page.getByTestId("settings-ui-lang-en").click();
    const englishDialog = page.getByRole("dialog", { name: "Settings" });
    await expect(englishDialog).toBeVisible();
    await expect(
      englishDialog.getByRole("heading", { name: "Interface language" })
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    // The saved chip only fires after the server round-trip commits, which
    // makes the reload assertion below deterministic.
    await expect(page.getByText("Settings saved")).toBeVisible({
      timeout: 15_000,
    });

    await page.reload();
    await ensureStarted(page);
    await openSettings(page, "Game settings");
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

    await page.getByTestId("settings-ui-lang-vi").click();
    await expect(page.getByRole("dialog", { name: "Cài đặt" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await expect(page.getByText("Đã lưu cài đặt")).toBeVisible({
      timeout: 15_000,
    });
  });
});
