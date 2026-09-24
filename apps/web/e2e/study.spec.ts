import { expect, test } from "@playwright/test";

test.describe("study loop", () => {
  test("seed-free flow: create deck, add card, study with Again requeue, Good reschedule, complete", async ({
    page,
  }) => {
    const deckName = `E2E Deck ${Date.now()}`;

    await page.goto("/");
    await expect(
      page
        .getByRole("heading", { name: "day streak" })
        .or(page.getByText("streak"))
    ).toBeVisible();

    await page.getByRole("button", { name: "New deck" }).click();
    await page.getByLabel("Deck name").fill(deckName);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("link", { name: deckName })).toBeVisible();

    await page.getByRole("link", { name: deckName }).click();
    await expect(
      page.getByRole("heading", { name: "No cards in this deck" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Add card" }).first().click();
    await page.getByLabel("Hanzi").fill("你好");
    await page.getByLabel("Pinyin").fill("nǐ hǎo");
    await page.getByLabel("Vietnamese translation").fill("xin chào");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add card" })
      .click();
    await expect(page.getByText("xin chào")).toBeVisible();

    await page.getByRole("link", { name: /Study/ }).click();
    await expect(page.getByText("你好")).toBeVisible();

    await page.getByRole("button", { name: /Card: 你好/ }).click();
    await expect(page.getByText("xin chào")).toBeVisible();

    await page.getByRole("button", { name: "Grade Again (1)" }).click();
    await expect(page.getByText(/will come back this session/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Card: 你好/ })
    ).toBeVisible();

    await page.getByRole("button", { name: /Card: 你好/ }).click();
    await page.getByRole("button", { name: "Grade Good (3)" }).click();

    await expect(
      page.getByRole("heading", { name: "Session complete" })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Cards reviewed")).toBeVisible();
    await expect(page.getByText("1 good")).toBeVisible();

    await page.getByRole("link", { name: "Back to deck" }).click();
    await expect(
      page.getByRole("link", { name: /^Study this deck$/ })
    ).toBeVisible();
  });
});
