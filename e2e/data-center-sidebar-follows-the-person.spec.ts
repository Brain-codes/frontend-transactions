import { test, expect, type Page } from "@playwright/test";
import { primeBypass, dataCentreNavLink, USERS, PREVIEW_PASSWORD } from "./helpers";

/**
 * D64. The sidebar's Data Center answer belongs to the person signed in.
 *
 * The hook caches its answer in sessionStorage, which outlives a sign-out on
 * the same tab. It used to cache the answer without saying whose it was, so
 * the next person in inherited the last person's entry for up to fifteen
 * minutes. The pages and the functions always asked again, so this is about
 * what the sidebar shows, and that is what is asserted.
 *
 * Seed: callcentre holds an editor grant, partner holds none.
 */

/** Resolves when the sidebar has asked the server about the current person. */
function accessAnswer(page: Page) {
  return page.waitForResponse(
    (r) =>
      r.url().includes("/functions/v1/data-center-read") &&
      r.request().method() === "POST" &&
      r.request().postDataJSON()?.action === "access",
    { timeout: 30_000 },
  );
}

/**
 * Through the real form, every time. The shared `signIn` replays a cached
 * session from an init script that re-runs on every navigation, so on one tab
 * it would put the first person back after the second signed in.
 */
async function signInWithForm(page: Page, email: string) {
  await page.goto("/login");
  const identifier = page.locator('input[type="text"]').first();
  await identifier.waitFor({ state: "visible" });
  // Typing before hydration is wiped when the controlled inputs mount.
  await expect(page.locator('button[type="submit"]').first()).not.toHaveText(/redirecting/i, {
    timeout: 30_000,
  });
  await identifier.fill(email);
  await page.locator('input[type="password"]').first().fill(PREVIEW_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 40_000 });
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: /logout/i }).click();
  await page.waitForURL(/\/login/, { timeout: 30_000 });
}

test("the next person on the same tab does not inherit the last person's entry", async ({
  page,
}) => {
  await primeBypass(page);

  await signInWithForm(page, USERS.callCentre);
  await expect(dataCentreNavLink(page)).toBeVisible({ timeout: 20_000 });

  await signOut(page);

  const partnerAsked = accessAnswer(page);
  await signInWithForm(page, USERS.partner);

  // Red on the old hook: it opened from the cached answer before asking
  // anybody, and never asked, because the cache looked fresh.
  await expect(dataCentreNavLink(page)).toHaveCount(0);

  // An absence only means something once the partner's own answer is in.
  const answer = await partnerAsked;
  expect(answer.status()).toBe(200);
  expect((await answer.json()).hasAccess).toBe(false);
  await expect(dataCentreNavLink(page)).toHaveCount(0);

  // And it is not simply stuck closed: the person with the grant gets it back.
  await signOut(page);
  await signInWithForm(page, USERS.callCentre);
  await expect(dataCentreNavLink(page)).toBeVisible({ timeout: 20_000 });
});
