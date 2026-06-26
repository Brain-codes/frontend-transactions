## Problem

Clicking **Credentials** in the Partner Profiles view always errors out with "No credentials found" / edge-function 404 (`JSON object requested, multiple (or no) rows returned`), even for partners that do have credentials.

## Root cause

`PartnerProfilesContent` loads its rows via `organizationsService.getAllOrganizations()` and then calls `adminCredentialsService.getCredentialByPartnerId(org.partner_id)`.

However, `organizationsService.getAllOrganizations()` selects:

```
id, partner_name, branch, state, contact_person, contact_phone, alternative_phone, email, address, created_at, updated_at
```

`partner_id` is **not** in the select list, so `org.partner_id` is `undefined`. The credentials edge function is then called with an empty `partner_id`, finds no matching row, and returns 404. The Manage Partners view works because it loads organizations through a different path that includes `partner_id`.

## Fix

Add `partner_id` to the column list in `src/app/services/organizationsService.js` for all three queries (`getAllOrganizations`, `getOrganizationById`, `searchOrganizations`) so every consumer of this service has the field available.

No UI changes needed — once `org.partner_id` is populated, the existing `handleViewCredentials` call in `PartnerProfilesContent.jsx` will resolve correctly and the modal will open.

## Verification

- Reload `/partners/profiles`, click **Credentials** on a partner known to have login credentials → modal opens with credentials.
- Click **Credentials** on a partner with no credentials → still shows the existing "No credentials found" toast (expected).