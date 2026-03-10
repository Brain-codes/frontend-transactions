// Read operations for stove ID management

export async function getStoveIds(
  supabase: any,
  userRole: string,
  organizationId: string | null,
  searchParams: URLSearchParams,
  allowedOrgIds: string[] | null = null
) {
  console.log("📖 Fetching stove IDs...");
  console.log(`User role: ${userRole}, Organization ID: ${organizationId}`);

  // Parse pagination parameters
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("page_size") || "25");
  const offset = (page - 1) * pageSize;

  // Parse filter parameters
  const stoveIdFilter = searchParams.get("stove_id") || "";
  const statusFilter = searchParams.get("status") || "";
  const organizationName = searchParams.get("organization_name") || "";
  const organizationIds =
    searchParams.get("organization_ids")?.split(",") || [];
  const branchFilter = searchParams.get("branch") || "";
  const stateFilter = searchParams.get("state") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";

  console.log(
    `Pagination: page=${page}, pageSize=${pageSize}, offset=${offset}`
  );
  console.log(
    `Filters: stoveId=${stoveIdFilter}, status=${statusFilter}, org=${organizationName}, orgIds=${organizationIds.join(
      ","
    )}, branch=${branchFilter}, state=${stateFilter}, dateFrom=${dateFrom}, dateTo=${dateTo}`
  );

  // Build the base query
  let query = supabase.from("stove_ids").select(
    `
      id,
      stove_id,
      organization_id,
      status,
      created_at,
      organizations!inner (
        id,
        partner_name,
        branch,
        state
      ),
      sales!left (
        id,
        end_user_name,
        sales_date,
        created_at
      )
    `,
    { count: "exact" }
  );

  // Apply role-based filtering
  if (userRole === "admin" && organizationId) {
    console.log(`🔒 Admin user - filtering by organization: ${organizationId}`);
    query = query.eq("organization_id", organizationId);
  } else if (userRole === "super_admin") {
    console.log("🔓 Super admin - accessing all stove IDs");
  } else if (userRole === "super_admin_agent") {
    // SAA: scope to their assigned orgs; intersect with client-provided org filter
    const effectiveOrgIds =
      allowedOrgIds && allowedOrgIds.length > 0
        ? organizationIds.length > 0
          ? organizationIds.filter((id) => allowedOrgIds!.includes(id))
          : allowedOrgIds
        : [];
    if (effectiveOrgIds.length === 0) {
      return {
        data: [],
        pagination: { page, page_size: pageSize, total_count: 0, total_pages: 0 },
      };
    }
    console.log(`🔒 SAA - filtering by assigned orgs: ${effectiveOrgIds.join(",")}`);
    query = query.in("organization_id", effectiveOrgIds);
  } else {
    throw new Error("Unauthorized: Invalid role or missing organization");
  }

  // Apply filters
  if (stoveIdFilter) {
    query = query.ilike("stove_id", `%${stoveIdFilter}%`);
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  // Filter by organization IDs (for grouped organization selection — super_admin only)
  if (organizationIds.length > 0 && userRole === "super_admin") {
    query = query.in("organization_id", organizationIds);
  }

  // Legacy organization name filter (fallback)
  if (organizationName && userRole === "super_admin") {
    query = query.ilike("organizations.partner_name", `%${organizationName}%`);
  }

  if (branchFilter && userRole === "super_admin") {
    query = query.ilike("organizations.branch", `%${branchFilter}%`);
  }

  if (stateFilter && userRole === "super_admin") {
    query = query.ilike("organizations.state", `%${stateFilter}%`);
  }

  if (dateFrom) {
    // Start of day: 2026-01-13 00:00:00
    query = query.gte("created_at", `${dateFrom}T00:00:00`);
  }

  if (dateTo) {
    // End of day: 2026-01-13 23:59:59
    query = query.lte("created_at", `${dateTo}T23:59:59`);
  }

  // Apply pagination and ordering
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Execute query
  const { data, error, count } = await query;

  if (error) {
    console.error("❌ Error fetching stove IDs:", error);
    throw new Error(`Failed to fetch stove IDs: ${error.message}`);
  }

  console.log(
    `✅ Found ${count} total stove IDs, returning ${
      data?.length || 0
    } for current page`
  );

  // Transform data to include calculated fields
  const transformedData = data?.map((item: any) => {
    const sale = item.sales && item.sales.length > 0 ? item.sales[0] : null;

    return {
      id: item.id,
      stove_id: item.stove_id,
      status: item.status,
      created_at: item.created_at,
      organization_id: item.organization_id,
      organization_name: item.organizations?.partner_name || "N/A",
      branch: item.organizations?.branch || "N/A",
      location: item.organizations?.state || "N/A",
      sale_id: sale?.id || null,
      sale_date: sale?.sales_date || sale?.created_at || null,
      sold_to: sale?.end_user_name || null,
    };
  });

  return {
    data: transformedData,
    pagination: {
      page,
      page_size: pageSize,
      total_count: count || 0,
      total_pages: Math.ceil((count || 0) / pageSize),
    },
  };
}

// Get single stove ID by ID
export async function getStoveIdById(
  supabase: any,
  userRole: string,
  organizationId: string | null,
  stoveIdParam: string,
  allowedOrgIds: string[] | null = null
) {
  console.log(`📖 Fetching stove ID with ID: ${stoveIdParam}`);
  console.log(`User role: ${userRole}, Organization ID: ${organizationId}`);

  // Build the query
  let query = supabase
    .from("stove_ids")
    .select(
      `
      id,
      stove_id,
      organization_id,
      status,
      created_at,
      organizations!inner (
        id,
        partner_name,
        branch,
        state,
        address,
        email,
        contact_person,
        contact_phone
      ),
      sales!left (
        id,
        end_user_name,
        sales_date,
        created_at
      )
    `
    )
    .eq("id", stoveIdParam)
    .single();

  // Execute query
  const { data, error } = await query;

  if (error) {
    console.error("❌ Error fetching stove ID:", error);
    throw new Error(`Failed to fetch stove ID: ${error.message}`);
  }

  if (!data) {
    throw new Error("Stove ID not found");
  }

  // Check authorization
  if (userRole === "admin" && data.organization_id !== organizationId) {
    throw new Error(
      "Unauthorized: You can only view stove IDs from your organization"
    );
  }
  if (
    userRole === "super_admin_agent" &&
    allowedOrgIds &&
    !allowedOrgIds.includes(data.organization_id)
  ) {
    throw new Error(
      "Unauthorized: You can only view stove IDs from your assigned organizations"
    );
  }

  console.log(`✅ Found stove ID: ${data.stove_id}`);

  // Transform data
  const sale = data.sales && data.sales.length > 0 ? data.sales[0] : null;

  return {
    id: data.id,
    stove_id: data.stove_id,
    status: data.status,
    created_at: data.created_at,
    organization_id: data.organization_id,
    organization_name: data.organizations?.partner_name || "N/A",
    branch: data.organizations?.branch || "N/A",
    location: data.organizations?.state || "N/A",
    address: data.organizations?.address || "N/A",
    email: data.organizations?.email || "N/A",
    contact_name: data.organizations?.contact_person || "N/A",
    contact_phone: data.organizations?.contact_phone || "N/A",
    sale_id: sale?.id || null,
    sale_date: sale?.sales_date || sale?.created_at || null,
    sold_to: sale?.end_user_name || null,
  };
}
