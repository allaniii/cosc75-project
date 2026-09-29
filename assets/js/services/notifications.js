import { db } from "../config/supabase.js";
import { all, mutate } from "./api.js";
export const notifications = () => all("notifications");
export const markRead = (id) => mutate("notification_read", { id });
export function realtime(tables, refresh) {
  let timer;
  const request = () => {
    clearTimeout(timer);
    timer = setTimeout(refresh, 180);
  };
  const live = (status) =>
    document.querySelectorAll("[data-live]").forEach((n) => {
      n.textContent =
        status === "SUBSCRIBED"
          ? "● Live"
          : status === "CHANNEL_ERROR"
            ? "Disconnected · retrying"
            : "Connecting…";
      n.classList.toggle("connected", status === "SUBSCRIBED");
    });
  let channel = db().channel("centritruck-" + crypto.randomUUID());
  for (const table of tables)
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      request,
    );
  channel.subscribe((status) => {
    live(status);
    if (status === "SUBSCRIBED") request();
  });
  const visibility = () => {
    if (!document.hidden) request();
  };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("online", request);
  const cleanup = () => {
    clearTimeout(timer);
    db().removeChannel(channel);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("online", request);
  };
  window.addEventListener("pagehide", cleanup, { once: true });
  return cleanup;
}
