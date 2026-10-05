import { expect, test } from "@playwright/test";

// The EARLY_ACCESS front door: "Play now" mints a real anonymous session
// and boots the full game — the 50-word card cap is the only difference
// from a signed-in player.
test.describe("early access play", () => {
  test("Play now boots an anonymous farm with the word quota visible", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto("/");

    const overlay = page.getByTestId("title-overlay");
    await expect(overlay).toBeVisible({ timeout: 30_000 });

    await page.getByTestId("title-begin").click();
    await expect(page.getByTestId("farm-gold")).toBeVisible({
      timeout: 30_000,
    });
    await expect(overlay).toBeHidden();

    await page.getByTestId("dock-seeds").click();
    const quota = page.getByTestId("quota-chip");
    await expect(quota).toBeVisible();
    await expect(quota).toHaveText(/Đã gieo 0 \/ 50 từ/);
  });

  test("title screen links returning players to /sign-in", async ({ page }) => {
    await page.goto("/");

    const overlay = page.getByTestId("title-overlay");
    await expect(overlay).toBeVisible({ timeout: 30_000 });

    await page
      .getByRole("link", { name: "Đã có trang trại? Đăng nhập" })
      .click();
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
