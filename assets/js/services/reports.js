import { activeTrip, dateKey, truckStatus, lastDays } from "../utils/format.js";
export function reportData(data, filters) {
  const start = filters.start + "T00:00:00+08:00",
    end = new Date(
      new Date(filters.end + "T00:00:00+08:00").getTime() + 86400000,
    ).toISOString();
  if (new Date(start) >= new Date(end))
    throw new Error("End date must be on or after start date.");
  const within = (v) =>
    new Date(v) >= new Date(start) && new Date(v) < new Date(end);
  const dispatches = data.dispatches.filter(
    (d) =>
      within(d.starts_at) &&
      (!filters.truck || d.truck_id === filters.truck) &&
      (!filters.driver || d.driver_id === filters.driver) &&
      (!filters.status || d.status === filters.status),
  );
  const logs = data.delivery_status_logs || [];
  const completedDurations = dispatches
    .filter((d) => d.status === "delivered")
    .map((d) => {
      const events = logs
        .filter((l) => l.dispatch_id === d.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const first = events.find((l) => l.new_status === "on_way"),
        last = events.find((l) => l.new_status === "delivered");
      return first && last
        ? (new Date(last.created_at) - new Date(first.created_at)) / 3600000
        : null;
    })
    .filter((v) => v !== null);
  const jobs = data.maintenance_schedules.filter(
    (j) =>
      within(j.scheduled_at) &&
      (!filters.truck || j.truck_id === filters.truck),
  );
  const issues = data.maintenance_reports.filter(
    (r) =>
      within(r.created_at) &&
      (!filters.truck || r.truck_id === filters.truck) &&
      (!filters.driver || r.reporter_id === filters.driver),
  );
  const attendance = data.attendance.filter(
    (a) =>
      within(a.time_in) && (!filters.driver || a.driver_id === filters.driver),
  );
  const completed = jobs.filter((j) => j.status === "completed");
  return {
    dispatches,
    jobs,
    issues,
    attendance,
    completed,
    available: data.trucks.filter(
      (t) =>
        !t.archived &&
        (!filters.truck || t.id === filters.truck) &&
        truckStatus(t, data) === "available",
    ).length,
    completion: dispatches.length
      ? (100 * dispatches.filter((d) => d.status === "delivered").length) /
        dispatches.length
      : null,
    avgHours: completedDurations.length
      ? completedDurations.reduce((a, b) => a + b, 0) /
        completedDurations.length
      : null,
    cost: completed.reduce((n, j) => n + Number(j.cost), 0),
    hours: attendance
      .filter((a) => a.time_out)
      .reduce(
        (n, a) => n + (new Date(a.time_out) - new Date(a.time_in)) / 3600000,
        0,
      ),
  };
}
