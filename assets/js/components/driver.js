import { loadFleet } from "./shell.js";
import { all } from "../services/api.js";
import { timeIn, timeOut } from "../services/attendance.js";
import { checkCoding } from "../services/coding.js";
import { $, text, message, badge } from "../utils/dom.js";
import { duration, stamp, label } from "../utils/format.js";
export async function driverData() {
  const [data, attendance, delivery_status_logs] = await Promise.all([
    loadFleet(),
    all("attendance"),
    all("delivery_status_logs"),
  ]);
  return { ...data, attendance, delivery_status_logs };
}
export function attendanceControls(data) {
  const open = data.attendance.find((a) => !a.time_out);
  if (!$("#time-in")) return;
  $("#time-in").disabled = !!open;
  $("#time-out").disabled = !open;
  text(
    "active-shift",
    open
      ? `Active shift · Started ${stamp(open.time_in)} · ${duration(open.time_in)}`
      : "No active shift. Time in when your work begins.",
  );
}
export function bindAttendance(state) {
  for (const [id, action] of [
    ["time-in", timeIn],
    ["time-out", timeOut],
  ])
    if ($("#" + id))
      $("#" + id).onclick = async () => {
        const b = $("#" + id);
        b.disabled = true;
        try {
          await action();
          message(
            id === "time-in" ? "Time in recorded." : "Time out recorded.",
            "success",
          );
          await state.refresh();
        } catch (e) {
          message(e.message);
          attendanceControls(state.data);
        }
      };
  setInterval(() => {
    if (!document.hidden) attendanceControls(state.data);
  }, 60000);
}
let codingSequence = 0;
export async function showCoding(t, data, dispatch) {
  const seq = ++codingSequence;
  if (!t) {
    text("coding-result", "No assigned truck.");
    text("coding-context", "");
    return;
  }
  const area = dispatch?.area_id || data.company_settings[0].default_area;
  const start = dispatch?.starts_at || new Date().toISOString(),
    end = dispatch?.ends_at || new Date(Date.now() + 60000).toISOString();
  try {
    const result = await checkCoding(t.id, area, start, end);
    if (seq !== codingSequence) return;
    const n = $("#coding-result");
    n.replaceChildren(
      badge(
        result.restricted
          ? "Coding Restricted"
          : result.policy_configured
            ? "Allowed to Travel"
            : "Policy not configured",
      ),
    );
    text(
      "coding-context",
      `${t.code} · ${t.plate} · ${data.coding_areas.find((a) => a.id === area)?.name} · ${dispatch ? "Scheduled interval" : "Current Manila time"}${result.policy_configured ? "" : " · Ask the administrator to configure verified rules."}`,
    );
  } catch (e) {
    text("coding-result", "Coding check unavailable: " + e.message);
  }
}
