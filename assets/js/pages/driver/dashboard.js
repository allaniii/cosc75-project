import { boot, watch, fleetTables } from "../../components/shell.js";
import {
  driverData,
  attendanceControls,
  bindAttendance,
  showCoding,
} from "../../components/driver.js";
import {
  regularTruck,
  truck,
  vehicle,
  deliveryDetails,
} from "../../components/data.js";
import { text, definition } from "../../utils/dom.js";
import { activeTrip, lastDays, dateKey } from "../../utils/format.js";
import { chart } from "../../components/chart.js";
const state = await boot(
  "driver",
  driverData,
  async ({ data: d, profile: p }) => {
    const current = d.dispatches
      .filter(activeTrip)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    const regular = regularTruck(d, p.id),
      t = truck(d, current?.truck_id) || regular;
    document.querySelector("h1").textContent = "Welcome, " + p.full_name;
    definition("driver-info", {
      "Driver Name": p.full_name,
      "Assigned Truck": regular
        ? regular.code + " · " + regular.plate
        : "Unassigned",
      "Current Route": current
        ? current.pickup + " → " + current.destination
        : "No active delivery",
    });
    deliveryDetails(current, d);
    vehicle("assigned-vehicle", regular, d);
    attendanceControls(d);
    await showCoding(t, d, current);
    const days = lastDays();
    text(
      "completed-trips",
      d.dispatches.filter(
        (x) => x.status === "delivered" && days.includes(dateKey(x.updated_at)),
      ).length,
    );
    text(
      "working-hours",
      d.attendance
        .filter((x) => x.time_out && days.includes(dateKey(x.time_in)))
        .reduce(
          (n, x) => n + (new Date(x.time_out) - new Date(x.time_in)) / 3600000,
          0,
        )
        .toFixed(1),
    );
    text(
      "open-reports",
      d.maintenance_reports.filter((x) =>
        ["submitted", "reviewed"].includes(x.review_state),
      ).length,
    );
    chart("driver-chart", days, [
      {
        label: "Completed trips",
        data: days.map(
          (day) =>
            d.dispatches.filter(
              (x) => x.status === "delivered" && dateKey(x.updated_at) === day,
            ).length,
        ),
      },
    ]);
  },
);
if (state) {
  bindAttendance(state);
  watch(state, [...fleetTables, "attendance", "delivery_status_logs"]);
}
