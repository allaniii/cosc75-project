import { identity, adminClient, cors, json, status } from "../_shared/auth.ts";
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: cors(req) });
  if (req.method !== "POST")
    return json(req, { error: "Method not allowed" }, 405);
  try {
    const { user, profile } = await identity(req);
    if (profile.role !== "driver") throw new Error("Forbidden");
    const form = await req.formData(),
      file = form.get("photo");
    if (!(file instanceof File) || file.size === 0 || file.size > 5242880)
      throw new Error("Choose an image no larger than 5 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const jpeg =
      bytes.length > 16 &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255 &&
      bytes.at(-2) === 255 &&
      bytes.at(-1) === 217;
    const png =
      bytes.length > 32 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) &&
      String.fromCharCode(...bytes.slice(12, 16)) === "IHDR";
    const webp =
      bytes.length > 16 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" &&
      new DataView(bytes.buffer).getUint32(4, true) + 8 === bytes.length;
    const mime = jpeg
      ? "image/jpeg"
      : png
        ? "image/png"
        : webp
          ? "image/webp"
          : null;
    if (!mime || file.type !== mime)
      throw new Error("The image content must match JPEG, PNG, or WebP.");
    const path = `${user.id}/${crypto.randomUUID()}.${jpeg ? "jpg" : png ? "png" : "webp"}`;
    const { error } = await adminClient()
      .storage.from("maintenance-images")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (error) throw error;
    return json(req, { path });
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    return json(req, { error: error.message }, status(error));
  }
});
