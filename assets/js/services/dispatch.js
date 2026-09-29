import { mutate, check } from "./api.js";
import { db } from "../config/supabase.js";
export const saveDispatch = (p) => mutate("dispatch_save", p);
export const cancelDispatch = (id) => mutate("dispatch_cancel", { id });
export const confirmDelivery = (id, status) =>
  mutate("delivery_status", { id, status });
export const eligibility = (p) => check(db().rpc("check_eligibility", p));
