// Query building module
import { Filters } from "./parse-filters.ts";

export interface QueryResult {
  sales: any[] | null;
  totalRecords: number | null;
}

// PostgREST serializes .in()/.or() filters into the request URL. When an ACSL
// agent is scoped to hundreds of organizations, that URL grows to tens of KB and
// the HTTP/2 layer between the Edge Function and PostgREST rejects it with an
// "unspecific protocol error". To stay well under any URL/header limit we split
// large org-id lists into chunks and run them as parallel queries, then merge.
const ORG_CHUNK_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function buildQuery(
  supabase: any,
  filters: Filters,
  userRole: string,
  userOrgId: string | null,
  assignedOrgIds?: string[],
  userId?: string,
  teamAgentIds?: string[]
): Promise<QueryResult> {
  console.log("🔍 Building optimized sales query with joins...");

  // Test basic table access first
  console.log("🧪 Testing table access...");
  const { data: testData, error: testError } = await supabase
    .from("sales")
    .select("id, created_at, organization_id")
    .limit(1);

  if (testError) {
    console.log("❌ Table access test failed:", testError.message);
    throw new Error(`Table access failed: ${testError.message}`);
  }

  console.log("✅ Table accessible");

  // Build optimized select with LEFT JOINs to reduce separate queries
  const selectFields = buildOptimizedSelectFields(filters);
  console.log("📋 Using optimized fields with joins");

  const limit = Math.min(filters.limit || 100, 500);
  const offset = filters.offset || ((filters.page || 1) - 1) * limit;

  // Decide how organization scoping should be applied (may require chunking).
  const orgPlan = computeOrgPlan(filters, userRole, userOrgId, assignedOrgIds, userId, teamAgentIds);

  // A fresh, fully-filtered query builder EXCEPT organization scoping, which the
  // caller applies per-chunk. Rebuilt for each chunk since builders are mutable.
  const baseQuery = () => {
    let q = supabase.from("sales").select(selectFields, { count: "exact" });
    q = applyNonOrgFilters(q, filters);
    return q;
  };

  // Fast path: a single query is safe (no scoping, or a small in-list / or-clause).
  if (!orgPlan.chunked) {
    let query = orgPlan.apply(baseQuery());
    query = applySorting(query, filters);

    console.log("🚀 Executing optimized query with joins...");
    const {
      data: sales,
      error,
      count: totalRecords,
    } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("❌ Main query failed:", error.message);
      throw new Error(`Database query failed: ${error.message}`);
    }

    console.log(
      `✅ Query successful: ${sales?.length || 0} records, ${totalRecords} total`
    );
    return { sales, totalRecords };
  }

  // Chunked path: run each org chunk (plus any small side query) in parallel,
  // then merge, sort, and paginate in memory.
  console.log(
    `🚀 Executing chunked query across ${orgPlan.chunks.length} org chunk(s) + ${orgPlan.sideQueries.length} side query(ies)...`
  );

  // Each chunk must return enough rows to cover the requested page after merge:
  // the global top (offset+limit) rows are always a subset of the union of each
  // chunk's own top (offset+limit) rows.
  const perChunkTop = offset + limit;

  const chunkPromises = orgPlan.chunks.map((orgIds) => {
    let q = applySorting(baseQuery().in("organization_id", orgIds), filters);
    return q.range(0, perChunkTop - 1);
  });
  const sidePromises = orgPlan.sideQueries.map((clause) => {
    let q = applySorting(baseQuery().or(clause), filters);
    return q.range(0, perChunkTop - 1);
  });

  const results = await Promise.all([...chunkPromises, ...sidePromises]);

  for (const r of results) {
    if (r.error) {
      console.error("❌ Chunked query failed:", r.error.message);
      throw new Error(`Database query failed: ${r.error.message}`);
    }
  }

  // Merge + dedupe rows by id (org chunks are disjoint, but a side query may
  // overlap them, so dedupe defensively).
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const r of results) {
    for (const row of r.data || []) {
      if (row?.id != null && seen.has(row.id)) continue;
      if (row?.id != null) seen.add(row.id);
      merged.push(row);
    }
  }

  merged.sort(makeRowComparator(filters));
  const sales = merged.slice(offset, offset + limit);

  // Total: org chunks partition the assigned orgs, so their counts sum exactly.
  // Side-query counts (team-attribution rows) may overlap the org chunks; we
  // add them as an upper bound rather than under-report.
  const totalRecords = results.reduce((sum, r) => sum + (r.count || 0), 0);

  console.log(
    `✅ Chunked query successful: ${sales.length} records (of ${merged.length} merged), ~${totalRecords} total`
  );
  return { sales, totalRecords };
}

// Build a comparator matching the DB sort so merged chunk results order the same
// way. Falls back to created_at desc. Ties break on id for determinism.
function makeRowComparator(filters: Filters): (a: any, b: any) => number {
  const sorts = filters.multiSort?.length
    ? filters.multiSort.map((s) => ({ field: s.field, asc: s.order === "asc" }))
    : [{ field: filters.sortBy || "created_at", asc: (filters.sortOrder || "desc") === "asc" }];

  const cmpVal = (av: any, bv: any): number => {
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // nulls last
    if (bv == null) return -1;
    const an = typeof av === "number" ? av : Number(av);
    const bn = typeof bv === "number" ? bv : Number(bv);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
    return String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
  };

  return (a, b) => {
    for (const { field, asc } of sorts) {
      const c = cmpVal(a?.[field], b?.[field]);
      if (c !== 0) return asc ? c : -c;
    }
    // Stable tiebreak
    const c = cmpVal(a?.id, b?.id);
    return c;
  };
}

function buildOptimizedSelectFields(filters: Filters): string {
  // Base sales fields
  const baseFields = [
    "id",
    "transaction_id",
    "stove_serial_no",
    "sales_date",
    "contact_person",
    "contact_phone",
    "end_user_name",
    "aka",
    "state_backup",
    "lga_backup",
    "phone",
    "other_phone",
    "partner_name",
    "amount",
    "signature",
    "created_by",
    "organization_id",
    "address_id",
    "stove_image_id",
    "agreement_image_id",
    "created_at",
    "status",
    "agent_approved",
    "agent_approved_at",
    "agent_approved_by",
    "is_installment",
    "payment_model_id",
    "total_paid",
    "payment_status",
    "is_archived",
    "retailer_branch",
    "pot_quantity",
    "heat_retention_device",
    "previous_stove_type",
    "previous_stove_other",
    "meals_per_day",
    "cooking_fuel_source",
    "cooking_location",
    "terms_accepted",
    "updated_at",
    "updated_by",
  ];

  // Add joins based on what's requested to avoid N+1 queries
  const joinFields: string[] = [];

  // Use LEFT JOIN so sales without an organization_id (e.g. legacy records) are still returned
  joinFields.push(
    "organizations!left(id, partner_name, branch, state, email)"
  );

  // Always include payment model info for installment sales
  joinFields.push(
    "payment_model:payment_models!left(id, name, duration_months, fixed_price)"
  );

  // Include address if specifically requested
  if (filters.includeAddress) {
    joinFields.push(
      "addresses(id, city, state, street, country, latitude, longitude, full_address)"
    );
  }

  // Creator is fetched separately in fetchRelatedData (fetchCreators) to avoid FK hint issues.
  // Do NOT add a profiles join here — it depends on a FK constraint name that may not match.

  // Include images if specifically requested
  if (
    filters.includeImages ||
    filters.includeStoveImage ||
    filters.includeAgreementImage
  ) {
    joinFields.push(
      "stove_image:uploads!stove_image_id(id, public_id, url, type)",
      "agreement_image:uploads!agreement_image_id(id, public_id, url, type)"
    );
  }

  return [...baseFields, ...joinFields].join(", ");
}

// Apply every filter EXCEPT organization scoping and sorting. Organization
// scoping is handled separately (see computeOrgPlan) so it can be chunked, and
// sorting is applied last (after org scoping) by the caller.
function applyNonOrgFilters(query: any, filters: Filters) {
  query = applyDateFilters(query, filters);
  query = applyStoveFilters(query, filters);
  query = applyStatusFilters(query, filters);
  query = applyLocationFilters(query, filters);
  query = applyPeopleFilters(query, filters);
  query = applyAmountFilters(query, filters);
  query = applyBooleanFilters(query, filters);
  query = applySearchFilter(query, filters);
  return query;
}

function applyDateFilters(query: any, filters: Filters) {
  console.log("📅 Applying date filters...");

  // Sales date filters
  if (filters.dateFrom) query = query.gte("sales_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("sales_date", filters.dateTo);

  // Created date filters
  if (filters.createdFrom) query = query.gte("created_at", filters.createdFrom);
  if (filters.createdTo) query = query.lte("created_at", filters.createdTo);

  // Quick date filters
  const now = new Date();
  if (filters.lastNDays) {
    const pastDate = new Date(
      now.getTime() - filters.lastNDays * 24 * 60 * 60 * 1000
    );
    query = query.gte("created_at", pastDate.toISOString());
  }
  if (filters.thisWeek) {
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    query = query.gte("created_at", startOfWeek.toISOString());
  }
  if (filters.thisMonth) {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    query = query.gte("created_at", startOfMonth.toISOString());
  }
  if (filters.thisYear) {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    query = query.gte("created_at", startOfYear.toISOString());
  }

  return query;
}

function applyLocationFilters(query: any, filters: Filters) {
  if (filters.state) query = query.eq("state_backup", filters.state);
  if (filters.states?.length) query = query.in("state_backup", filters.states);
  if (filters.lga) query = query.eq("lga_backup", filters.lga);
  if (filters.lgas?.length) query = query.in("lga_backup", filters.lgas);
  return query;
}

function applyStoveFilters(query: any, filters: Filters) {
  if (filters.stoveSerialNo)
    query = query.eq("stove_serial_no", filters.stoveSerialNo);
  if (filters.stoveSerialNos?.length)
    query = query.in("stove_serial_no", filters.stoveSerialNos);
  if (filters.stoveSerialNoPattern) {
    query = query.like("stove_serial_no", `%${filters.stoveSerialNoPattern}%`);
  }
  return query;
}

function applyPeopleFilters(query: any, filters: Filters) {
  if (filters.contactPerson)
    query = query.ilike("contact_person", `%${filters.contactPerson}%`);
  if (filters.contactPhone)
    query = query.eq("contact_phone", filters.contactPhone);
  if (filters.endUserName)
    query = query.ilike("end_user_name", `%${filters.endUserName}%`);
  if (filters.aka) query = query.ilike("aka", `%${filters.aka}%`);
  if (filters.partnerName)
    query = query.ilike("partner_name", `%${filters.partnerName}%`);
  if (filters.createdBy) query = query.eq("created_by", filters.createdBy);
  if (filters.createdByIds?.length)
    query = query.in("created_by", filters.createdByIds);
  if (filters.phone) query = query.eq("phone", filters.phone);
  if (filters.otherPhone) query = query.eq("other_phone", filters.otherPhone);
  return query;
}

function applyAmountFilters(query: any, filters: Filters) {
  if (filters.amountMin !== undefined)
    query = query.gte("amount", filters.amountMin);
  if (filters.amountMax !== undefined)
    query = query.lte("amount", filters.amountMax);
  if (filters.amountExact !== undefined)
    query = query.eq("amount", filters.amountExact);
  return query;
}

function applyStatusFilters(query: any, filters: Filters) {
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.statuses?.length) query = query.in("status", filters.statuses);

  // Installment filters
  if (filters.isInstallment !== undefined && filters.isInstallment !== null) {
    const boolVal = filters.isInstallment === true || (filters.isInstallment as any) === "true";
    query = query.eq("is_installment", boolVal);
  }
  if (filters.paymentModelId) query = query.eq("payment_model_id", filters.paymentModelId);
  
  // Archive filter - default to hiding archived sales
  if (filters.showArchived === true || (filters.showArchived as any) === "true") {
    query = query.eq("is_archived", true);
  } else {
    query = query.eq("is_archived", false);
  }

  return query;
}

// UUID that matches no row — used to return an empty result set for scoped
// callers with nothing assigned, instead of silently widening their scope.
const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

// An OrgPlan describes how to scope by organization. Small scopes are applied to
// a single query builder (fast path). Large scopes are split into org-id chunks
// (+ optional small "side" or-clauses) so no request URL grows unbounded.
type OrgPlan =
  | { chunked: false; apply: (q: any) => any }
  | { chunked: true; chunks: string[][]; sideQueries: string[] };

function computeOrgPlan(
  filters: Filters,
  userRole: string,
  userOrgId: string | null,
  assignedOrgIds?: string[],
  userId?: string,
  teamAgentIds?: string[]
): OrgPlan {
  console.log("🏢 Computing organization scope plan...");

  // Helper: scope by a list of org ids, chunking when the list is large.
  const inList = (ids: string[]): OrgPlan => {
    if (ids.length === 0) {
      return { chunked: false, apply: (q) => q.eq("organization_id", NO_MATCH_ID) };
    }
    if (ids.length <= ORG_CHUNK_SIZE) {
      return { chunked: false, apply: (q) => q.in("organization_id", ids) };
    }
    return { chunked: true, chunks: chunk(ids, ORG_CHUNK_SIZE), sideQueries: [] };
  };

  if (userRole === "super_admin") {
    console.log("👑 Super admin: optional org filtering");
    if (filters.organizationId) {
      const id = filters.organizationId;
      return { chunked: false, apply: (q) => q.eq("organization_id", id) };
    }
    if (filters.organizationIds?.length) {
      return inList(filters.organizationIds);
    }
    return { chunked: false, apply: (q) => q };
  }

  if (
    userRole === "acsl_agent" ||
    userRole === "acsl_agent_manager" ||
    userRole === "super_admin_agent"
  ) {
    // ACSL roles: assigned partner sales only. Client-supplied org filters are
    // honored only within the assigned scope (intersection), never beyond it.
    console.log(`🔗 ${userRole}: scoped to ${assignedOrgIds?.length || 0} assigned orgs`);
    const scope = assignedOrgIds || [];
    const team = userRole === "acsl_agent_manager" ? teamAgentIds || [] : [];

    if (filters.organizationId) {
      const id = scope.includes(filters.organizationId) ? filters.organizationId : NO_MATCH_ID;
      return { chunked: false, apply: (q) => q.eq("organization_id", id) };
    }
    if (filters.organizationIds?.length) {
      return inList(filters.organizationIds.filter((id) => scope.includes(id)));
    }
    if (team.length > 0) {
      // Manager: every org assigned to the team, PLUS any sale attributed to a
      // team member (sold_on_behalf_of OR created_by; the former is NULL on
      // older rows). The team clause is small, so it stays inline; only the org
      // list can be large and is chunked.
      const teamList = team.join(",");
      const teamClause = `sold_on_behalf_of.in.(${teamList}),created_by.in.(${teamList})`;
      if (scope.length === 0) {
        return { chunked: false, apply: (q) => q.or(teamClause) };
      }
      if (scope.length <= ORG_CHUNK_SIZE) {
        return {
          chunked: false,
          apply: (q) => q.or(`organization_id.in.(${scope.join(",")}),${teamClause}`),
        };
      }
      // Large manager scope: org chunks + a single side query for team rows.
      // Rows are deduped by id on merge; counts are summed as an upper bound.
      return { chunked: true, chunks: chunk(scope, ORG_CHUNK_SIZE), sideQueries: [teamClause] };
    }
    return inList(scope);
  }

  if (userRole === "partner" || userRole === "admin") {
    // Partner: own organization's sales only. Client org filters cannot widen this.
    console.log("🏢 Partner: locked to own organization");
    const id = userOrgId || NO_MATCH_ID;
    return { chunked: false, apply: (q) => q.eq("organization_id", id) };
  }

  // partner_agent / agent: own sales only, regardless of org or client filters.
  console.log("👤 Partner agent: own sales only");
  if (userId) {
    const clause = `created_by.eq.${userId},sold_on_behalf_of.eq.${userId}`;
    return { chunked: false, apply: (q) => q.or(clause) };
  }
  return { chunked: false, apply: (q) => q.eq("organization_id", NO_MATCH_ID) };
}

function applyBooleanFilters(query: any, filters: Filters) {
  if (filters.hasStoveImage !== undefined) {
    if (filters.hasStoveImage) {
      query = query.not("stove_image_id", "is", null);
    } else {
      query = query.is("stove_image_id", null);
    }
  }
  if (filters.hasAgreementImage !== undefined) {
    if (filters.hasAgreementImage) {
      query = query.not("agreement_image_id", "is", null);
    } else {
      query = query.is("agreement_image_id", null);
    }
  }
  if (filters.hasSignature !== undefined) {
    if (filters.hasSignature) {
      query = query.not("signature", "is", null);
    } else {
      query = query.is("signature", null);
    }
  }
  return query;
}

function applySearchFilter(query: any, filters: Filters) {
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(
      `contact_person.ilike.${searchTerm},end_user_name.ilike.${searchTerm},aka.ilike.${searchTerm},phone.ilike.${searchTerm},other_phone.ilike.${searchTerm},stove_serial_no.ilike.${searchTerm},partner_name.ilike.${searchTerm},contact_phone.ilike.${searchTerm}`
    );
  }
  return query;
}

function applySorting(query: any, filters: Filters) {
  console.log("🔄 Applying sorting...");

  const sortBy = filters.sortBy || "created_at";
  const sortOrder = filters.sortOrder || "desc";

  if (filters.multiSort?.length) {
    filters.multiSort.forEach((sort) => {
      query = query.order(sort.field, { ascending: sort.order === "asc" });
    });
  } else {
    query = query.order(sortBy, { ascending: sortOrder === "asc" });
  }

  return query;
}
