// aprot-record-usage — bucht eine anonyme Nutzung, idempotent über visit_id.
// Body {token, visit_id}. 403 bei gesperrtem Kunden, 400 bei ungültig -> Client verwirft.
// KEINE Personendaten, KEINE IP-Protokollierung.
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const { token, visit_id } = await req.json().catch(() => ({}));
    if (!token || !visit_id || typeof token !== "string" || typeof visit_id !== "string") {
      return json({ error: "bad_request" }, 400);
    }
    const cust = await sql`
      select id, active from aprot.customers where token = ${token} limit 1`;
    if (cust.length === 0) return json({ error: "invalid_token" }, 400);
    if (cust[0].active !== true) return json({ error: "inactive" }, 403);
    await sql`
      insert into aprot.usage (customer_id, visit_id, finalized_at)
      values (${cust[0].id}, ${visit_id}, now())
      on conflict (visit_id) do nothing`;
    return json({ ok: true });
  } catch (e) {
    console.error("record-usage error", String(e));
    return json({ error: "server_error" }, 500);
  }
});
