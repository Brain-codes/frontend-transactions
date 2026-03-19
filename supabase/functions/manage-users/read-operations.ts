// Read operations for users

export async function getUsers(supabase: any, searchParams: URLSearchParams) {
  console.log("📋 Fetching users list...");

  try {
    // Parse pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);
    const offset = (page - 1) * limit;

    // Parse search and filter parameters
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    console.log("📊 Query parameters:", {
      page,
      limit,
      search,
      role,
      status,
      sortBy,
      sortOrder,
    });

    // Build base query — when no role specified, return both super_admin and super_admin_agent
    let query = supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, status, created_at, last_login", {
        count: "exact",
      });

    if (role && ["super_admin_agent", "super_admin"].includes(role)) {
      query = query.eq("role", role);
      console.log("🔍 Showing users with role:", role);
    } else {
      query = query.in("role", ["super_admin_agent", "super_admin"]);
      console.log("🔍 Showing all super admin users");
    }

    // Apply status filter
    if (status && ["active", "disabled"].includes(status)) {
      query = query.eq("status", status);
      console.log("🔍 Status filter applied:", status);
    }

    // Apply search filter
    if (search.trim()) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      console.log("🔍 Search filter applied:", search);
    }

    // Apply sorting
    const ascending = sortOrder.toLowerCase() === "asc";
    query = query.order(sortBy, { ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: users, error: usersError, count } = await query;

    if (usersError) {
      console.error("❌ Error fetching users:", usersError);
      throw new Error(`Database error: ${usersError.message}`);
    }

    // Fetch assigned_organizations_count + assigned_states_count for each SAA user
    const usersWithCounts = await Promise.all(
      (users || []).map(async (user: any) => {
        if (user.role === "super_admin_agent") {
          const [{ count: orgCount }, { count: stateCount }] = await Promise.all([
            supabase
              .from("super_admin_agent_organizations")
              .select("*", { count: "exact", head: true })
              .eq("agent_id", user.id),
            supabase
              .from("super_admin_agent_states")
              .select("*", { count: "exact", head: true })
              .eq("agent_id", user.id),
          ]);
          return {
            ...user,
            assigned_organizations_count: orgCount || 0,
            assigned_states_count: stateCount || 0,
          };
        }
        return { ...user, assigned_organizations_count: 0, assigned_states_count: 0 };
      })
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    console.log(`✅ Found ${users?.length || 0} users (${count} total)`);

    return {
      message: `Found ${count || 0} users`,
      data: usersWithCounts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count || 0,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        search,
        role,
        status,
        sortBy,
        sortOrder,
      },
    };
  } catch (error) {
    console.error("❌ Error in getUsers:", error);
    throw error;
  }
}

export async function getUser(supabase: any, userId: string) {
  console.log("🔍 Fetching single user:", userId);

  try {
    // Query for single user by ID (any role)
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, status, created_at, last_login")
      .eq("id", userId)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") {
        throw new Error("User not found");
      }
      console.error("❌ Error fetching user:", userError);
      throw new Error(`Database error: ${userError.message}`);
    }

    console.log("✅ User found:", user.id);

    return {
      message: "User retrieved successfully",
      data: user,
    };
  } catch (error) {
    console.error("❌ Error in getUser:", error);
    throw error;
  }
}
