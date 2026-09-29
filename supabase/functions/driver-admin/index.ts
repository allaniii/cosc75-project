import { identity, adminClient, cors, json, status } from "../_shared/auth.ts";
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: cors(req) });
  if (req.method !== "POST")
    return json(req, { error: "Method not allowed" }, 405);
  try {
    await identity(req, true);
    const p = await req.json();
    if (
      typeof p.email !== "string" ||
      !/^\S+@\S+\.\S+$/.test(p.email) ||
      typeof p.password !== "string" ||
      p.password.length < 12 ||
      typeof p.full_name !== "string" ||
      p.full_name.trim().length < 2 ||
      !p.license_number ||
      !/^\d{4}-\d{2}-\d{2}$/.test(p.license_expiry)
    )
      throw new Error(
        "Provide a valid email, 12-character password, name, and license details.",
      );
    const admin = adminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: p.email.trim().toLowerCase(),
      password: p.password,
      email_confirm: true,
    });
    if (error) throw error;
    const { error: provisionError } = await admin.rpc("provision_driver", {
      user_id: data.user.id,
      full_name: p.full_name.trim(),
      phone: p.phone || "",
      license_number: p.license_number.trim(),
      license_expiry: p.license_expiry,
    });
    if (provisionError) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(
        data.user.id,
      );
      if (cleanupError)
        throw new Error(
          "Profile creation failed and Auth cleanup failed. Ask the project owner to remove the unlinked Auth account before retrying.",
        );
      throw provisionError;
    }
    return json(req, { id: data.user.id, ok: true });
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    return json(req, { error: error.message }, status(error));
  }
});
