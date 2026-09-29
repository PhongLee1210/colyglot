import { expect, test } from "@playwright/test";

import { warmPixelRatio } from "./helpers/png";

// R3F's resize handler overwrites the default camera's frustum with raw
// viewport halves on every size change, and the reconciler only re-applies
// props whose values changed since the last commit. A gradual (drag-style)
// resize can leave one axis of the farm-fit frustum numerically unchanged
// across a commit, so the overwritten half sticks and the farm drifts out
// of frame. CameraRig opts out with `manual`; this spec guards that the
// farm stays framed through a multi-step resize round-trip.
const FRAMED_WARM_RATIO_MIN = 0.08;
const BAND_TOP = 0.35;
const BAND_BOTTOM = 0.75;
const RESIZE_STEPS = 20;

async function resizeGradually(
  page: import("@playwright/test").Page,
  target: { width: number; height: number }
): Promise<void> {
  const current = page.viewportSize() ?? { width: 430, height: 932 };
  for (let step = 1; step <= RESIZE_STEPS; step++) {
    await page.setViewportSize({
      width: Math.round(
        current.width + ((target.width - current.width) * step) / RESIZE_STEPS
      ),
      height: Math.round(
        current.height +
          ((target.height - current.height) * step) / RESIZE_STEPS
      ),
    });
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(500);
}

// The storage-state reset can leave the deep-linked world unstarted, so the
// farm is reached either directly or through the title overlay's Start.
async function enterPlay(page: import("@playwright/test").Page): Promise<void> {
  const startButton = page.getByRole("button", { name: "Start", exact: true });
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

test.describe("viewport resize keeps the farm framed", () => {
  test("gradual resize round-trip does not corrupt the camera frustum", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const webgl = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
      );
    });
    test.skip(!webgl, "pixel framing assertions require WebGL rendering");

    await page.goto("/?lang=zh-vi");
    await enterPlay(page);
    await page.waitForTimeout(2_000);

    const initialRatio = warmPixelRatio(
      await page.screenshot(),
      BAND_TOP,
      BAND_BOTTOM
    );
    expect(initialRatio).toBeGreaterThan(FRAMED_WARM_RATIO_MIN);

    await resizeGradually(page, { width: 1280, height: 800 });
    const desktopRatio = warmPixelRatio(
      await page.screenshot(),
      BAND_TOP,
      BAND_BOTTOM
    );
    expect(desktopRatio).toBeGreaterThan(FRAMED_WARM_RATIO_MIN);

    await resizeGradually(page, { width: 430, height: 932 });
    const roundTripRatio = warmPixelRatio(
      await page.screenshot(),
      BAND_TOP,
      BAND_BOTTOM
    );
    expect(roundTripRatio).toBeGreaterThan(FRAMED_WARM_RATIO_MIN);
  });
});
