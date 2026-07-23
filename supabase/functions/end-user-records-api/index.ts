// Public API endpoint for End User Records.
// Authenticated via a static bearer API key stored as the
// END_USER_RECORDS_API_KEY edge function secret. Reads via service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function withCors(res: Response): Response {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

function json(status: number, body: unknown): Response {
  return withCors(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function extractBearer(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const xkey = req.headers.get("x-api-key");
  if (xkey) return xkey.trim();
  return null;
}

interface Params {
  page: number;
  limit: number;
  dateFrom?: string;
  dateTo?: string;
  state?: string;
  lga?: string;
  partner_id?: string;
  search?: string;
  include_cancelled: boolean;
}

async function parseParams(req: Request): Promise<Params> {
  const url = new URL(req.url);
  const q = url.searchParams;
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { body = {}; }
  }
  const get = (k: string): string | undefined => {
    const v = body[k] ?? q.get(k);
    return v == null || v === "" ? undefined : String(v);
  };
  const page = Math.max(1, parseInt(get("page") || "1", 10) || 1);
  const rawLimit = parseInt(get("limit") || "100", 10) || 100;
  const limit = Math.min(Math.max(1, rawLimit), 500);
  const includeCancelledRaw = get("include_cancelled");
  const include_cancelled = includeCancelledRaw === "true" || includeCancelledRaw === "1";
  return {
    page,
    limit,
    dateFrom: get("dateFrom") || get("date_from"),
    dateTo: get("dateTo") || get("date_to"),
    state: get("state"),
    lga: get("lga"),
    partner_id: get("partner_id"),
    search: get("search"),
    include_cancelled,
  };
}

const SELECT = `
  id,
  transaction_id,
  sales_reference,
  sales_date,
  created_at,
  updated_at,
  end_user_name,
  contact_person,
  phone,
  contact_phone,
  other_phone,
  state_backup,
  lga_backup,
  address_id,
  stove_serial_no,
  partner_name,
  amount,
  total_paid,
  payment_status,
  is_installment,
  is_archived,
  status,
  retailer_branch,
  pot_quantity,
  heat_retention_device,
  previous_stove_type,
  previous_stove_other,
  meals_per_day,
  cooking_fuel_source,
  cooking_location,
  organization_id,
  created_by,
  updated_by,
  sold_on_behalf_of,
  stove_image_id,
  agreement_image_id,
  payment_model_id,
  organization:organizations!left(id, partner_name, branch, state, email),
  payment_model:payment_models!left(id, name, duration_months, fixed_price),
  address:addresses!left(id, street, city, state, country, latitude, longitude, full_address),
  stove_image:uploads!stove_image_id(id, public_id, url, type),
  agreement_image:uploads!agreement_image_id(id, public_id, url, type)
`;

async function attachProfiles(admin: any, rows: any[]) {
  const ids = new Set<string>();
  for (const r of rows) {
    for (const k of ["created_by", "updated_by", "sold_on_behalf_of"]) {
      if (r?.[k]) ids.add(r[k]);
    }
  }
  if (ids.size === 0) return;
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, email, phone, role")
    .in("id", Array.from(ids));
  const byId = new Map<string, any>();
  for (const p of data || []) byId.set(p.id, p);
  for (const r of rows) {
    r.created_by_profile = r.created_by ? byId.get(r.created_by) || null : null;
    r.updated_by_profile = r.updated_by ? byId.get(r.updated_by) || null : null;
    r.sales_agent = r.sold_on_behalf_of
      ? byId.get(r.sold_on_behalf_of) || null
      : r.created_by_profile;
  }
}

async function attachPaymentRecords(admin: any, rows: any[]) {
  const ids = rows.map((r) => r.id).filter(Boolean);
  if (ids.length === 0) return;
  const { data } = await admin
    .from("payment_records")
    .select("id, sale_id, amount, payment_date, payment_method, notes, recorded_by, created_at")
    .in("sale_id", ids)
    .order("payment_date", { ascending: true });
  const bySale = new Map<string, any[]>();
  for (const p of data || []) {
    const arr = bySale.get(p.sale_id) || [];
    arr.push(p);
    bySale.set(p.sale_id, arr);
  }
  for (const r of rows) {
    const list = bySale.get(r.id) || [];
    r.payment_records = list;
    const deposit = list[0]?.amount || 0;
    r.deposit = deposit;
    r.balance = Math.max(0, Number(r.amount || 0) - Number(r.total_paid || 0));
  }
}

async function attachCancellation(admin: any, rows: any[]) {
  const ids = rows.map((r) => r.id).filter(Boolean);
  if (ids.length === 0) return;
  const { data } = await admin
    .from("cancelled_sales")
    .select("sale_id, cancellation_reason, cancelled_by, cancelled_at")
    .in("sale_id", ids);
  const bySale = new Map<string, any>();
  for (const c of data || []) bySale.set(c.sale_id, c);
  for (const r of rows) {
    const c = bySale.get(r.id);
    r.is_cancelled = Boolean(c) || Boolean(r.is_archived);
    r.cancellation_reason = c?.cancellation_reason || null;
    r.cancelled_by = c?.cancelled_by || null;
    r.cancelled_at = c?.cancelled_at || null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return withCors(new Response("ok", { status: 200 }));

  // Auth
  const expected = Deno.env.get("END_USER_RECORDS_API_KEY") || "";
  if (!expected) return json(500, { success: false, error: "API key not configured on server" });
  const provided = extractBearer(req);
  if (!provided || !timingSafeEqual(provided, expected)) {
    return json(401, { success: false, error: "Unauthorized" });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" });
  }

  try {
    const params = await parseParams(req);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    let q = admin.from("sales").select(SELECT, { count: "exact" });
    q = params.include_cancelled ? q : q.eq("is_archived", false);
    if (params.dateFrom) q = q.gte("sales_date", params.dateFrom);
    if (params.dateTo) q = q.lte("sales_date", params.dateTo);
    if (params.state) q = q.eq("state_backup", params.state);
    if (params.lga) q = q.eq("lga_backup", params.lga);
    if (params.partner_id) q = q.eq("organization_id", params.partner_id);
    if (params.search) {
      const s = params.search.replace(/[(),]/g, " ").trim();
      q = q.or(
        [
          `end_user_name.ilike.%${s}%`,
          `contact_person.ilike.%${s}%`,
          `phone.ilike.%${s}%`,
          `contact_phone.ilike.%${s}%`,
          `stove_serial_no.ilike.%${s}%`,
          `transaction_id.ilike.%${s}%`,
          `partner_name.ilike.%${s}%`,
        ].join(",")
      );
    }

    const offset = (params.page - 1) * params.limit;
    q = q.order("sales_date", { ascending: false, nullsFirst: false });

    const { data, error, count } = await q.range(offset, offset + params.limit - 1);
    if (error) return json(500, { success: false, error: error.message });

    const rows = data || [];
    await Promise.all([
      attachProfiles(admin, rows),
      attachPaymentRecords(admin, rows),
      attachCancellation(admin, rows),
    ]);

    return json(200, {
      success: true,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / params.limit),
      },
      data: rows,
    });
  } catch (e) {
    return json(500, { success: false, error: (e as Error).message });
  }
});
