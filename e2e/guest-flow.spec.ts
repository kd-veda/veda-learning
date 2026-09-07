import { test, expect } from "@playwright/test";

/**
 * Smoke test for the demonstration requirements' guest flow (see docs/PLAN.md
 * and the product spec's "Demonstration requirements" section): guest entry
 * -> choose a scale -> open the seeded Gaṇapati Prārthanā lesson -> see the
 * tracing-paper text and pitch contour.
 *
 * Uses manual scale selection rather than the live microphone calibration
 * flow, since Chromium's fake audio device produces silence and calibration
 * would be flaky in CI — the calibration algorithms themselves are covered
 * thoroughly by the Vitest unit suite instead.
 */

test("guest can reach the demo lesson and see tracing-paper practice UI", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /trace your teacher/i })).toBeVisible();

  await page.getByRole("link", { name: /begin as a guest/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByRole("link", { name: /continue/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/mic-permission$/);

  await page.getByRole("link", { name: /choose my scale manually instead/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/calibrate\/result\?manual=1$/);

  await page.getByRole("button", { name: "Scale B" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: /first steps in chanting/i }).click();
  await page.getByRole("link", { name: /open/i }).first().click();

  await expect(page.getByRole("heading", { name: /gaṇapati prārthanā/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /pitch contour comparison/i })).toBeVisible();
});
