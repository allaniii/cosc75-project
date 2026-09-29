import { boot, watch, fleetTables } from "../../components/shell.js";
import { snapshot } from "../../services/api.js";
import { reportData } from "../../services/reports.js";
import { truck, attendanceRows, dispatchRows } from "../../components/data.js";
import {
  $,
  text,
  table,
  options,
  bindForm,
  values,
  download,
} from "../../utils/dom.js";
import { dateKey, money, duration, csv, stamp } from "../../utils/format.js";
import { chart } from "../../components/chart.js";
const tables = [...fleetTables, "attendance", "delivery_status_logs"];
let initialized = false,
  result,
  filters;
function render({ data: d }) {
  if (!initialized) {
    const form = $("#report-filters");
    form.elements.start.value = dateKey().slice(0, 8) + "01";
    form.elements.end.value = dateKey();
    options(
      form.elements.truck,
      d.trucks,
      (t) => `${t.code} · ${t.plate}`,
      "All trucks",
    );
    options(
      form.elements.driver,
      d.profiles.filter((p) => p.role === "driver"),
      (p) => p.full_name,
      "All drivers",
    );
    filters = values(form);
    initialized = true;
  }
  result = reportData(d, filters);
  text(
    "report-context",
    `${filters.start} → ${filters.end} · Manila dates. Dispatch filters apply to dispatch charts/export; driver applies to attendance/issues; truck applies to fleet/services/issues. Attendance has no truck link. Availability is a current snapshot.`,
  );
  text("report-total", result.dispatches.length);
  text(
    "report-rate",
    result.completion === null ? "—" : result.completion.toFixed(0) + "%",
  );
  text(
    "report-duration",
    result.avgHours === null ? "—" : result.avgHours.toFixed(1) + "h",
  );
  text("report-availability", result.available);
  text("report-repairs", result.completed.length);
  text("report-cost", money(result.cost));
  text("report-shifts", result.attendance.length);
  text("report-hours", result.hours.toFixed(1));
  const dates = [
    ...new Set(result.dispatches.map((x) => dateKey(x.starts_at))),
  ].sort();
  chart(
    "delivery-chart",
    dates,
    [
      {
        label: "Delivered",
        data: dates.map(
          (day) =>
            result.dispatches.filter(
              (x) => dateKey(x.starts_at) === day && x.status === "delivered",
            ).length,
        ),
      },
      {
        label: "Cancelled",
        data: dates.map(
          (day) =>
            result.dispatches.filter(
              (x) => dateKey(x.starts_at) === day && x.status === "cancelled",
            ).length,
        ),
      },
    ],
    "bar",
  );
  chart("activity-chart", dates, [
    {
      label: "Dispatches",
      data: dates.map(
        (day) =>
          result.dispatches.filter((x) => dateKey(x.starts_at) === day).length,
      ),
    },
  ]);
  const cats = [...new Set(result.issues.map((x) => x.category))];
  chart(
    "failure-chart",
    cats,
    [
      {
        label: "Reports",
        data: cats.map(
          (c) => result.issues.filter((x) => x.category === c).length,
        ),
      },
    ],
    "bar",
  );
  const jobDates = [
    ...new Set(result.completed.map((x) => dateKey(x.scheduled_at))),
  ].sort();
  chart("cost-chart", jobDates, [
    {
      label: "PHP",
      data: jobDates.map((day) =>
        result.completed
          .filter((x) => dateKey(x.scheduled_at) === day)
          .reduce((n, j) => n + Number(j.cost), 0),
      ),
    },
  ]);
  table("dispatch-body", dispatchRows(result.dispatches, d), 7);
  table("attendance-body", attendanceRows(result.attendance, d), 6);
  table(
    "repairs-body",
    d.trucks
      .filter((t) => !filters.truck || t.id === filters.truck)
      .map((t) => [
        t.code,
        t.plate,
        result.completed.filter((j) => j.truck_id === t.id).length,
        money(
          result.completed
            .filter((j) => j.truck_id === t.id)
            .reduce((n, j) => n + Number(j.cost), 0),
        ),
      ]),
    4,
  );
}
const state = await boot("admin", () => snapshot(tables), render);
if (state) {
  bindForm("report-filters", (p) => {
    filters = p;
    render(state);
  });
  $("#print-report").onclick = () => window.print();
  $("#export-csv").onclick = () => {
    const rows = [
      ["CentriTruck report", filters.start, filters.end],
      ["Section", "ID", "Truck / Driver", "Date", "Status", "Value"],
      ...result.dispatches.map((x) => [
        "Dispatch",
        x.code,
        truck(state.data, x.truck_id)?.plate,
        stamp(x.starts_at),
        x.status,
        x.destination,
      ]),
      ...result.jobs.map((x) => [
        "Maintenance",
        x.id,
        truck(state.data, x.truck_id)?.plate,
        stamp(x.scheduled_at),
        x.status,
        x.cost,
      ]),
      ...result.issues.map((x) => [
        "Issue",
        x.id,
        truck(state.data, x.truck_id)?.plate,
        stamp(x.created_at),
        x.review_state,
        x.category,
      ]),
      ...result.attendance.map((x) => [
        "Attendance",
        x.id,
        state.data.profiles.find((p) => p.id === x.driver_id)?.full_name,
        stamp(x.time_in),
        x.time_out ? "Completed" : "Active",
        duration(x.time_in, x.time_out),
      ]),
      [
        "Current availability",
        "",
        "",
        stamp(new Date().toISOString()),
        "Available trucks",
        result.available,
      ],
    ];
    download(`CentriTruck-${filters.start}-${filters.end}.csv`, csv(rows));
  };
  watch(state, tables);
}
