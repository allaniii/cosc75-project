import { db, url } from "../config/supabase.js";
import { check } from "./api.js";
export async function profile() {
  const { data, error } = await db().auth.getUser();
  if (error || !data.user) return null;
  return check(
    db().from("profiles").select("*").eq("id", data.user.id).maybeSingle(),
  );
}
export const signIn = (email, password) =>
  check(db().auth.signInWithPassword({ email, password }));
export async function signOut() {
  await check(db().auth.signOut());
  location.href = url("login.html");
}
export async function guard(role) {
  const p = await profile();
  if (!p?.active) {
    location.replace(url("login.html"));
    return null;
  }
  const portal = p.role === "administrator" ? "admin" : "driver";
  if (role && role !== portal) {
    location.replace(url(portal + "/dashboard.html"));
    return null;
  }
  return p;
}
export async function home() {
  const p = await profile();
  location.replace(
    url(
      p?.active
        ? (p.role === "administrator" ? "admin" : "driver") + "/dashboard.html"
        : "login.html",
    ),
  );
}
export const recover = (email) =>
  check(
    db().auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + url("reset-password.html"),
    }),
  );
export const updatePassword = (password) =>
  check(db().auth.updateUser({ password }));
