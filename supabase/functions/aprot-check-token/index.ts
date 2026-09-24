// aprot-check-token — validiert den Zugang und liefert nur Branding zurück.
// Akzeptiert zwei Zugangsarten:
//   1. Praxis-Zugang des Aufklärungsbogens (anaesthesie.practices) – gemeinsamer Link für beide Apps
//   2. eigenständiger Protokoll-Kunde (aprot.customers, Altbestand)
// verify_jwt = false (eigene Prüfung). Kein Geheimnis im Client außer Publishable Key.
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
  if (req.method !== "POST") return json({ valid: false }, 405);
  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") return json({ valid: false });

    // 1. Praxis-Zugang (gemeinsam mit dem Aufklärungsbogen, gleiche Regeln wie anaesthesie-check-token)
    const pr = await sql`
      select id, name, branding, active, plan, trial_ends_at
      from anaesthesie.practices
      where token = ${token}
      limit 1`;
    if (pr.length > 0) {
      const p = pr[0];
      if (p.plan === "trial" && p.trial_ends_at && new Date(p.trial_ends_at).getTime() < Date.now()) {
        if (p.active) {
          try { await sql`update anaesthesie.practices set active = false where id = ${p.id} and active = true`; } catch (_e) { /* ignore */ }
        }
        return json({ valid: false, reason: "trial_expired" });
      }
      if (!p.active) return json({ valid: false, reason: "locked" });
      return json({
        valid: true,
        source: "practice",
        practice_name: p.name,
        branding: p.branding || {},
        plan: p.plan,
        trial_ends_at: p.trial_ends_at,
      });
    }

    // 2. eigenständiger Protokoll-Kunde
    const rows = await sql`
      select branding
      from aprot.customers
      where token = ${token} and active = true
      limit 1`;
    if (rows.length === 0) return json({ valid: false });
    return json({ valid: true, source: "customer", branding: rows[0].branding || {} });
  } catch (e) {
    console.error("check-token error", String(e));
    // 500 -> Client zeigt "Verbindungsproblem" statt "ungültig"
    return json({ valid: false, error: "server_error" }, 500);
  }
});
