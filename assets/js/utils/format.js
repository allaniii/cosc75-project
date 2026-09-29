export const TZ = "Asia/Manila";
export const dateKey = (value = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: TZ,
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(
        new Date(value.length === 10 ? value + "T00:00:00+08:00" : value),
      )
    : "—";
export const time = (value) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
export const stamp = (value) =>
  value ? `${date(value)} · ${time(value)}` : "—";
export const localInput = (value = new Date()) => {
  const d = new Date(new Date(value).getTime() + 8 * 3600000);
  return d.toISOString().slice(0, 16);
};
export const fromManila = (value) =>
  value ? new Date(value + ":00+08:00").toISOString() : null;
export const money = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(n) || 0,
  );
export const duration = (start, end = new Date()) => {
  if (!start) return "—";
  const minutes = Math.max(
    0,
    Math.floor((new Date(end || new Date()) - new Date(start)) / 60000),
  );
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
export const label = (value) =>
  ({
    on_way: "On the Way",
    not_delivered: "Not Yet Delivered",
    out_of_service: "Out of Service",
    in_progress: "In Progress",
    available: "Available",
    on_delivery: "On Delivery",
    under_maintenance: "Under Maintenance",
  })[value] ||
  String(value ?? "—")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (x) => x.toUpperCase());
export function lastDays(count = 7) {
  const end = new Date(dateKey() + "T12:00:00+08:00");
  return Array.from({ length: count }, (_, i) =>
    dateKey(new Date(end.getTime() - (count - 1 - i) * 86400000)),
  );
}
export function nextMaintenance(truck, data = {}) {
  return (
    [
      truck.next_maintenance,
      ...(data.maintenance_schedules || [])
        .filter(
          (j) =>
            j.truck_id === truck.id &&
            ["scheduled", "in_progress"].includes(j.status),
        )
        .map((j) => dateKey(j.scheduled_at)),
    ]
      .filter(Boolean)
      .sort()[0] || null
  );
}
export function maintenanceDue(truck, threshold = 7, data = {}) {
  const next = nextMaintenance(truck, data);
  if (!next) return "Not scheduled";
  const days =
    (new Date(next + "T00:00:00+08:00") -
      new Date(dateKey() + "T00:00:00+08:00")) /
    86400000;
  return days < 0 ? "Overdue" : days <= threshold ? "Due Soon" : "Up to date";
}
export function truckStatus(t, data) {
  if (data.truck_states?.[t.id]) return data.truck_states[t.id];
  if (t.archived) return "archived";
  if (t.base_status === "out_of_service") return "out_of_service";
  if (
    data.maintenance_reports?.some(
      (x) =>
        x.truck_id === t.id &&
        ["high", "urgent"].includes(x.priority) &&
        ["submitted", "reviewed"].includes(x.review_state),
    ) ||
    data.maintenance_schedules?.some(
      (x) =>
        x.truck_id === t.id &&
        (x.status === "in_progress" ||
          (x.status === "scheduled" && new Date(x.scheduled_at) <= new Date())),
    )
  )
    return "under_maintenance";
  if (
    data.dispatches?.some(
      (x) =>
        x.truck_id === t.id && ["on_way", "not_delivered"].includes(x.status),
    )
  )
    return "on_delivery";
  return "available";
}
export const activeTrip = (d) => !["delivered", "cancelled"].includes(d.status);
export function csvCell(value) {
  let s = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function csv(rows) {
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
