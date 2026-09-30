import { expect, test } from "@playwright/test";

// Same streaming/hydration race as farm.spec.ts: wait for either the
// start prompt or the farm before touching gameplay UI.
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

async function openSettings(page: import("@playwright/test").Page) {
  // The E2E user starts from a wiped user_settings row, so the interface
  // language boots at its default (vi) — labels below are Vietnamese.
  await page.getByRole("button", { name: "Cài đặt trò chơi" }).click();
  const dialog = page.getByRole("dialog", { name: "Cài đặt" });
  await expect(dialog).toBeVisible();
  return dialog;
}

// The save is a debounced, best-effort POST — the saved chip is
// the app-level confirmation that the server round-trip committed. Waiting
// for it (instead of sleeping) makes the reload assertions deterministic.
async function closeSettingsAndSave(page: import("@playwright/test").Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByText("Đã lưu cài đặt")).toBeVisible({
    timeout: 15_000,
  });
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
    await closeSettingsAndSave(page);

    await page.reload();
    await ensureStarted(page);
    await openSettings(page);
    await expect(page.getByTestId("music-volume")).toHaveValue("55");

    await page.getByTestId("music-mute").click();
    await expect(page.getByRole("button", { name: "Bật nhạc" })).toBeVisible();
    await expect(page.getByTestId("music-volume")).toBeDisabled();
    await closeSettingsAndSave(page);

    await page.reload();
    await ensureStarted(page);
    await openSettings(page);
    await expect(page.getByRole("button", { name: "Bật nhạc" })).toBeVisible();

    await page.getByTestId("music-mute").click();
    await expect(page.getByRole("button", { name: "Tắt nhạc" })).toBeVisible();
    await closeSettingsAndSave(page);
  });
});
