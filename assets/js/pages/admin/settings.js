import { boot, watch } from "../../components/shell.js";
import { snapshot, mutate, check } from "../../services/api.js";
import { db } from "../../config/supabase.js";
import {
  $,
  table,
  badge,
  button,
  actions,
  options,
  openModal,
  bindForm,
  fill,
  message,
} from "../../utils/dom.js";
import { date } from "../../utils/format.js";
import { saveRule, saveArea } from "../../services/coding.js";
const tables = [
  "profiles",
  "drivers",
  "coding_rules",
  "coding_areas",
  "company_settings",
];
let initial = true;
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
function render({ data: d, profile }) {
  if (initial) {
    fill($("#company-form"), d.company_settings[0]);
    options(
      $("#company-form").elements.default_area,
      d.coding_areas,
      (a) => a.name,
      null,
    );
    $("#company-form").elements.default_area.value =
      d.company_settings[0].default_area;
    fill($("#profile-form"), profile);
    initial = false;
  }
  table(
    "drivers-body",
    d.drivers.map((dr) => {
      const p = d.profiles.find((x) => x.id === dr.id);
      return [
        p?.full_name,
        dr.license_number,
        date(dr.license_expiry),
        p?.phone,
        badge(p?.active ? "Active" : "Inactive"),
        button(p?.active ? "Deactivate" : "Activate", async () => {
          if (
            confirm(`${p.active ? "Deactivate" : "Activate"} ${p.full_name}?`)
          ) {
            await mutate("driver_active", { id: dr.id, active: !p.active });
            await state.refresh();
          }
        }),
      ];
    }),
    6,
  );
  table(
    "rules-body",
    d.coding_rules.map((r) => [
      d.coding_areas.find((a) => a.id === r.area_id)?.name,
      r.digits,
      days[r.weekday],
      `${r.start_time.slice(0, 5)} – ${r.end_time.slice(0, 5)}${r.end_time < r.start_time ? " (+1 day)" : ""}`,
      badge(r.enabled ? "Enabled" : "Disabled"),
      actions(
        button("Edit", () => edit(r)),
        button(r.enabled ? "Disable" : "Enable", async () => {
          await saveRule({ ...r, enabled: !r.enabled });
          await state.refresh();
        }),
      ),
    ]),
    6,
  );
}
const state = await boot("admin", () => snapshot(tables), render);
function edit(r = {}) {
  const f = openModal("rule-modal", r);
  options(f.elements.area_id, state.data.coding_areas, (a) => a.name, null);
  f.elements.area_id.value =
    r.area_id || state.data.company_settings[0].default_area;
  f.elements.enabled.value = String(r.enabled || false);
}
if (state) {
  $("#add-rule").onclick = () => edit();
  bindForm("rule-modal-form", async (p) => {
    await saveRule(p);
    $("#rule-modal").close();
    await state.refresh();
  });
  bindForm("area-form", async (p, f) => {
    await saveArea(p);
    await state.refresh();
    options(
      $("#company-form").elements.default_area,
      state.data.coding_areas,
      (a) => a.name,
      null,
    );
    f.reset();
  });
  bindForm("profile-form", async (p) => {
    await mutate("profile_update", p);
    state.profile = { ...state.profile, ...p };
    $("#user-name").textContent = p.full_name;
  });
  bindForm("company-form", async (p) => {
    await mutate("settings_save", p);
    await state.refresh();
  });
  bindForm("driver-form", async (p, f) => {
    const { data, error } = await db().functions.invoke("driver-admin", {
      body: p,
    });
    if (error) {
      let m = error.message;
      try {
        m = (await error.context.json()).error || m;
      } catch {}
      throw new Error(m);
    }
    if (data.error) throw new Error(data.error);
    f.reset();
    await state.refresh();
  });
  watch(state, tables);
}
