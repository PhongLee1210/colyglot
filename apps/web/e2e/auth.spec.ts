import { expect, test } from "@playwright/test";

test.describe("anonymous access", () => {
  test("signed-out visit to the dashboard redirects to /sign-in with next", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/sign-in\?next=%2F$/);
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();
  });

  test("signed-out visit to a foreign deck URL redirects to /sign-in", async ({
    page,
  }) => {
    await page.goto("/decks/00000000-0000-0000-0000-000000000000");

    await expect(page).toHaveURL(/\/sign-in\?next=/);
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
