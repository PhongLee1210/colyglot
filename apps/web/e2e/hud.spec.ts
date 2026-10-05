import { expect, test } from "@playwright/test";

// The HUD shell: a dock that opens the side panel, a tab strip that swaps
// its body, and a rail that toggles the whole thing shut.
async function enterPlay(page: import("@playwright/test").Page) {
  await page.goto("/?lang=zh-vi");
  const startButton = page.getByRole("button", {
    name: "Bắt đầu",
    exact: true,
  });
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
    await expect(panel).toHaveAttribute("aria-label", "Hạt giống");

    await panel.getByRole("button", { name: "Tiến độ" }).click();
    await expect(panel).toHaveAttribute("aria-label", "Tiến độ");
    await expect(panel.getByText("Trang trại này")).toBeVisible();

    await panel.getByRole("button", { name: "Kỳ quan" }).click();
    await expect(panel.getByText("Sắp có")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });

  test("the shortcut rail reopens the last tab", async ({ page }) => {
    test.setTimeout(120_000);
    await enterPlay(page);

    await page.getByRole("button", { name: "Tiến độ", exact: true }).click();
    const panel = page.getByTestId("side-panel");
    await expect(panel).toHaveAttribute("aria-label", "Tiến độ");

    await page.getByRole("button", { name: "Bảng trang trại" }).click();
    await expect(panel).toBeHidden();

    await page.getByRole("button", { name: "Bảng trang trại" }).click();
    await expect(panel).toHaveAttribute("aria-label", "Tiến độ");
  });
});
