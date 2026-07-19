// Read operations for stove ID management
import { selectInChunks, paginatedSelectInChunks } from "../_shared/chunkedQuery.ts";

// Roles scoped to a single organization (their own org's stoves).
// Partner Agent / Agent see their partner organization's stove ledger ("Assigned stoves").
const ORG_SCOPED_ROLES = ["partner", "admin", "partner_agent", "agent", "agent_user"];
// Roles scoped to a set of assigned partner orgs (resolveAssignedOrgIds).
const ACSL_SCOPED_ROLES = ["acsl_agent", "acsl_agent_manager", "super_admin_agent"];

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
  const showArchived = searchParams.get("show_archived") === "true";

  console.log(
    `Pagination: page=${page}, pageSize=${pageSize}, offset=${offset}`
  );
  console.log(
    `Filters: stoveId=${stoveIdFilter}, status=${statusFilter}, org=${organizationName}, orgIds=${organizationIds.join(
      ","
    )}, branch=${branchFilter}, state=${stateFilter}, dateFrom=${dateFrom}, dateTo=${dateTo}, showArchived=${showArchived}`
  );

  const salesReferenceFilter = searchParams.get("sales_reference") || "";

  // Ordering config
  const sortByParam = searchParams.get("sort_by") || "created_at";
  const sortDirParam = searchParams.get("sort_dir") || "desc";
  const ascending = sortDirParam === "asc";
  const sortColumnMap: Record<string, string> = {
    stove_id: "stove_id",
    date_sold: "created_at",
    created_at: "created_at",
    status: "status",
    sales_reference: "sales_reference",
  };
  const sortColumn = sortColumnMap[sortByParam] || "created_at";

  // ACSL agents/managers scope to their assigned orgs (intersected with any
  // client-provided org filter). This list can be hundreds of orgs, so it is
  // applied per-chunk rather than inlined into one request URL.
  const isAcsl = ACSL_SCOPED_ROLES.includes(userRole);
  let acslOrgIds: string[] = [];
  if (isAcsl) {
    acslOrgIds =
      allowedOrgIds && allowedOrgIds.length > 0
        ? organizationIds.length > 0
          ? organizationIds.filter((id) => allowedOrgIds!.includes(id))
          : allowedOrgIds
        : [];
    if (acslOrgIds.length === 0) {
      return {
        data: [],
        pagination: { page, page_size: pageSize, total_count: 0, total_pages: 0 },
      };
    }
  } else if (!ORG_SCOPED_ROLES.includes(userRole) && userRole !== "super_admin") {
    throw new Error("Unauthorized: Invalid role or missing organization");
  }

  // Factory: fresh, fully-filtered builder EXCEPT ACSL org scope + order/range.
  const buildQuery = () => {
    let query = supabase.from("stove_ids").select(
      `
      id,
      stove_id,
      sale_id,
      organization_id,
      status,
      sales_reference,
      is_archived,
      archive_note,
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

    // Role-based filtering (ACSL org scope applied separately per chunk)
    if (ORG_SCOPED_ROLES.includes(userRole) && organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    // Archive filter - default to showing only non-archived
    query = query.eq("is_archived", showArchived ? true : false);

    if (stoveIdFilter) query = query.ilike("stove_id", `%${stoveIdFilter}%`);
    if (salesReferenceFilter) query = query.ilike("sales_reference", `%${salesReferenceFilter}%`);
    if (statusFilter) query = query.eq("status", statusFilter);

    // Organization filters (super_admin only)
    if (organizationIds.length > 0 && userRole === "super_admin") {
      query = query.in("organization_id", organizationIds);
    }
    if (organizationName && userRole === "super_admin") {
      query = query.ilike("organizations.partner_name", `%${organizationName}%`);
    }
    if (branchFilter && userRole === "super_admin") {
      query = query.ilike("organizations.branch", `%${branchFilter}%`);
    }
    if (stateFilter && userRole === "super_admin") {
      query = query.ilike("organizations.state", `%${stateFilter}%`);
    }
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

    return query;
  };

  let data: any[];
  let error: any;
  let count: number;

  if (isAcsl) {
    const compare = (a: any, b: any) => {
      const av = a?.[sortColumn], bv = b?.[sortColumn];
      let c = av == null && bv == null ? 0 : av == null ? 1 : bv == null ? -1 : av < bv ? -1 : av > bv ? 1 : 0;
      if (!ascending) c = -c;
      if (c !== 0) return c;
      return a?.id < b?.id ? -1 : a?.id > b?.id ? 1 : 0;
    };
    const res = await paginatedSelectInChunks(
      acslOrgIds,
      (c) => buildQuery().in("organization_id", c).order(sortColumn, { ascending }),
      { offset, limit: pageSize, compare },
    );
    data = res.data;
    count = res.count;
    error = res.error;
  } else {
    const r = await buildQuery()
      .order(sortColumn, { ascending })
      .range(offset, offset + pageSize - 1);
    data = r.data;
    error = r.error;
    count = r.count || 0;
  }

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
    // Handle both object (FK from stove_ids.sale_id) and array (FK from sales side)
    const saleRaw = item.sales;
    const sale = saleRaw
      ? Array.isArray(saleRaw) ? saleRaw[0] || null : saleRaw
      : null;

    return {
      id: item.id,
      stove_id: item.stove_id,
      status: item.status,
      created_at: item.created_at,
      organization_id: item.organization_id,
      organization_name: item.organizations?.partner_name || "N/A",
      branch: item.organizations?.branch || "N/A",
      location: item.organizations?.state || "N/A",
      sale_id: item.sale_id || sale?.id || null,
      sale_date: sale?.sales_date || sale?.created_at || null,
      sold_to: sale?.end_user_name || null,
      sales_reference: item.sales_reference || null,
      is_archived: item.is_archived || false,
      archive_note: item.archive_note || null,
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

// Get stove IDs grouped by sales_reference
export async function getGroupedBySalesReference(
  supabase: any,
  userRole: string,
  organizationId: string | null,
  searchParams: URLSearchParams,
  allowedOrgIds: string[] | null = null
) {
  console.log("📊 Fetching stove IDs grouped by sales_reference...");

  const organizationIds = searchParams.get("organization_ids")?.split(",").filter(Boolean) || [];

  const buildGroupedQuery = () => supabase.from("stove_ids").select(`
    id,
    stove_id,
    organization_id,
    status,
    sales_reference,
    created_at,
    is_archived,
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
  `).eq("is_archived", false)
    .order("sales_reference", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  let data: any[];
  let error: any;

  // Apply role-based filtering
  if (ORG_SCOPED_ROLES.includes(userRole) && organizationId) {
    const r = await buildGroupedQuery().eq("organization_id", organizationId);
    data = r.data; error = r.error;
  } else if (userRole === "super_admin") {
    const r = organizationIds.length > 0
      ? await buildGroupedQuery().in("organization_id", organizationIds)
      : await buildGroupedQuery();
    data = r.data; error = r.error;
  } else if (ACSL_SCOPED_ROLES.includes(userRole)) {
    const effectiveOrgIds =
      allowedOrgIds && allowedOrgIds.length > 0
        ? organizationIds.length > 0
          ? organizationIds.filter((id) => allowedOrgIds!.includes(id))
          : allowedOrgIds
        : [];
    if (effectiveOrgIds.length === 0) return { data: [] };
    // Chunk the (potentially large) assigned-org list; results are re-grouped
    // and re-sorted in JS below, so per-chunk order is irrelevant.
    const r = await selectInChunks(effectiveOrgIds, (c) =>
      buildGroupedQuery().in("organization_id", c)
    );
    data = r.data; error = r.error;
  } else {
    throw new Error("Unauthorized: Invalid role or missing organization");
  }

  if (error) {
    console.error("❌ Error fetching grouped stove IDs:", error);
    throw new Error(`Failed to fetch grouped stove IDs: ${error.message}`);
  }

  // Group by sales_reference
  const grouped: Record<string, any> = {};
  for (const item of data || []) {
    const ref = item.sales_reference || "__no_reference__";
    if (!grouped[ref]) {
      grouped[ref] = {
        sales_reference: item.sales_reference || null,
        stove_ids: [],
        total: 0,
        available: 0,
        sold: 0,
      };
    }
    const saleRaw = item.sales;
    const sale = saleRaw
      ? Array.isArray(saleRaw) ? saleRaw[0] || null : saleRaw
      : null;

    grouped[ref].stove_ids.push({
      id: item.id,
      stove_id: item.stove_id,
      status: item.status,
      organization_name: item.organizations?.partner_name || "N/A",
      branch: item.organizations?.branch || "N/A",
      location: item.organizations?.state || "N/A",
      sale_date: sale?.sales_date || sale?.created_at || null,
      sold_to: sale?.end_user_name || null,
      created_at: item.created_at,
    });
    grouped[ref].total++;
    if (item.status === "available") grouped[ref].available++;
    else if (item.status === "sold") grouped[ref].sold++;
  }

  // Sort: named references first, then null references
  const sortedGroups = Object.values(grouped).sort((a: any, b: any) => {
    if (!a.sales_reference && b.sales_reference) return 1;
    if (a.sales_reference && !b.sales_reference) return -1;
    return (a.sales_reference || "").localeCompare(b.sales_reference || "");
  });

  console.log(`✅ Grouped into ${sortedGroups.length} sales reference groups`);
  return { data: sortedGroups };
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
      sale_id,
      organization_id,
      status,
      is_archived,
      archive_note,
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
        phone,
        sales_date,
        created_at,
        transaction_id,
        amount,
        state_backup,
        lga_backup,
        is_installment,
        payment_status
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
  if (ORG_SCOPED_ROLES.includes(userRole) && data.organization_id !== organizationId) {
    throw new Error(
      "Unauthorized: You can only view stove IDs from your organization"
    );
  }
  if (
    ACSL_SCOPED_ROLES.includes(userRole) &&
    allowedOrgIds &&
    !allowedOrgIds.includes(data.organization_id)
  ) {
    throw new Error(
      "Unauthorized: You can only view stove IDs from your assigned organizations"
    );
  }

  console.log(`✅ Found stove ID: ${data.stove_id}`);

  // Transform data — handle both object and array from sales join
  const saleRaw = data.sales;
  const sale = saleRaw
    ? Array.isArray(saleRaw) ? saleRaw[0] || null : saleRaw
    : null;

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
    sale_id: data.sale_id || sale?.id || null,
    sale_date: sale?.sales_date || sale?.created_at || null,
    sold_to: sale?.end_user_name || null,
    is_archived: data.is_archived || false,
    archive_note: data.archive_note || null,
    // Pass full sale object so the modal can use it directly
    sale: sale || null,
  };
}
