import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

/**
 * backfill-sales-models
 * --------------------------------------------------------------------------
 * Backfills `organization_payment_models` for partners/customers transferred
 * for monitoring BEFORE the ERP started sending sales models.
 *
 * TWO ERP SOURCES, merged:
 *
 *   A. partner_sales_models  — the partner's explicit entitlement list.
 *      NOTE: this table was only created in the ERP on 2026-07-20, so it is
 *      empty/sparse. When a partner HAS rows here it is authoritative.
 *
 *   B. sales_orders.sales_model_id  — the model used by each historical order.
 *      This is where the real history lives. A partner that sold on a model is
 *      plainly entitled to it, so these are folded in ADDITIVELY (never revoke
 *      on their strength) — exactly how the live sync treats "Order Sales
 *      Model" in external-csv-sync's resolveEntitlements().
 *
 * PARTNER MATCHING — deliberately NOT by name:
 *   ERP sales_reference  ->  monitoring stove_ids.sales_reference -> organization_id
 * The reconcile tool proved this linkage is complete (missing_in_monitoring = 0),
 * so it beats the ERP's own fuzzy name+state partner lookup.
 * Source A additionally matches partners_manager.partner_id -> organizations.partner_id.
 *
 * Model key: normalized(name) + "|" + duration_months — same as the live sync.
 *
 * Body: {
 *   erp_token:      string  (REQUIRED — ERP login access token)
 *   apply?:         boolean (default false = dry run)
 *   authoritative?: boolean (default false. true = also revoke models not listed
 *                            — only ever applies to orgs covered by source A)
 *   sample_limit?:  number  (default 2000, max 20000)
 * }
 *
 * Auth: super_admin JWT (monitoring).
 * --------------------------------------------------------------------------
 */

const ERP_URL = "https://qcafxvshponbvjfmwvec.supabase.co";
const ERP_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjYWZ4dnNocG9uYnZqZm13dmVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NjU4ODYsImV4cCI6MjA2NDQ0MTg4Nn0.76yHHNI58oc2QEpx-kt_FhCTdRGlW-ViXmtAMHmm0oc";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function withCors(response: Response): Response {
  const h = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => h.set(k, v));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
}
function json(body: unknown, status = 200): Response {
  return withCors(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}
function jsonError(message: string, status: number): Response {
  return json({ success: false, message }, status);
}

/// Recovers the raw JWT from whatever was pasted (quotes, "Bearer ",
/// textarea line breaks, or a whole localStorage session blob).
function sanitizeErpToken(raw: unknown): string {
  let t = String(raw ?? "").trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      const p = JSON.parse(t);
      const o = Array.isArray(p) ? (p[1] ?? p[0]) : p;
      t = o?.access_token ?? o?.currentSession?.access_token ?? o?.session?.access_token ?? "";
    } catch { /* not JSON */ }
  }
  t = String(t).replace(/^\s*["']|["']\s*$/g, "").replace(/^Bearer\s+/i, "").replace(/\s+/g, "");
  return t;
}

/// Same normalization the live sync uses, so matching is identical.
function normalizeModelName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
const modelKey = (name: string, duration: number | null) =>
  `${normalizeModelName(name)}|${duration ?? ""}`;

interface Model { name: string; duration: number | null }

async function erpFetchAll<T>(
  path: string,
  erpToken: string,
): Promise<{ rows: T[]; error?: string }> {
  const PAGE = 1000;
  let offset = 0;
  const out: T[] = [];
  while (true) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${ERP_URL}/rest/v1/${path}${sep}limit=${PAGE}&offset=${offset}`, {
      headers: { apikey: ERP_ANON, Authorization: `Bearer ${erpToken}` },
    });
    if (!res.ok) return { rows: out, error: `${res.status}: ${(await res.text()).slice(0, 300)}` };
    const rows = (await res.json()) as T[];
    if (!rows.length) break;
    out.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return { rows: out };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return withCors(new Response("ok"));
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError("Missing authorization header", 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return jsonError("Invalid or expired token", 401);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "super_admin") {
    return jsonError("Access denied. Super admin role required.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const erpToken = sanitizeErpToken(body?.erp_token);
  if (!erpToken) return jsonError("Provide erp_token (your ERP login access token).", 400);
  if (erpToken.split(".").length !== 3) {
    return jsonError("That doesn't look like a valid ERP access token (needs 3 dot-separated parts).", 400);
  }
  const apply = body?.apply === true;
  const authoritative = body?.authoritative === true;
  const sampleLimit = Math.min(Math.max(typeof body?.sample_limit === "number" ? body.sample_limit : 2000, 0), 20000);

  // ══ SOURCE B: ERP order history (sales_reference -> model) ══════════════
  const refToModel = new Map<string, Model>();
  const statusesSeen = new Map<string, number>();
  {
    const { rows, error } = await erpFetchAll<{
      sales_reference: string | null;
      sales_models: { model_name: string | null; payment_duration_months: number | null; status: string | null } | null;
    }>(
      "sales_orders?select=sales_reference,sales_models(model_name,payment_duration_months,status)&sales_model_id=not.is.null",
      erpToken,
    );
    if (error) return jsonError(`ERP sales_orders fetch failed (${error})`, 502);
    for (const r of rows) {
      const ref = String(r.sales_reference ?? "").trim();
      const name = String(r.sales_models?.model_name ?? "").trim();
      if (!ref || !name) continue;
      const st = String(r.sales_models?.status ?? "(none)").trim() || "(none)";
      statusesSeen.set(st, (statusesSeen.get(st) ?? 0) + 1);
      refToModel.set(ref, { name, duration: r.sales_models?.payment_duration_months ?? null });
    }
  }

  // ══ SOURCE A: explicit partner entitlements (new table, may be empty) ═══
  const partnerIdToModels = new Map<string, Model[]>();
  {
    const { rows } = await erpFetchAll<{
      partners_manager: { partner_id: string | null } | null;
      sales_models: { model_name: string | null; payment_duration_months: number | null; status: string | null } | null;
    }>(
      "partner_sales_models?select=partners_manager(partner_id),sales_models(model_name,payment_duration_months,status)",
      erpToken,
    );
    for (const r of rows) {
      const pid = String(r.partners_manager?.partner_id ?? "").trim();
      const name = String(r.sales_models?.model_name ?? "").trim();
      if (!pid || !name) continue;
      if (String(r.sales_models?.status ?? "").toLowerCase() !== "published") continue;
      const list = partnerIdToModels.get(pid) ?? [];
      const m: Model = { name, duration: r.sales_models?.payment_duration_months ?? null };
      if (!list.some((x) => modelKey(x.name, x.duration) === modelKey(m.name, m.duration))) list.push(m);
      partnerIdToModels.set(pid, list);
    }
  }

  if (refToModel.size === 0 && partnerIdToModels.size === 0) {
    return json({
      success: false,
      message:
        "The ERP has no sales-model data to backfill from: 0 orders carry a sales_model_id and partner_sales_models is empty. Nothing can be derived.",
      diagnostics: { order_models: 0, partner_entitlements: 0 },
    }, 422);
  }

  // ══ MONITORING: sales_reference -> organization_id, via stove rows ══════
  const orgsForRef = new Map<string, Set<string>>();
  {
    const PAGE = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("stove_ids_base")
        .select("sales_reference, organization_id")
        .not("organization_id", "is", null)
        .not("sales_reference", "is", null)
        .range(offset, offset + PAGE - 1);
      if (error) return jsonError(`Failed to read stove_ids_base: ${error.message}`, 500);
      if (!data || data.length === 0) break;
      for (const r of data) {
        const ref = String(r.sales_reference ?? "").trim();
        const org = r.organization_id as string;
        if (!ref || !org) continue;
        const set = orgsForRef.get(ref) ?? new Set<string>();
        set.add(org);
        orgsForRef.set(ref, set);
      }
      if (data.length < PAGE) break;
      offset += PAGE;
    }
  }

  // Organizations (for names + partner_id matching of source A)
  const orgName = new Map<string, string>();
  const orgIdByPartnerId = new Map<string, string>();
  {
    const PAGE = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, partner_id, partner_name")
        .range(offset, offset + PAGE - 1);
      if (error) return jsonError(`Failed to read organizations: ${error.message}`, 500);
      if (!data || data.length === 0) break;
      for (const o of data) {
        orgName.set(o.id as string, (o.partner_name as string) ?? "");
        const pid = String(o.partner_id ?? "").trim();
        if (pid) orgIdByPartnerId.set(pid, o.id as string);
      }
      if (data.length < PAGE) break;
      offset += PAGE;
    }
  }

  // ══ Build desired model set per organization ════════════════════════════
  const desiredByOrg = new Map<string, Map<string, Model>>();
  const addModel = (org: string, m: Model) => {
    const map = desiredByOrg.get(org) ?? new Map<string, Model>();
    map.set(modelKey(m.name, m.duration), m);
    desiredByOrg.set(org, map);
  };

  let refsMatched = 0;
  let refsUnmatched = 0;
  for (const [ref, model] of refToModel) {
    const orgs = orgsForRef.get(ref);
    if (!orgs || orgs.size === 0) { refsUnmatched++; continue; }
    refsMatched++;
    for (const org of orgs) addModel(org, model);
  }

  const orgsCoveredBySourceA = new Set<string>();
  for (const [pid, models] of partnerIdToModels) {
    const org = orgIdByPartnerId.get(pid);
    if (!org) continue;
    orgsCoveredBySourceA.add(org);
    for (const m of models) addModel(org, m);
  }

  // ══ Monitoring payment_models + existing assignments ════════════════════
  const modelIdByKey = new Map<string, string>();
  {
    const { data, error } = await supabase.from("payment_models").select("id, name, duration_months");
    if (error) return jsonError(`Failed to read payment_models: ${error.message}`, 500);
    for (const m of data || []) modelIdByKey.set(modelKey(m.name as string, (m.duration_months as number) ?? null), m.id as string);
  }

  const existingByOrg = new Map<string, Set<string>>();
  {
    const PAGE = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("organization_payment_models")
        .select("organization_id, payment_model_id")
        .range(offset, offset + PAGE - 1);
      if (error) return jsonError(`Failed to read organization_payment_models: ${error.message}`, 500);
      if (!data || data.length === 0) break;
      for (const l of data) {
        const set = existingByOrg.get(l.organization_id as string) ?? new Set<string>();
        set.add(l.payment_model_id as string);
        existingByOrg.set(l.organization_id as string, set);
      }
      if (data.length < PAGE) break;
      offset += PAGE;
    }
  }

  // Models referenced by the ERP that don't exist here yet
  const missingModels = new Map<string, Model>();
  for (const map of desiredByOrg.values()) {
    for (const [key, m] of map) if (!modelIdByKey.has(key)) missingModels.set(key, m);
  }

  // Create stubs (apply only) so assignments can reference them.
  let modelsCreated = 0;
  if (apply && missingModels.size > 0) {
    for (const [key, m] of missingModels) {
      const { data: stub, error } = await supabase
        .from("payment_models")
        .insert({
          name: m.name,
          description: `Auto-created by sales-model backfill on ${new Date().toISOString().slice(0, 10)} — pricing needs review`,
          duration_months: m.duration ?? 0,
          fixed_price: 0,
          min_down_payment: 0,
          is_active: true,
        })
        .select("id")
        .single();
      if (error) continue;
      modelIdByKey.set(key, stub.id as string);
      modelsCreated++;
    }
  }

  // ══ Plan ════════════════════════════════════════════════════════════════
  const toInsert: Array<{ organization_id: string; payment_model_id: string; assigned_at: string }> = [];
  const toDelete: Array<{ organization_id: string; payment_model_id: string }> = [];
  const planned: Array<{ organization_id: string; partner_name: string; add: string[]; remove: number }> = [];
  let alreadyComplete = 0;

  for (const [org, wanted] of desiredByOrg) {
    const desiredIds = new Set<string>();
    const addNames: string[] = [];
    for (const [key, m] of wanted) {
      const id = modelIdByKey.get(key);
      if (id) desiredIds.add(id);
      else addNames.push(`${m.name}${m.duration ? ` (${m.duration}m)` : ""} [model not created yet]`);
    }

    const current = existingByOrg.get(org) ?? new Set<string>();
    const add = [...desiredIds].filter((id) => !current.has(id));
    // Only revoke for orgs whose entitlements came from the authoritative list.
    const remove = authoritative && orgsCoveredBySourceA.has(org)
      ? [...current].filter((id) => !desiredIds.has(id))
      : [];

    if (add.length === 0 && remove.length === 0 && addNames.length === 0) { alreadyComplete++; continue; }

    for (const id of add) {
      toInsert.push({ organization_id: org, payment_model_id: id, assigned_at: new Date().toISOString() });
      for (const [key, m] of wanted) {
        if (modelIdByKey.get(key) === id) addNames.push(`${m.name}${m.duration ? ` (${m.duration}m)` : ""}`);
      }
    }
    for (const id of remove) toDelete.push({ organization_id: org, payment_model_id: id });

    planned.push({ organization_id: org, partner_name: orgName.get(org) ?? "", add: addNames, remove: remove.length });
  }

  // ══ Apply ═══════════════════════════════════════════════════════════════
  let inserted = 0;
  let removed = 0;
  if (apply) {
    for (let i = 0; i < toInsert.length; i += 500) {
      const chunk = toInsert.slice(i, i + 500);
      const { error } = await supabase.from("organization_payment_models").insert(chunk);
      if (!error) inserted += chunk.length;
    }
    for (const d of toDelete) {
      const { error } = await supabase
        .from("organization_payment_models")
        .delete()
        .eq("organization_id", d.organization_id)
        .eq("payment_model_id", d.payment_model_id);
      if (!error) removed++;
    }
  }

  const cap = <T>(a: T[]) => ({ count: a.length, truncated: a.length > sampleLimit, sample: a.slice(0, sampleLimit) });

  return json({
    success: true,
    mode: apply ? "apply" : "dry_run",
    authoritative,
    generated_at: new Date().toISOString(),
    diagnostics: {
      erp_orders_with_model: refToModel.size,
      erp_partner_entitlements: partnerIdToModels.size,
      order_refs_matched_to_org: refsMatched,
      order_refs_with_no_org_here: refsUnmatched,
      model_statuses_seen: Object.fromEntries(statusesSeen),
    },
    totals: {
      orgs_with_derived_models: desiredByOrg.size,
      partners_needing_changes: planned.length,
      partners_already_complete: alreadyComplete,
      assignments_to_add: toInsert.length,
      assignments_to_remove: toDelete.length,
      models_missing_locally: missingModels.size,
      models_created: modelsCreated,
      assignments_added: inserted,
      assignments_removed: removed,
    },
    buckets: {
      partners_to_update: cap(planned),
      models_that_need_creating: cap([...missingModels.values()]),
      unmatched_order_refs: cap([...refToModel.keys()].filter((r) => !orgsForRef.has(r))),
    },
    note: apply
      ? `Applied. ${inserted} assignment(s) added${authoritative ? `, ${removed} revoked` : ""}, ${modelsCreated} model(s) created.`
      : "DRY RUN — nothing was written. Review, then Apply.",
  });
});
