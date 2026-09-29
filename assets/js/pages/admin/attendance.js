import { boot, watch } from "../../components/shell.js";
import { snapshot } from "../../services/api.js";
import { attendanceRows } from "../../components/data.js";
import { $, text, table, options } from "../../utils/dom.js";
import { dateKey } from "../../utils/format.js";
const tables = ["attendance", "profiles", "company_settings"];
function render({ data: d }) {
  options(
    "#driver-filter",
    d.profiles.filter((p) => p.role === "driver"),
    (p) => p.full_name,
    "All drivers",
  );
  const rows = d.attendance.filter(
    (a) =>
      (!$("#date-filter").value ||
        dateKey(a.time_in) === $("#date-filter").value) &&
      (!$("#driver-filter").value || a.driver_id === $("#driver-filter").value),
  );
  text("total", d.attendance.length);
  text("tracked", new Set(d.attendance.map((x) => x.driver_id)).size);
  text("showing", rows.length);
  table("attendance-body", attendanceRows(rows, d), 6);
}
const state = await boot("admin", () => snapshot(tables), render);
if (state) {
  for (const id of ["date-filter", "driver-filter"])
    $("#" + id).onchange = () => render(state);
  $("#reset-filters").onclick = () => {
    $("#date-filter").value = "";
    $("#driver-filter").value = "";
    render(state);
  };
  watch(state, tables);
  setInterval(() => {
    if (!document.hidden) render(state);
  }, 60000);
}
