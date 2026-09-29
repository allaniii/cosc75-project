import { db, url } from "../config/supabase.js";
import { guard, signOut } from "../services/auth.js";
import { snapshot, check } from "../services/api.js";
import {
  notifications,
  markRead,
  realtime,
} from "../services/notifications.js";
import {
  $,
  $$,
  el,
  text,
  message,
  wireDialogs,
  wireTabs,
} from "../utils/dom.js";
const admin = [
  [
    "dashboard",
    "Dashboard",
    "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  ],
  [
    "trucks",
    "Trucks",
    "M2 5h12v12H2z M14 10h5l3 4v3h-8 M5 17a2 2 0 1 0 0 4a2 2 0 1 0 0-4 M18 17a2 2 0 1 0 0 4a2 2 0 1 0 0-4",
  ],
  ["dispatch", "Dispatch", "M3 7h18 M3 17h18 M16 2l5 5-5 5 M8 12l-5 5 5 5"],
  [
    "maintenance",
    "Maintenance",
    "M4 3l17 18 M21 3L3 21 M2 3l4-1 1 4 M18 19l4 3",
  ],
  [
    "attendance",
    "Attendance",
    "M3 5h18v16H3z M7 2v6 M17 2v6 M3 10h18 M8 14h3 M14 14h3",
  ],
  ["reports", "Reports", "M3 21V3 M3 21h19 M7 16v-5 M12 16V7 M17 16V4"],
  ["settings", "Settings", "M4 7h16 M4 17h16 M8 4v6 M16 14v6"],
];
const driver = [
  admin[0],
  admin[4],
  ["my-truck", "My Truck", admin[1][2]],
  ["delivery-status", "Delivery Status", admin[2][2]],
  admin[3],
];
export async function boot(role, load, render) {
  const state = { profile: null, data: {}, refresh: null };
  try {
    state.profile = await guard(role);
    if (!state.profile) return null;
    const menu = role === "admin" ? admin : driver;
    const current = document.body.dataset.page;
    const title = menu.find((x) => x[0] === current)?.[1] || "";
    $("#sidebar").innerHTML =
      `<a class="brand" href="${url(role + "/dashboard.html")}">Centri<span>Truck</span></a><nav>${menu.map(([p, l, path]) => `<a class="nav-link ${p === current ? "active" : ""}" ${p === current ? 'aria-current="page"' : ""} href="${url(role + "/" + p + ".html")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>${l}</a>`).join("")}</nav><div class="sidebar-footer"><a class="nav-link" id="owner-link" hidden>☎ Contact Owner</a><button class="nav-link" id="sign-out">⇥ Sign Out</button></div>`;
    $("#topbar").innerHTML =
      `<div class="flex"><button class="icon-button menu-toggle" id="menu-toggle" aria-label="Toggle navigation" aria-expanded="false">☰</button><div class="crumb">${role === "admin" ? "Admin" : "Driver"} &nbsp; / &nbsp; <strong>${title}</strong></div></div><div class="user"><button class="icon-button" id="notification-bell" aria-label="Notifications" aria-expanded="false">♧ <span id="unread-count"></span></button><span class="avatar" id="avatar"></span><div class="user-info"><div id="user-name" class="user-name"></div><small>${role === "admin" ? "Administrator" : "Driver"}</small></div></div><section class="notification-panel" id="notification-panel" hidden aria-label="Notifications"><h2>Notifications</h2><div id="notification-list"></div></section>`;
    text("user-name", state.profile.full_name);
    text(
      "avatar",
      state.profile.full_name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join(""),
    );
    $("#sign-out").onclick = () => signOut().catch((e) => message(e.message));
    $("#menu-toggle").onclick = () => {
      const open = $("#sidebar").classList.toggle("open");
      $("#menu-toggle").setAttribute("aria-expanded", String(open));
    };
    $("#notification-bell").onclick = () => {
      const n = $("#notification-panel");
      n.hidden = !n.hidden;
      $("#notification-bell").setAttribute("aria-expanded", String(!n.hidden));
    };
    wireDialogs();
    wireTabs();
    let running = false,
      again = false;
    state.refresh = async () => {
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        const result = await load(state);
        state.data = result;
        await render(state);
        await renderNotifications();
        const company = result.company_settings?.[0];
        if (company?.owner_phone) {
          const a = $("#owner-link");
          a.href = "tel:" + company.owner_phone.replace(/[^+0-9]/g, "");
          a.hidden = false;
        }
      } catch (e) {
        message(e.message);
        $$("td.empty").forEach((n) => {
          if (n.textContent.includes("Loading"))
            n.textContent =
              "Records unavailable. Check the message above and retry.";
        });
      } finally {
        running = false;
        if (again) {
          again = false;
          state.refresh();
        }
      }
    };
    $("#refresh").onclick = () => state.refresh();
    db().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") location.replace(url("login.html"));
    });
    await state.refresh();
    return state;
  } catch (e) {
    message(e.message);
    $$("td.empty").forEach(
      (n) => (n.textContent = "Connect Supabase to load records."),
    );
    return null;
  }
}
export async function renderNotifications() {
  const records = (await notifications()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  text("unread-count", records.filter((x) => !x.read_at).length || "");
  const host = $("#notification-list");
  if (!host) return;
  host.replaceChildren();
  if (!records.length) {
    host.append(el("p", "No notifications yet.", "muted"));
    return;
  }
  for (const n of records.slice(0, 50)) {
    const row = el(
      "div",
      undefined,
      "notification-item " + (!n.read_at ? "unread" : ""),
    );
    const a = el("a", n.title);
    a.href = url(n.destination);
    row.append(a);
    if (!n.read_at) {
      const b = el("button", "Mark as read", "button secondary small");
      b.onclick = async () => {
        try {
          await markRead(n.id);
          await renderNotifications();
        } catch (e) {
          message(e.message);
        }
      };
      row.append(b);
    }
    host.append(row);
  }
}
export function watch(state, tables) {
  if (state)
    realtime([...new Set([...tables, "notifications"])], state.refresh);
}
export const fleetTables = [
  "trucks",
  "profiles",
  "drivers",
  "driver_truck_assignments",
  "dispatches",
  "maintenance_reports",
  "maintenance_schedules",
  "company_settings",
  "coding_areas",
];
export const loadFleet = async () => {
  const data = await snapshot(fleetTables);
  data.truck_states = Object.fromEntries(
    await Promise.all(
      data.trucks.map(async (t) => [
        t.id,
        await check(db().rpc("truck_state", { truck_id: t.id })),
      ]),
    ),
  );
  return data;
};
