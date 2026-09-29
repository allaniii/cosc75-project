import { createClient } from "@supabase/supabase-js";
const inferredBase = () => {
  const p = location.pathname.split("/");
  p.pop();
  if (["admin", "driver"].includes(p.at(-1))) p.pop();
  return p.join("/") + "/";
};
export const appBase = (
  import.meta.env.VITE_APP_BASE || inferredBase()
).replace(/\/?$/, "/");
export const url = (path) => appBase + path.replace(/^\//, "");
const endpoint = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured =
  !!endpoint &&
  !!key &&
  !endpoint.includes("YOUR_PROJECT") &&
  !key.includes("YOUR_KEY");
let client;
export function db() {
  if (!configured)
    throw new Error(
      "Setup required: copy .env.example to .env.local, enter your Supabase URL and publishable key, then restart the development server or rebuild. See README.md.",
    );
  return (client ||= createClient(endpoint, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }));
}
