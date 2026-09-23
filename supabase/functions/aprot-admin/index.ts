// aprot-admin — Betreiber-CRUD. Auth per Header x-admin-key (SHA-256, konstantzeitig).
// verify_jwt = false. Actions: list, set_active, get_practice, save_practice, create_practice.
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function authOk(req: Request): Promise<boolean> {
  const key = req.headers.get("x-admin-key") || "";
  if (!key) return false;
  const hash = await sha256Hex(key);
  const rows = await sql`select key_hash from aprot.admin_auth where id = 1 limit 1`;
  if (rows.length === 0) return false;
  return constEq(hash, rows[0].key_hash || "");
}

function genToken(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return "apt_" + out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    if (!(await authOk(req))) return json({ error: "unauthorized" }, 401);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = body.action;

    if (action === "list") {
      const rows = await sql`
        select c.id, c.name, c.token, c.active, c.contact_email, c.created_at,
               coalesce(u.total, 0)::int as bogen_total,
               coalesce(u.offen, 0)::int as bogen_offen,
               (c.branding ? 'header_name') as configured,
               (c.branding ? 'logo') as has_logo
        from aprot.customers c
        left join (
          select customer_id,
                 count(*) as total,
                 count(*) filter (where billed = false) as offen
          from aprot.usage
          group by customer_id
        ) u on u.customer_id = c.id
        order by c.created_at desc`;
      return json({ customers: rows });
    }

    if (action === "set_active") {
      const customer_id = body.customer_id;
      const active = !!body.active;
      if (!customer_id) return json({ error: "bad_request" }, 400);
      await sql`update aprot.customers set active = ${active} where id = ${customer_id}`;
      return json({ ok: true });
    }

    if (action === "get_practice") {
      const customer_id = body.customer_id;
      if (!customer_id) return json({ error: "bad_request" }, 400);
      const rows = await sql`
        select id, name, token, active, contact_email, branding, created_at
        from aprot.customers where id = ${customer_id} limit 1`;
      if (rows.length === 0) return json({ error: "not_found" }, 404);
      return json({ practice: rows[0] });
    }

    if (action === "save_practice") {
      const customer_id = body.customer_id;
      if (!customer_id) return json({ error: "bad_request" }, 400);
      const contact_email = (body.contact_email as string) || null;
      const branding = body.branding || {};
      // postgres.js-Falle: Objekt binden, NICHT JSON.stringify -> sonst jsonb-String
      await sql`
        update aprot.customers
        set contact_email = ${contact_email},
            branding = ${branding}::jsonb
        where id = ${customer_id}`;
      return json({ ok: true });
    }

    if (action === "create_practice") {
      const name = (body.name as string) || "Neue Praxis";
      const token = genToken();
      const rows = await sql`
        insert into aprot.customers (token, name, active, branding)
        values (${token}, ${name}, true, '{}'::jsonb)
        returning id, token, name`;
      return json({ ok: true, customer: rows[0] });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("admin error", String(e));
    return json({ error: "server_error" }, 500);
  }
});
