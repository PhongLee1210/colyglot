import { expect, test } from "@playwright/test";

const E2E_EMAIL = "e2e@colyglot.test";
const E2E_PASSWORD = "colyglot-e2e-dev";
const SIGNIN_TOKEN = "colyglot-e2e";

test("establish signed-in storage state", async ({ page }) => {
  await page.goto(
    `/auth/test-signin?token=${SIGNIN_TOKEN}&email=${encodeURIComponent(
      E2E_EMAIL
    )}&password=${encodeURIComponent(E2E_PASSWORD)}`
  );
  await expect(page.getByRole("link", { name: "Colyglot" })).toBeVisible();
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
