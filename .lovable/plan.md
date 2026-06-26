## Wire Credentials & Edit into Partner Profiles

Replace the "coming soon" toasts on the Partner Profiles view (`src/app/user-management/partner-profiles/PartnerProfilesContent.jsx`) with the exact same behaviour used on Track Performance (`src/app/partners/components/PartnersContent.jsx`).

### Credentials button
- Import `adminCredentialsService` and `ViewCredentialModal`.
- Add state: `viewingCredential`, `loadingCredentialOrgId`.
- On click, call `adminCredentialsService.getCredentialByPartnerId(partner.partner_id)`.
  - Success with data → open `ViewCredentialModal` with the credential.
  - No data / error → toast "No credentials found" (same copy as Track Performance).
- Show a spinner on the icon button while loading that row.
- Render `<ViewCredentialModal isOpen={!!viewingCredential} onClose={...} credential={viewingCredential} />`.

### Edit button
- Import `EditPartnerModal`.
- Add state: `editingPartner`.
- On click, set `editingPartner` to the row's partner (opens modal).
- Render `<EditPartnerModal organization={editingPartner} isOpen={!!editingPartner} onClose={...} onSuccess={...} />`.
- On success: close modal and reload partners via `organizationsService.getAllOrganizations()` (same refresh pattern already used on mount).

### Notes
- No service-layer or routing changes.
- Keep existing UI/tooltips/icons; only swap the click handlers and add the two modals.
