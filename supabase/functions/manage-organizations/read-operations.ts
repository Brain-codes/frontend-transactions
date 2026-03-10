// CRUD operations for organizations

// Read operations for organizations with admin user information

export async function getOrganization(supabase: any, organizationId: string) {
  console.log(`🔍 Getting organization with admin user: ${organizationId}`);

  // First get the organization - using new 8-field structure
  const { data: organization, error } = await supabase
    .from("organizations")
    .select(
      `
      id,
      partner_name,
      branch,
      state,
      contact_person,
      contact_phone,
      alternative_phone,
      email,
      address,
      created_at,
      updated_at,
      created_by,
      updated_by
    `,
    )
    .eq("id", organizationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error(`Organization with ID ${organizationId} not found`);
    }
    throw new Error(`Failed to fetch organization: ${error.message}`);
  }

  // Get the admin user for this organization
  let adminUser = null;
  try {
    const { data: admin, error: adminError } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        full_name,
        phone,
        role,
        has_changed_password,
        created_at
      `,
      )
      .eq("organization_id", organizationId)
      .eq("role", "admin")
      .limit(1)
      .single();

    if (!adminError && admin) {
      adminUser = admin;
    }
  } catch (adminError) {
    console.warn("Could not fetch admin user:", adminError);
  }

  return {
    data: {
      organization,
      admin_user: adminUser,
    },
    message: "Organization retrieved successfully",
  };
}

export async function getOrganizations(
  supabase: any,
  searchParams: URLSearchParams,
) {
  console.log("🔍 Getting all organizations with admin users...");

  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const includeAdminUsers = searchParams.get("include_admin_users") !== "false"; // Default to true

  // Validate sortBy to prevent SQL injection
  const validSortFields = [
    "created_at",
    "updated_at",
    "partner_name",
    "branch",
    "state",
  ];
  const actualSortBy = validSortFields.includes(sortBy) ? sortBy : "created_at";

  // Validate sortOrder
  const actualSortOrder = sortOrder === "asc" ? "asc" : "desc";

  let query = supabase.from("organizations").select(
    `
      id,
      partner_name,
      partner_type,
      branch,
      state,
      contact_person,
      contact_phone,
      alternative_phone,
      email,
      address,
      created_at,
      updated_at,
      created_by,
      updated_by
    `,
    { count: "exact" },
  );

  // Apply filters - updated for new 8-field structure
  if (search) {
    query = query.or(
      `partner_name.ilike.%${search}%,branch.ilike.%${search}%,email.ilike.%${search}%,state.ilike.%${search}%`,
    );
  }

  if (status) {
    query = query.eq("status", status);
  }

  // Apply sorting and pagination with validated parameters
  query = query
    .order(actualSortBy, { ascending: actualSortOrder === "asc" })
    .range(offset, offset + limit - 1);

  const { data: organizations, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch organizations: ${error.message}`);
  }

  // If requested, fetch admin users for each organization
  let organizationsWithAdmins = organizations;

  if (includeAdminUsers && organizations && organizations.length > 0) {
    console.log("📋 Fetching admin users for organizations...");

    try {
      // Get all admin users for these organizations in one query
      const orgIds = organizations.map((org: any) => org.id);

      const { data: adminUsers, error: adminError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          email,
          full_name,
          phone,
          role,
          has_changed_password,
          created_at,
          organization_id
        `,
        )
        .in("organization_id", orgIds)
        .eq("role", "admin");

      if (!adminError && adminUsers) {
        // Create a map of organization_id -> admin_user
        const adminMap = new Map();
        adminUsers.forEach((admin: any) => {
          adminMap.set(admin.organization_id, admin);
        });

        // Add admin user data to each organization
        organizationsWithAdmins = organizations.map((org: any) => ({
          ...org,
          admin_user: adminMap.get(org.id) || null,
        }));
      } else {
        console.warn("Could not fetch admin users:", adminError);
        // Still return organizations without admin data if admin fetch fails
        organizationsWithAdmins = organizations.map((org: any) => ({
          ...org,
          admin_user: null,
        }));
      }
    } catch (adminFetchError) {
      console.error("Error fetching admin users:", adminFetchError);
      // Return organizations without admin data if there's an error
      organizationsWithAdmins = organizations.map((org: any) => ({
        ...org,
        admin_user: null,
      }));
    }
  }

  // Fetch stove ID counts for each organization
  if (organizations && organizations.length > 0) {
    console.log("📦 Fetching stove ID counts for organizations...");

    try {
      const orgIds = organizations.map((org: any) => org.id);

      // Use RPC call or aggregation to count stove IDs efficiently
      // This is much more efficient than fetching all records
      const { data: stoveCounts, error: stoveCountError } = await supabase.rpc(
        "get_organization_stove_counts",
        { org_ids: orgIds },
      );

      if (stoveCountError) {
        console.error(
          "Error calling get_organization_stove_counts RPC:",
          stoveCountError,
        );
        // Fallback to manual counting if RPC fails
        throw stoveCountError;
      }

      // Create maps from RPC results
      const countMap = new Map();
      stoveCounts?.forEach((item: any) => {
        countMap.set(item.organization_id, {
          total: item.total_count || 0,
          sold: item.sold_count || 0,
          available: item.available_count || 0,
        });
      });

      // Add stove ID counts to organizations
      organizationsWithAdmins = organizationsWithAdmins.map((org: any) => {
        const counts = countMap.get(org.id) || {
          total: 0,
          sold: 0,
          available: 0,
        };
        return {
          ...org,
          total_stove_ids: counts.total,
          sold_stove_ids: counts.sold,
          available_stove_ids: counts.available,
        };
      });
    } catch (stoveCountError) {
      console.error("Error fetching stove ID counts, using fallback method:", stoveCountError);
      
      // Fallback: Use individual count queries with proper aggregation
      try {
        const orgIds = organizations.map((org: any) => org.id);
        
        // Create count maps
        const totalMap = new Map();
        const soldMap = new Map();
        const availableMap = new Map();
        
        // Get counts using count query instead of fetching all records
        for (const orgId of orgIds) {
          // Total count
          const { count: totalCount } = await supabase
            .from("stove_ids")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", orgId);
          
          totalMap.set(orgId, totalCount || 0);
          
          // Sold count
          const { count: soldCount } = await supabase
            .from("stove_ids")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("status", "sold");
          
          soldMap.set(orgId, soldCount || 0);
          
          // Available count
          const { count: availableCount } = await supabase
            .from("stove_ids")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("status", "available");
          
          availableMap.set(orgId, availableCount || 0);
        }

        // Add stove ID counts to organizations
        organizationsWithAdmins = organizationsWithAdmins.map((org: any) => ({
          ...org,
          total_stove_ids: totalMap.get(org.id) || 0,
          sold_stove_ids: soldMap.get(org.id) || 0,
          available_stove_ids: availableMap.get(org.id) || 0,
        }));
      } catch (fallbackError) {
        console.error("Fallback method also failed:", fallbackError);
        // Return organizations with zero counts if everything fails
        organizationsWithAdmins = organizationsWithAdmins.map((org: any) => ({
          ...org,
          total_stove_ids: 0,
          sold_stove_ids: 0,
          available_stove_ids: 0,
        }));
      }
    }
  }

  return {
    data: organizationsWithAdmins,
    pagination: {
      limit,
      offset,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
    message: `Retrieved ${organizationsWithAdmins?.length || 0} organizations${
      includeAdminUsers ? " with admin user data" : ""
    }`,
  };
}
