The upload error is not a code error; it is a preview artifact upload throttling failure from the hosting pipeline. I will not change app logic to address that specific S3 message.

Plan:
1. Trigger a clean preview rebuild/retry after code changes so the failed dist upload can complete again.
2. Remove the remaining runtime guard that can still block login when config is detected as missing.
3. Route all auth and function URLs through the central Supabase config fallback instead of direct `import.meta.env.VITE_SUPABASE_URL` checks.
4. Verify the source no longer contains `Supabase URL is not configured` and that the preview bundle no longer serves that message.
5. If the upload fails again with the same S3 ServiceUnavailable message, treat it as a platform retry issue rather than an application bug and retry once more after the preview pipeline settles.