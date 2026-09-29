import { db } from "../config/supabase.js";
const pending = new Map();
export async function check(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
export async function all(table) {
  let rows = [],
    page = 0;
  while (true) {
    const data = await check(
      db()
        .from(table)
        .select("*")
        .order("id")
        .range(page * 500, page * 500 + 499),
    );
    rows.push(...data);
    if (data.length < 500) return rows;
    page++;
  }
}
export async function snapshot(tables) {
  return Object.fromEntries(
    await Promise.all(tables.map(async (t) => [t, await all(t)])),
  );
}
export async function mutate(action, payload = {}) {
  const key = JSON.stringify([action, payload]);
  const id = pending.get(key) || crypto.randomUUID();
  pending.set(key, id);
  try {
    const result = await check(
      db().rpc("perform_action", { action, payload, request_id: id }),
    );
    pending.delete(key);
    return result;
  } catch (e) {
    throw e;
  }
}
