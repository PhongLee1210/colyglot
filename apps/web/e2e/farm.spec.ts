import { expect, test } from "@playwright/test";

import { LANG_PACKS } from "@/lib/game/content";

const LANG_KEY = "zh-vi";

// The answer is never in the DOM — the spec resolves it from the same
// content pack the game builds its choices from, so no test-only hook has
// to ship just to make the harvest loop drivable.
function answerFor(prompt: string): string | null {
  const words = (LANG_PACKS[LANG_KEY]?.packs ?? []).flatMap(
    (pack) => pack.words
  );
  const byHanzi = words.find((word) => word.hanzi === prompt);
  if (byHanzi) return byHanzi.translation;
  return words.find((word) => word.translation === prompt)?.hanzi ?? null;
}

// The game streams its data and boots the 3D world behind a loading
// overlay. A deep link with a started world goes straight to the HUD;
// an unstarted world lands on the in-game title overlay instead of the
// old pre-game prompt. Wait for either outcome before deciding — an
// instant isVisible() would race the stream. Starting the world is
// idempotent, but a click can still land before hydration attaches
// onClick, so retry until the gold chip is on screen, which is the
// observable definition of "started".
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

function parseWords(text: string): { planted: number; total: number } {
  const match = text.match(/(\d+)\/(\d+)/);
  expect(
    match,
    `bed words chip should look like "3/6 words", got: ${text}`
  ).not.toBeNull();
  return { planted: Number(match![1]), total: Number(match![2]) };
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

    // The 3D farm view mounts its canvas under the HUD.
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 20_000,
    });

    // Each bed reports its word count through the HUD rail.
    const bedWords = page.getByTestId("bed-words").first();
    await expect(bedWords).toBeVisible();

    // Plant whichever pack still has unplanted words (tolerates replays;
    // a full bed renders "Bed full" instead, so absence is a valid state).
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

    // Harvest: fresh (never-graded) cards are always in the due queue, so
    // whenever we just planted, this session is guaranteed to have cards.
    await page.getByTestId("dock-harvest").click();
    const begin = page.getByRole("button", { name: "Begin harvest" });
    if (await begin.isEnabled()) {
      await begin.click();

      // The queue streams from the server; wait for the first question or
      // the loop's visibility check breaks out before answering starts.
      const prompt = page.getByTestId("harvest-prompt");
      const feedback = page.getByTestId("harvest-answer");
      const gold = page.getByTestId("harvest-gold");
      await expect(prompt).toBeVisible({ timeout: 15_000 });

      // A slow answer grades as HARD and requeues the card, so the prompt
      // text alone cannot tell "advanced" from "came straight back" —
      // the feedback panel closing is the unambiguous signal.
      for (let i = 0; i < 25; i++) {
        if (!(await prompt.isVisible().catch(() => false))) break;
        const asked = await prompt.innerText();
        const answer = answerFor(asked);
        expect(
          answer,
          `no content-pack word matches the prompt: ${asked}`
        ).not.toBeNull();

        await page
          .getByTestId("harvest-choices")
          .getByRole("button", { name: answer!, exact: true })
          .click();

        await expect(feedback.or(gold)).toBeVisible({ timeout: 15_000 });
        if (await gold.isVisible().catch(() => false)) break;
        // A grade takes seconds on the shared Supabase plus the answer
        // hold before the next question is live.
        await expect(feedback).toBeHidden({ timeout: 20_000 });
      }

      await expect(gold).toBeVisible({ timeout: 15_000 });
      await expect(gold).toContainText("+");
      const harvested = Number((await gold.innerText()).replace(/[^0-9]/g, ""));
      expect(harvested).toBeGreaterThan(0);
      await page.getByRole("button", { name: "Back to farm" }).click();

      const goldAfter = Number(
        (await goldChip.innerText()).replace(/[^0-9]/g, "")
      );
      expect(goldAfter).toBeGreaterThan(goldBefore);
      // Reduced motion never spawns coins, so the host must exist but
      // stay empty once the celebration hands control back.
      await expect(page.getByTestId("coin-flight")).toBeAttached();
      await expect(page.getByTestId("coin-flight").locator("span")).toHaveCount(
        0
      );
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
    const plotsBefore = parseWords(await bedWords.innerText()).total;
    if (goldNow >= cost) {
      // Expanding spends gold, so it arms on the first tap and pays on
      // the second.
      await expand.click();
      await expect(expand).toHaveText(/Spend/);
      await expand.click();
      await expect
        .poll(async () => parseWords(await bedWords.innerText()).total, {
          timeout: 10_000,
        })
        .toBe(plotsBefore + 3);
      const goldSpent = Number(
        (await goldChip.innerText()).replace(/[^0-9]/g, "")
      );
      expect(goldSpent).toBeLessThan(goldNow);
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
