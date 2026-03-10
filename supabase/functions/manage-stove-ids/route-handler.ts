// Route handler for stove ID management operations

import { getStoveIds, getStoveIdById } from "./read-operations.ts";

export async function handleStoveIdRoute(
  req: Request,
  supabase: any,
  userId: string,
  userRole: string,
  organizationId: string | null,
  allowedOrgIds: string[] | null = null
) {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  switch (method) {
    case "GET": {
      // Check if requesting a single stove ID by ID
      const stoveIdParam = url.searchParams.get("id");

      if (stoveIdParam) {
        // Get single stove ID by ID
        return await getStoveIdById(
          supabase,
          userRole,
          organizationId,
          stoveIdParam,
          allowedOrgIds
        );
      }

      // Get stove IDs with pagination and filters
      return await getStoveIds(
        supabase,
        userRole,
        organizationId,
        url.searchParams,
        allowedOrgIds
      );
    }

    default:
      throw new Error(`Method ${method} not allowed`);
  }
}
