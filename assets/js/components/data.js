import {
  date,
  time,
  duration,
  label,
  truckStatus,
  stamp,
} from "../utils/format.js";
import { badge, plate, definition, el, table } from "../utils/dom.js";
export const truck = (data, id) => data.trucks.find((t) => t.id === id);
export const person = (data, id) =>
  data.profiles.find((p) => p.id === id)?.full_name || "—";
export const assigned = (data, truckId) =>
  data.driver_truck_assignments.find(
    (a) => a.truck_id === truckId && !a.ends_at,
  );
export const regularTruck = (data, id) =>
  truck(
    data,
    data.driver_truck_assignments.find((a) => a.driver_id === id && !a.ends_at)
      ?.truck_id,
  );
export const attendanceRows = (records, data, driver = false) =>
  records
    .sort((a, b) => b.time_in.localeCompare(a.time_in))
    .map((a) => [
      ...(!driver ? [person(data, a.driver_id)] : []),
      date(a.time_in),
      time(a.time_in),
      time(a.time_out),
      duration(a.time_in, a.time_out),
      badge(a.time_out ? "Completed" : "Active"),
    ]);
export const dispatchRows = (records, data, action) =>
  records
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    .map((d) => [
      d.code,
      date(d.starts_at),
      person(data, d.driver_id),
      plate(truck(data, d.truck_id)?.plate),
      d.destination,
      `${time(d.starts_at)} – ${time(d.ends_at)}`,
      badge(label(d.status)),
      ...(action ? [action(d)] : []),
    ]);
export function vehicle(id, t, data) {
  const n = document.getElementById(id);
  if (!n) return;
  n.replaceChildren();
  if (!t) {
    n.append(
      el(
        "p",
        "No regular truck assigned. Contact your administrator.",
        "muted",
      ),
    );
    return;
  }
  const h = el("h2", `${t.make} ${t.model}`.trim() || t.truck_type);
  const dl = el("dl", undefined, "detail-grid");
  n.append(h, dl);
  for (const [k, v] of Object.entries({
    "Truck ID": t.code,
    "Plate Number": t.plate,
    "Truck Status": label(truckStatus(t, data)),
  })) {
    const box = el("div");
    box.append(el("dt", k), el("dd", v));
    dl.append(box);
  }
}
export function deliveryDetails(d, data) {
  definition(
    "current-delivery",
    d
      ? {
          "Dispatch ID": d.code,
          Driver: person(data, d.driver_id),
          "Assigned Truck": truck(data, d.truck_id)?.code,
          Pickup: d.pickup,
          Destination: d.destination,
          Client: d.client,
          Schedule: stamp(d.starts_at),
          "Current Status": badge(label(d.status)),
          "Last Updated": stamp(d.updated_at),
        }
      : { "Current Delivery": "No active assignment" },
  );
}
