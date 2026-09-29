import test from "node:test";
import assert from "node:assert/strict";
import {
  dateKey,
  fromManila,
  localInput,
  duration,
  maintenanceDue,
  csvCell,
  csv,
  truckStatus,
} from "../assets/js/utils/format.js";
import { reportData } from "../assets/js/services/reports.js";
test("business date is Manila, not machine timezone", () => {
  assert.equal(dateKey("2026-01-01T17:00:00Z"), "2026-01-02");
  assert.equal(fromManila("2026-01-02T01:00"), "2026-01-01T17:00:00.000Z");
  assert.equal(localInput("2026-01-01T17:00:00Z"), "2026-01-02T01:00");
});
test("overnight shift duration is based on timestamps", () =>
  assert.equal(
    duration("2026-01-01T22:00:00+08:00", "2026-01-02T06:30:00+08:00"),
    "8h 30m",
  ));
test("CSV quotes commas, newlines, embedded quotes and blocks formulas", () => {
  assert.equal(csvCell("A,B"), '"A,B"');
  assert.equal(csvCell('"x"'), '"""x"""');
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.ok(
    csv([
      ["a", "b"],
      ["line\n2", "x"],
    ]).startsWith("\uFEFF"),
  );
});
test("truck availability comes from trusted server state when available", () =>
  assert.equal(
    truckStatus(
      { id: "a", base_status: "available" },
      { truck_states: { a: "under_maintenance" } },
    ),
    "under_maintenance",
  ));
test("maintenance without a date is not falsely current", () =>
  assert.equal(maintenanceDue({ next_maintenance: null }), "Not scheduled"));
test("report boundaries, statuses and derived totals agree", () => {
  const data = {
    trucks: [{ id: "a", base_status: "available", archived: false }],
    dispatches: [
      {
        id: "d1",
        truck_id: "a",
        driver_id: "p",
        starts_at: "2026-01-01T16:00:00Z",
        status: "delivered",
      },
      {
        id: "d2",
        truck_id: "a",
        driver_id: "p",
        starts_at: "2026-01-02T16:00:00Z",
        status: "cancelled",
      },
    ],
    delivery_status_logs: [
      {
        dispatch_id: "d1",
        new_status: "on_way",
        created_at: "2026-01-01T16:00:00Z",
      },
      {
        dispatch_id: "d1",
        new_status: "delivered",
        created_at: "2026-01-01T18:00:00Z",
      },
    ],
    maintenance_reports: [],
    maintenance_schedules: [
      {
        truck_id: "a",
        status: "completed",
        scheduled_at: "2026-01-01T17:00:00Z",
        cost: "1200",
      },
    ],
    attendance: [
      {
        driver_id: "p",
        time_in: "2026-01-01T17:00:00Z",
        time_out: "2026-01-02T01:00:00Z",
      },
    ],
  };
  const r = reportData(data, { start: "2026-01-02", end: "2026-01-02" });
  assert.equal(r.dispatches.length, 1);
  assert.equal(r.completion, 100);
  assert.equal(r.avgHours, 2);
  assert.equal(r.hours, 8);
  assert.equal(r.cost, 1200);
  assert.equal(r.available, 1);
});
test("invalid report date ordering is rejected", () =>
  assert.throws(
    () => reportData({}, { start: "2026-02-01", end: "2026-01-01" }),
    /End date/,
  ));
