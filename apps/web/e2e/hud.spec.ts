import { expect, test } from "@playwright/test";

// The HUD shell: a dock that opens the side panel, a tab strip that swaps
// its body, and a rail that toggles the whole thing shut.
async function enterPlay(page: import("@playwright/test").Page) {
  await page.goto("/?lang=zh-vi");
  const startButton = page.getByRole("button", { name: "Start", exact: true });
  const farmGold = page.getByTestId("farm-gold");
  await expect(startButton.or(farmGold)).toBeVisible({ timeout: 30_000 });
  if (await startButton.isVisible()) {
    await startButton.click();
  }
  await expect(farmGold).toBeVisible({ timeout: 30_000 });
}

test.describe("farm hud", () => {
  test("the dock opens the panel, tabs switch it, Escape closes it", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await enterPlay(page);

    await expect(page.getByTestId("goal-pill")).toBeVisible();

    const panel = page.getByTestId("side-panel");
    await expect(panel).toBeHidden();

    await page.getByTestId("dock-seeds").click();
    await expect(panel).toHaveAttribute("aria-label", "Seeds");

    await panel.getByRole("button", { name: "Progress" }).click();
    await expect(panel).toHaveAttribute("aria-label", "Progress");
    await expect(panel.getByText("This farm")).toBeVisible();

    await panel.getByRole("button", { name: "Wonders" }).click();
    await expect(panel.getByText("Coming soon")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });

  test("the shortcut rail reopens the last tab", async ({ page }) => {
    test.setTimeout(120_000);
    await enterPlay(page);

    await page.getByRole("button", { name: "Progress", exact: true }).click();
    const panel = page.getByTestId("side-panel");
    await expect(panel).toHaveAttribute("aria-label", "Progress");

    await page.getByRole("button", { name: "Farm panel" }).click();
    await expect(panel).toBeHidden();

    await page.getByRole("button", { name: "Farm panel" }).click();
    await expect(panel).toHaveAttribute("aria-label", "Progress");
  });
});
