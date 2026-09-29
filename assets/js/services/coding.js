import { mutate, check } from "./api.js";
import { db } from "../config/supabase.js";
export const saveRule = (p) => mutate("coding_save", p);
export const checkCoding = (
  truck_id,
  area_id,
  starts_at = new Date().toISOString(),
  ends_at = new Date(Date.now() + 60000).toISOString(),
) => check(db().rpc("check_coding", { truck_id, area_id, starts_at, ends_at }));
export const saveArea = (p) => mutate("area_save", p);
