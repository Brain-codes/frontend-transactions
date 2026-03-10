// Route handler for user operations

import { getUser, getUsers } from "./read-operations.ts";
import { createUser, updateUser } from "./write-operations.ts";
import { deleteUser } from "./delete-operations.ts";

export async function handleUserRoute(
  req: Request,
  supabase: any,
  adminId: string
) {
  // Parse URL to get user ID if present
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const userId = pathParts[pathParts.length - 1];

  // Route to appropriate CRUD operation
  const method = req.method.toUpperCase();

  switch (method) {
    case "GET":
      if (userId && userId !== "manage-users") {
        // Get single user
        return await getUser(supabase, userId);
      } else {
        // Get all users with pagination
        return await getUsers(supabase, url.searchParams);
      }

    case "POST":
      // Create new user
      const createData = await req.json();
      return await createUser(supabase, createData, adminId);

    case "PUT":
    case "PATCH":
      // Update user
      if (!userId || userId === "manage-users") {
        throw new Error("User ID is required for update operations");
      }
      const updateData = await req.json();
      return await updateUser(supabase, userId, updateData, adminId);

    case "DELETE":
      // Delete user
      if (!userId || userId === "manage-users") {
        throw new Error("User ID is required for delete operation");
      }
      return await deleteUser(supabase, userId, adminId);

    default:
      throw new Error(`Method ${method} not allowed`);
  }
}
