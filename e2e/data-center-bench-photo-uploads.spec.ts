import { test, expect, type Page } from "@playwright/test";
import { signIn, USERS } from "./helpers";

/**
 * A photograph taken or chosen at the bench uploads and stays on the record.
 *
 * On 2026-10-08 a typist's stove photo was refused with "That image did not
 * upload: Upload failed." The photo had uploaded. The upload-image function
 * answers { success, message, upload: { id } } and the bench read the id from
 * the top of that body, where only the direct-storage fallback puts it. With
 * no id it threw its own "Upload failed", so every photo that reached storage
 * was reported as lost, and only a photo that went the fallback way stuck.
 *
 * Driven through the screen, both slots. Against the old code each shows the
 * refusal and no preview; against the fix each shows its preview.
 */

const PARTNER_NAME = "Twin Name Partner";

test.describe.configure({ timeout: 240_000 });

/** A 1x1 PNG: the smallest real image the bucket will take. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function openBench(page: Page): Promise<boolean> {
  await signIn(page, USERS.admin);
  await page.goto("/data-center/import");
  await expect(page.getByRole("heading", { name: "Bulk Import" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /One receipt at a time/ }).click();
  await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 30_000 });
  await page.getByPlaceholder("Search by name").fill(PARTNER_NAME);
  const row = page
    .locator("tbody tr", { hasText: PARTNER_NAME })
    .filter({ hasText: "Kogi" })
    .first();
  if ((await row.count()) === 0) return false;
  await row.click();
  await expect(page.getByText(/all consignments/).first()).toBeVisible({ timeout: 30_000 });
  await page.locator("tbody tr").first().click();
  await expect(page.locator("#wb-endUserName")).toBeVisible({ timeout: 30_000 });
  return true;
}

test("both photographs upload at the bench and show their preview", async ({ page }) => {
  const opened = await openBench(page);
  expect(opened, "the twin partner is not in the funnel on this database").toBe(true);

  // The section, so the signature pad's own image input is never the target.
  const photos = page
    .getByRole("heading", { name: "Photographs" })
    .locator("xpath=ancestor::section[1]");
  const inputs = photos.locator('input[type="file"]');
  await expect(inputs).toHaveCount(2);

  for (const [i, name] of [
    [0, "stove.png"],
    [1, "agreement.png"],
  ] as const) {
    await inputs.nth(i).setInputFiles({ name, mimeType: "image/png", buffer: PNG });
    await expect(photos.getByText(/Uploading\./)).toHaveCount(0, { timeout: 60_000 });
    await expect(
      photos.getByText(/did not upload/),
      `the ${name} upload should not be reported as failed`,
    ).toHaveCount(0);
  }

  await expect(
    photos.getByRole("img", { name: "Preview" }),
    "each slot should hold the photo it was given",
  ).toHaveCount(2);
});

/**
 * The agreement slot asks for "a photograph or scan", and a scan is often a
 * PDF. Sell Stove's slot takes one; the bench's offered images only, and its
 * blob-URL preview would have drawn a PDF as a broken image.
 */
test("a scanned agreement PDF uploads at the bench and shows as a document", async ({
  page,
}) => {
  const opened = await openBench(page);
  expect(opened, "the twin partner is not in the funnel on this database").toBe(true);

  const photos = page
    .getByRole("heading", { name: "Photographs" })
    .locator("xpath=ancestor::section[1]");
  const agreement = photos.locator('input[type="file"]').nth(1);
  await expect(agreement).toHaveAttribute("accept", /application\/pdf/);

  await agreement.setInputFiles({
    name: "agreement.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
  });
  await expect(photos.getByText(/Uploading\./)).toHaveCount(0, { timeout: 60_000 });
  await expect(photos.getByText(/did not upload/)).toHaveCount(0);
  await expect(photos.getByRole("link", { name: "View uploaded document" })).toBeVisible();
});
