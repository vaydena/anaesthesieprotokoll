// aprot-record-usage — bucht einen anonymen Fall, idempotent über visit_id.
// Body {token, visit_id}. 403 bei gesperrtem Zugang, 400 bei ungültig -> Client verwirft.
// KEINE Personendaten, KEINE IP-Protokollierung.
//
// Praxis-Zugang (anaesthesie.practices): der Fall wird in anaesthesie.visits gebucht –
// dieselbe Tabelle wie beim Aufklärungsbogen. Wurde der Fall per QR übergeben, trägt er
// dieselbe Fall-ID und ist dort bereits gezählt -> keine zweite Berechnung (1 € pro Fall).
// Eigenständiger Protokoll-Kunde (aprot.customers): wie bisher in aprot.usage.
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // 1. Praxis-Zugang -> gemeinsame Fall-Tabelle
    const pr = await sql`
      select id, active, plan, trial_ends_at
      from anaesthesie.practices where token = ${token} limit 1`;
    if (pr.length > 0) {
      const p = pr[0];
      if (!UUID_RE.test(visit_id)) return json({ error: "bad_visit_id" }, 400);
      if (p.plan === "trial" && p.trial_ends_at && new Date(p.trial_ends_at).getTime() < Date.now()) {
        if (p.active) {
          try { await sql`update anaesthesie.practices set active = false where id = ${p.id} and active = true`; } catch (_e) { /* ignore */ }
        }
        return json({ error: "trial_expired" }, 403);
      }
      if (p.active !== true) return json({ error: "inactive" }, 403);
      const ins = await sql`
        insert into anaesthesie.visits (id, practice_id)
        values (${visit_id.toLowerCase()}, ${p.id})
        on conflict (id) do nothing
        returning id`;
      return json({ ok: true, counted: ins.length > 0 });
    }

    // 2. eigenständiger Protokoll-Kunde (Altbestand)
    const cust = await sql`
      select id, active from aprot.customers where token = ${token} limit 1`;
    if (cust.length === 0) return json({ error: "invalid_token" }, 400);
    if (cust[0].active !== true) return json({ error: "inactive" }, 403);
    const ins = await sql`
      insert into aprot.usage (customer_id, visit_id, finalized_at)
      values (${cust[0].id}, ${visit_id}, now())
      on conflict (visit_id) do nothing
      returning id`;
    return json({ ok: true, counted: ins.length > 0 });
  } catch (e) {
    console.error("record-usage error", String(e));
    return json({ error: "server_error" }, 500);
  }
});
