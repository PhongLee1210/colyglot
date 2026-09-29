import { expect, test } from "@playwright/test";

// Task 3 farm-side effects. Playwright runs with reducedMotion: "reduce",
// so transitions collapse to their terminal states — these specs assert
// exactly that: FX trigger, settle instantly, and leave no debris, while
// the world returns to an interactable resting state.

async function enterPlay(page: import("@playwright/test").Page) {
  await page.goto("/?lang=zh-vi");
  const startButton = page.getByRole("button", { name: "Start", exact: true });
  const farmGold = page.getByTestId("farm-gold");
  await expect(startButton.or(farmGold)).toBeVisible({ timeout: 30_000 });
  if (await startButton.isVisible()) {
    await startButton.click();
  }
  await expect(farmGold).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("canvas").first()).toBeVisible({
    timeout: 20_000,
  });
}

function parseWords(text: string): { planted: number; total: number } {
  const match = text.match(/(\d+)\/(\d+)/);
  expect(
    match,
    `bed words chip should look like "3/6 words", got: ${text}`
  ).not.toBeNull();
  return { planted: Number(match![1]), total: Number(match![2]) };
}

// Plant when the bed has room; a full bed renders "Bed full" instead of
// Plant Pack, and previously planted crops may already cover the due
// queue, so absence is never a failure.
async function plantIfPossible(
  page: import("@playwright/test").Page
): Promise<void> {
  const bedWords = page.getByTestId("bed-words").first();
  await page.getByTestId("dock-seeds").click();
  const panel = page.getByRole("dialog", { name: "Seeds" });
  await expect(panel).toBeVisible();
  const plantPack = panel.getByRole("button", { name: "Plant Pack" }).first();
  const packAttached = await plantPack
    .waitFor({ state: "attached", timeout: 3_000 })
    .then(
      () => true,
      () => false
    );
  if (packAttached && (await plantPack.isEnabled())) {
    await plantPack.click();
    await expect
      .poll(async () => parseWords(await bedWords.innerText()).planted, {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);
  }
  await page.keyboard.press("Escape");
}

test.describe("farm effects", () => {
  test("plant pop-in settles and the crop stays selectable", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await enterPlay(page);

    await plantIfPossible(page);

    // Whatever plots the pack filled, the canvas grid must still answer
    // taps right after the pop-in window (instant under reduced motion).
    await page.waitForTimeout(600);
    const canvas = page.locator("canvas").first();
    const box = (await canvas.boundingBox())!;
    const card = page.getByTestId("plot-info");
    for (const candidate of [
      { x: 0.5, y: 0.5 },
      { x: 0.42, y: 0.5 },
      { x: 0.58, y: 0.5 },
    ]) {
      await page.mouse.click(
        box.x + box.width * candidate.x,
        box.y + box.height * candidate.y
      );
      if (await card.isVisible({ timeout: 1_500 }).catch(() => false)) break;
    }
    await expect(card).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);
  });
});
