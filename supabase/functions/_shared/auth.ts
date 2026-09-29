import { createClient } from "npm:@supabase/supabase-js@2.117.2";
export function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (
    Deno.env.get("ALLOWED_ORIGINS") ||
    "http://localhost:5173,http://localhost:4173"
  )
    .split(",")
    .map((s) => s.trim());
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "null",
    "Access-Control-Allow-Headers":
      "authorization,x-client-info,apikey,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    Vary: "Origin",
  };
}
export function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors(req),
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function identity(req: Request, adminOnly = false) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
  if (!token) throw new Error("Unauthorized");
  const url = Deno.env.get("SUPABASE_URL")!;
  const key =
    Deno.env.get("CENTRITRUCK_PUBLISHABLE_KEY") ||
    JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default ||
    Deno.env.get("SUPABASE_ANON_KEY");
  if (!key)
    throw new Error(
      "Configure the Supabase publishable key for this Edge Function.",
    );
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,role,active")
    .eq("id", data.user.id)
    .single();
  if (
    profileError ||
    !profile?.active ||
    (adminOnly && profile.role !== "administrator")
  )
    throw new Error("Forbidden");
  return { client, user: data.user, profile };
}
export function adminClient() {
  const key =
    Deno.env.get("CENTRITRUCK_SECRET_KEY") ||
    JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("Server secret key is not configured.");
  return createClient(Deno.env.get("SUPABASE_URL")!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function status(error: Error) {
  return error.message === "Unauthorized"
    ? 401
    : error.message === "Forbidden"
      ? 403
      : 400;
}
