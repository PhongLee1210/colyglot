import { expect, test } from "@playwright/test";

// The farm screen streams its data: the initial HTML holds a Suspense
// fallback, and the "Start this farm" prompt (or the farm) only appears
// once the server query resolves. Wait for either outcome before
// deciding — an instant isVisible() would race the stream. Starting the
// world is idempotent, but a click can still land before hydration
// attaches onClick, so retry until the gold chip is on screen, which is
// the observable definition of "started".
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

test.describe("farm game loop", () => {
  test("plant → harvest → claim → expand (state-tolerant)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/?lang=zh-vi");
    await ensureStarted(page);

    const goldChip = page.getByTestId("farm-gold");
    await expect(goldChip).toBeVisible();
    const goldBefore = Number(
      (await goldChip.innerText()).replace(/[^0-9]/g, "")
    );
    expect(goldBefore).toBeGreaterThanOrEqual(40);

    // The garden bed renders its plots — empty on a fresh world, planted
    // after replays (the fixed e2e user's world persists).
    await expect(page.getByLabel(/^Plot |Empty plot$/).first()).toBeVisible();

    // Plant whichever pack still has unplanted words (tolerates replays).
    await page.getByRole("button", { name: "Seeds" }).click();
    const sheet = page.getByRole("dialog", { name: "Seeds" });
    await expect(sheet).toBeVisible();
    const plantPack = sheet.getByRole("button", { name: "Plant Pack" }).first();
    if (await plantPack.isEnabled()) {
      await plantPack.click();
      await expect(
        page.getByRole("button", { name: /^Plot / }).first()
      ).toBeVisible();
    }
    await page.keyboard.press("Escape");

    // Harvest: fresh (never-graded) cards are always in the due queue, so
    // whenever we just planted, this session is guaranteed to have cards.
    await page.getByRole("button", { name: "Harvest" }).click();
    const begin = page.getByRole("button", { name: "Begin harvest" });
    if (await begin.isEnabled()) {
      await begin.click();

      for (let i = 0; i < 15; i++) {
        const card = page.getByRole("button", { name: /^Card: / });
        if (!(await card.isVisible())) break;
        const labelBefore = await card.getAttribute("aria-label");
        await card.click(); // flip to reveal
        await page.getByRole("button", { name: /^Perfect$/ }).click();
        // A grade takes seconds on the shared Supabase plus an 850ms
        // reward window — wait until this card actually advances (or the
        // session ends) before touching the next one.
        await expect
          .poll(
            async () => {
              if (
                await page
                  .getByTestId("harvest-gold")
                  .isVisible()
                  .catch(() => false)
              ) {
                return true;
              }
              const label = await card
                .getAttribute("aria-label")
                .catch(() => null);
              return label !== labelBefore;
            },
            { timeout: 15_000 }
          )
          .toBe(true);
      }

      const gold = page.getByTestId("harvest-gold");
      await expect(gold).toBeVisible({ timeout: 15_000 });
      await expect(gold).toContainText("+");
      const harvested = Number((await gold.innerText()).replace(/[^0-9]/g, ""));
      expect(harvested).toBeGreaterThan(0);
      await page.getByRole("button", { name: "Back to farm" }).click();

      const goldAfter = Number(
        (await goldChip.innerText()).replace(/[^0-9]/g, "")
      );
      expect(goldAfter).toBeGreaterThan(goldBefore);
    } else {
      // Replayed world with nothing due: the calm state must be honest.
      await expect(page.getByText("Nothing is ready yet")).toBeVisible();
      await page.getByRole("button", { name: "Back" }).click();
    }

    // Expansion only when affordable (cost printed on the button).
    const expand = page.getByRole("button", { name: /^Expand / }).first();
    const expandText = await expand.innerText();
    const cost = Number(expandText.replace(/[^0-9]/g, ""));
    const goldNow = Number((await goldChip.innerText()).replace(/[^0-9]/g, ""));
    const plotsBefore = await page.getByLabel(/^Plot |Empty plot$/).count();
    if (goldNow >= cost) {
      // Expanding spends gold, so it arms on the first tap and pays on
      // the second.
      await expand.click();
      await expect(expand).toHaveText(/Spend/);
      await expand.click();
      await expect(page.getByLabel(/^Plot |Empty plot$/)).toHaveCount(
        plotsBefore + 3
      );
    }
  });

  test("nursery opens and shows its state", async ({ page }) => {
    await page.goto("/?lang=zh-vi");
    await ensureStarted(page);
    await page.getByRole("button", { name: "Nursery" }).click();
    // Either a seedling to meet or the honest empty state.
    const heading = page.getByRole("heading", {
      name: /Nursery|Nursery complete/,
    });
    await expect(heading).toBeVisible();
  });
});
