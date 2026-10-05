import { expect, test } from "@playwright/test";

test.describe("public access", () => {
  test("signed-out visit lands on the title screen, not /sign-in", async ({
    page,
  }) => {
    await page.goto("/?lang=zh-vi");

    await expect(page.getByTestId("title-overlay")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("signed-out bare entry shows the Play now CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("title-overlay")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("title-begin")).toHaveText("Chơi ngay");
  });

  test("callback rejects off-site next targets", async ({ page }) => {
    await page.goto("/auth/callback?code=invalid&next=https%3A%2F%2Fevil.com");

    await expect(page).toHaveURL(/\/sign-in\?error=callback$/);
    await expect(page).not.toHaveURL(/evil/);
  });

  test("recording api returns 401 without a session", async ({ request }) => {
    const response = await request.get(
      "/api/cards/00000000-0000-0000-0000-000000000000/recording"
    );
    expect(response.status()).toBe(401);
  });
});
