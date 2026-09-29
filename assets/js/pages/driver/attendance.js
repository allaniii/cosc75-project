import { boot, watch } from "../../components/shell.js";
import { snapshot } from "../../services/api.js";
import { attendanceRows } from "../../components/data.js";
import { attendanceControls, bindAttendance } from "../../components/driver.js";
import { table } from "../../utils/dom.js";
const tables = ["attendance", "company_settings"];
const state = await boot(
  "driver",
  () => snapshot(tables),
  ({ data: d }) => {
    attendanceControls(d);
    table("attendance-body", attendanceRows(d.attendance, d, true), 5);
  },
);
if (state) {
  bindAttendance(state);
  watch(state, tables);
}
