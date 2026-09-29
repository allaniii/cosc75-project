import { mutate, check } from "./api.js";
import { db } from "../config/supabase.js";
export const saveService = (p) => mutate("maintenance_save", p);
export const reviewReport = (p) => mutate("report_review", p);
export async function uploadPhoto(file, userId) {
  if (!file?.size) return null;
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Photo must be no larger than 5 MB.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png =
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const mime = jpeg
    ? "image/jpeg"
    : png
      ? "image/png"
      : webp
        ? "image/webp"
        : null;
  if (!mime || file.type !== mime)
    throw new Error("Use a valid JPEG, PNG, or WebP image.");
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("The image cannot be decoded.");
  bitmap.close();
  const body = new FormData();
  body.append("photo", file);
  const { data, error } = await db().functions.invoke("maintenance-photo", {
    body,
  });
  if (error) {
    let m = error.message;
    try {
      m = (await error.context.json()).error || m;
    } catch {}
    throw new Error(m);
  }
  if (data.error) throw new Error(data.error);
  return data.path;
}
export const reportIssue = (p) => mutate("report_issue", p);
export const photoUrl = (path) =>
  check(db().storage.from("maintenance-images").createSignedUrl(path, 60));
