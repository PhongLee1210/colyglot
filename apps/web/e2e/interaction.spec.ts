import { expect, test } from "@playwright/test";

// Task 2 interaction layer: tapping a plot tile selects it (DOM info
// card + 3D ring), dragging pans the camera without selecting, and the
// card switches plots and closes. The bed grid is centered on screen,
// so canvas-center clicks reliably land on plot tiles (every tile,
// planted or empty, is a raycast target).
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

async function tapNearCenter(page: import("@playwright/test").Page) {
  const canvas = page.locator("canvas").first();
  const box = (await canvas.boundingBox())!;
  const candidates = [
    { x: 0.5, y: 0.5 },
    { x: 0.42, y: 0.5 },
    { x: 0.58, y: 0.5 },
    { x: 0.5, y: 0.56 },
  ];
  for (const candidate of candidates) {
    await page.mouse.click(
      box.x + box.width * candidate.x,
      box.y + box.height * candidate.y
    );
    const card = page.getByTestId("plot-info");
    if (await card.isVisible({ timeout: 1_500 }).catch(() => false)) {
      return card;
    }
  }
  return null;
}

test.describe("farm interaction", () => {
  test("tapping a plot shows its info card, then closes", async ({ page }) => {
    test.setTimeout(90_000);
    await enterPlay(page);

    const card = await tapNearCenter(page);
    expect(card, "a plot tile near canvas center should select").not.toBeNull();
    await expect(card!).toBeVisible();

    await page.getByRole("button", { name: "Close plot details" }).click();
    await expect(page.getByTestId("plot-info")).toHaveCount(0);
  });

  test("dragging pans the camera without selecting a plot", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await enterPlay(page);

    const canvas = page.locator("canvas").first();
    const box = (await canvas.boundingBox())!;
    const startX = box.x + box.width * 0.5;
    const startY = box.y + box.height * 0.5;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let step = 1; step <= 8; step++) {
      await page.mouse.move(startX + step * 12, startY + step * 7);
    }
    await page.mouse.up();

    await page.waitForTimeout(300);
    await expect(page.getByTestId("plot-info")).toHaveCount(0);
  });

  test("Escape closes the card and a fresh tap reopens it", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await enterPlay(page);

    const card = await tapNearCenter(page);
    expect(card).not.toBeNull();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("plot-info")).toHaveCount(0);

    const reopened = await tapNearCenter(page);
    expect(reopened).not.toBeNull();
  });
});
