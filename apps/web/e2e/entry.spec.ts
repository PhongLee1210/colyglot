import { expect, test } from "@playwright/test";

// The Lantern-style entry flow: the game boots directly with a loading
// overlay, then an in-game title overlay over the live 3D island. Deep
// links with a started world skip the title overlay entirely; unstarted
// worlds land on the overlay with a Start button instead.
async function enterPlay(
  page: import("@playwright/test").Page,
  url: string
): Promise<void> {
  await page.goto(url);
  const startButton = page.getByRole("button", {
    name: "Bắt đầu",
    exact: true,
  });
  const farmGold = page.getByTestId("farm-gold");
  await expect(startButton.or(farmGold)).toBeVisible({ timeout: 30_000 });
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!(await startButton.isVisible())) break;
    await startButton.click();
    try {
      await expect(farmGold).toBeVisible({ timeout: 15_000 });
      return;
    } catch {
      // hydration lost the race; click again
    }
  }
  await expect(farmGold).toBeVisible({ timeout: 30_000 });
}

test.describe("game entry flow", () => {
  test("bare entry: loading resolves into the title overlay, then the HUD", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto("/");

    const overlay = page.getByTestId("title-overlay");
    await expect(overlay).toBeVisible({ timeout: 30_000 });

    const startButton = page.getByRole("button", {
      name: "Bắt đầu",
      exact: true,
    });
    if (await startButton.isVisible()) {
      await startButton.click();
    } else {
      await page.getByTestId("title-begin").click();
    }
    await expect(page.getByTestId("farm-gold")).toBeVisible({
      timeout: 15_000,
    });
    await expect(overlay).toBeHidden();
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("deep link goes straight to the farm HUD", async ({ page }) => {
    test.setTimeout(90_000);
    await enterPlay(page, "/?lang=zh-vi");
    await expect(page.getByTestId("farm-gold")).toBeVisible();
  });

  test("switch language from the top bar returns to the title overlay", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await enterPlay(page, "/?lang=zh-vi");

    await page.getByRole("button", { name: "Đổi ngôn ngữ" }).click();
    const overlay = page.getByTestId("title-overlay");
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId("farm-gold")).toBeHidden();

    await page.getByTestId("title-begin").click();
    await expect(page.getByTestId("farm-gold")).toBeVisible();
  });
});
