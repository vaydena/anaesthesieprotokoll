// aprot-check-token — validiert den Kunden-Token, liefert nur Branding zurück.
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
    const rows = await sql`
      select branding
      from aprot.customers
      where token = ${token} and active = true
      limit 1`;
    if (rows.length === 0) return json({ valid: false });
    return json({ valid: true, branding: rows[0].branding || {} });
  } catch (e) {
    console.error("check-token error", String(e));
    // 500 -> Client zeigt "Verbindungsproblem" statt "ungültig"
    return json({ valid: false, error: "server_error" }, 500);
  }
});
