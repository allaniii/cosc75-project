import { boot, watch, fleetTables } from "../../components/shell.js";
import { snapshot } from "../../services/api.js";
import { truck, person, attendanceRows } from "../../components/data.js";
import { text, table, badge, plate, definition, el } from "../../utils/dom.js";
import {
  dateKey,
  lastDays,
  activeTrip,
  truckStatus,
  label,
  stamp,
  maintenanceDue,
} from "../../utils/format.js";
import { chart } from "../../components/chart.js";
const tables = [...fleetTables, "attendance"];
const state = await boot(
  "admin",
  () => snapshot(tables),
  ({ data: d }) => {
    const trucks = d.trucks.filter((t) => !t.archived),
      open = d.dispatches.filter(activeTrip);
    text("truck-count", trucks.length);
    text("active-count", open.length);
    const alerts = d.maintenance_reports.filter(
      (r) =>
        ["high", "urgent"].includes(r.priority) &&
        ["submitted", "reviewed"].includes(r.review_state),
    );
    const due = d.maintenance_schedules.filter(
      (j) =>
        ["scheduled", "in_progress"].includes(j.status) &&
        new Date(j.scheduled_at) <=
          new Date(Date.now() + d.company_settings[0].due_soon_days * 86400000),
    );
    text("alert-count", alerts.length + due.length);
    const first = truck(d, open[0]?.truck_id) || trucks[0];
    definition(
      "truck-info",
      first
        ? {
            "Truck ID": first.code,
            "Plate Number": plate(first.plate),
            "Truck Status": badge(label(truckStatus(first, d))),
          }
        : { Fleet: "No trucks registered yet" },
    );
    const days = lastDays();
    chart(
      "weekly-chart",
      days.map((x) =>
        new Date(x + "T12:00:00+08:00").toLocaleDateString("en", {
          weekday: "short",
        }),
      ),
      [
        {
          label: "Dispatches",
          data: days.map(
            (day) =>
              d.dispatches.filter((x) => dateKey(x.starts_at) === day).length,
          ),
        },
      ],
    );
    table(
      "recent-body",
      [...d.dispatches]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5)
        .map((x) => [
          x.code,
          `${x.pickup} → ${x.destination}`,
          badge(label(x.status)),
        ]),
      3,
    );
    const host = document.getElementById("alerts-list");
    host.replaceChildren();
    for (const a of alerts.slice(0, 5))
      host.append(
        el(
          "p",
          `${truck(d, a.truck_id)?.code} · ${a.category} · ${label(a.priority)}`,
        ),
      );
    for (const a of due.slice(0, 5))
      host.append(
        el(
          "p",
          `${truck(d, a.truck_id)?.code} · ${a.service_type} · ${stamp(a.scheduled_at)}`,
        ),
      );
    if (!alerts.length && !due.length)
      host.append(el("p", "No maintenance alerts.", "muted"));
    table(
      "attendance-body",
      attendanceRows(
        d.attendance.filter(
          (a) => !a.time_out || dateKey(a.time_in) === dateKey(),
        ),
        d,
      ),
      6,
    );
    table(
      "delivery-body",
      open.map((x) => [
        person(d, x.driver_id),
        plate(truck(d, x.truck_id)?.plate),
        `${x.pickup} → ${x.destination}`,
        badge(label(x.status)),
        stamp(x.updated_at),
      ]),
      5,
    );
    table(
      "reports-body",
      d.maintenance_reports
        .filter((r) => ["submitted", "reviewed"].includes(r.review_state))
        .map((x) => [
          x.id.slice(0, 8),
          person(d, x.reporter_id),
          plate(truck(d, x.truck_id)?.plate),
          x.category,
          badge(x.priority),
          badge(x.review_state),
        ]),
      6,
    );
  },
);
watch(state, tables);
