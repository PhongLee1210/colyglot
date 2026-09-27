import { expect, test } from "@playwright/test";

// Same streaming/hydration race as farm.spec.ts: wait for either the
// start prompt or the farm before touching gameplay UI.
async function ensureStarted(page: import("@playwright/test").Page) {
  const startButton = page.getByRole("button", { name: "Start this farm" });
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

async function openSettings(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Game settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("music settings", () => {
  test("volume and mute persist across reloads", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/?lang=zh-vi");
    await ensureStarted(page);

    await expect(page.getByTestId("game-music")).toHaveAttribute(
      "src",
      "/audio/a-breath-of-spring.m4a"
    );

    await openSettings(page);
    const slider = page.getByTestId("music-volume");
    await slider.fill("55");
    await expect(page.getByTestId("music-volume-value")).toHaveText("55");
    await page.keyboard.press("Escape");
    // Closing flushes the debounced save — give the POST time to land.
    await page.waitForTimeout(1_000);

    await page.reload();
    await ensureStarted(page);
    await openSettings(page);
    await expect(page.getByTestId("music-volume")).toHaveValue("55");

    await page.getByTestId("music-mute").click();
    await expect(
      page.getByRole("button", { name: "Unmute music" })
    ).toBeVisible();
    await expect(page.getByTestId("music-volume")).toBeDisabled();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1_000);

    await page.reload();
    await ensureStarted(page);
    await openSettings(page);
    await expect(
      page.getByRole("button", { name: "Unmute music" })
    ).toBeVisible();

    // Leave the fixture muted-at-55 for deterministic replays.
    await page.getByTestId("music-mute").click();
    await expect(
      page.getByRole("button", { name: "Mute music" })
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });
});
