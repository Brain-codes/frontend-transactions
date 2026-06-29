**Plan**

1. **Add a frontend safety filter** in `UserManagementContent.jsx` so any returned user with role `partner` or legacy alias `admin` is never rendered in the User Management table.

2. **Correct pagination totals after filtering** so the visible count and page count do not continue showing the old partner-inclusive total of 394.

3. **Keep Partner Agent and Agent records visible** because they are user accounts, while hiding only Partner organization records like NINGI BAUCHI, Rahaman Ruwa, and Dan gora communiity.

4. **Keep the role filter clean** by ensuring Partner / Partner Admin remains absent from the filter dropdown and cannot be selected.

5. **Update the backend function source** as the permanent fix so `manage-users` excludes `partner` and `admin` from its allowed/listed roles before returning data.

6. **Verify using the current `manage-users` response** that partner rows are removed from the table even if the deployed edge function still returns them temporarily.