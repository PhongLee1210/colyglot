import { expect, test } from "@playwright/test";

test.describe("anonymous access", () => {
  test("signed-out visit to the farm redirects to /sign-in with next", async ({
    page,
  }) => {
    await page.goto("/?lang=zh-vi");

    await expect(page).toHaveURL(/\/sign-in\?next=/);
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();
  });

  test("signed-out bare entry also redirects to /sign-in", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/sign-in/);
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();
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
