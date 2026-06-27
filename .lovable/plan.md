I found the likely login failure points:

- The app currently logs users out automatically every time the login page opens. That can destroy a valid session and makes login fragile.
- The login submit only uses the custom `login-with-credentials` function. If that function behaves differently outside the current workspace/preview, there is no fallback to normal email/password login.
- The redirect after login depends on role state that may arrive after the login response, causing users to remain stuck on login or be routed incorrectly.
- Auth storage cleanup is overly broad and can remove app auth/cache keys during sign-in/sign-out flows.

Plan to resolve:

1. Stabilize the login page
   - Remove the automatic `signOut()` on login page mount.
   - If a user is already authenticated, redirect them safely instead of clearing their session.
   - Keep the existing username/email login form UI unchanged.

2. Harden the login function
   - Keep the custom username/email `login-with-credentials` endpoint as the first attempt.
   - Add a safe fallback to direct email/password login when the identifier is an email and the custom endpoint fails due to network/function issues.
   - Normalize login errors so users see a clear message instead of raw technical failures.

3. Fix post-login routing
   - Set the profile role immediately from the login response.
   - Route users based on the freshest available role instead of waiting for delayed background state.
   - Keep super admin routing to `/dashboard`.

4. Make auth storage safer
   - Stop clearing unrelated `auth` or `transaction` localStorage keys during routine auth state changes.
   - Only clear the known app profile/token data and Supabase session keys during an explicit logout.

5. Verify the fix
   - Test the login page behavior in a clean browser session against the preview route.
   - Confirm the login endpoint is reachable from the preview domain and that failed login shows a controlled error instead of breaking the app.

Important: I will not log out your current active workspace session during testing.