import { boot, watch, loadFleet, fleetTables } from "../../components/shell.js";
import { truck, person, assigned } from "../../components/data.js";
import {
  $,
  text,
  table,
  badge,
  plate,
  button,
  actions,
  options,
  openModal,
  bindForm,
  details,
} from "../../utils/dom.js";
import {
  date,
  maintenanceDue,
  nextMaintenance,
  truckStatus,
  label,
} from "../../utils/format.js";
import { saveTruck, deleteTruck, archiveTruck } from "../../services/trucks.js";
import { checkCoding } from "../../services/coding.js";
let coding = {};
const state = await boot(
  "admin",
  async () => {
    const d = await loadFleet();
    const area = d.company_settings[0].default_area;
    coding = Object.fromEntries(
      await Promise.all(
        d.trucks.map(async (t) => [t.id, await checkCoding(t.id, area)]),
      ),
    );
    return d;
  },
  render,
);
function edit(t = {}) {
  const f = openModal("truck-modal", t);
  options(
    f.elements.driver_id,
    state.data.profiles.filter((p) => p.role === "driver" && p.active),
    (p) => p.full_name,
    "Unassigned",
  );
  f.elements.driver_id.value = assigned(state.data, t.id)?.driver_id || "";
}
function render({ data: d }) {
  const active = d.trucks.filter((t) => !t.archived),
    threshold = d.company_settings[0].due_soon_days;
  text("total", active.length);
  text(
    "needs-service",
    active.filter((t) =>
      ["Overdue", "Due Soon"].includes(maintenanceDue(t, threshold, d)),
    ).length,
  );
  text(
    "available",
    active.filter((t) => truckStatus(t, d) === "available").length,
  );
  text(
    "coding-context",
    `Coding context: ${d.coding_areas.find((a) => a.id === d.company_settings[0].default_area)?.name} · current Manila time. No configured policy means no legal verification.`,
  );
  const search = $("#search").value.toLowerCase();
  const rows = d.trucks
    .filter((t) => t.archived === ($("#archive-filter").value === "archived"))
    .filter(
      (t) =>
        !$("#maintenance-filter").value ||
        maintenanceDue(t, threshold, d) === $("#maintenance-filter").value,
    )
    .filter((t) =>
      [t.code, t.plate, t.truck_type, person(d, assigned(d, t.id)?.driver_id)]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  table(
    "trucks-body",
    rows.map((t) => [
      t.code,
      plate(t.plate),
      t.truck_type,
      person(d, assigned(d, t.id)?.driver_id),
      badge(maintenanceDue(t, threshold, d)),
      badge(
        coding[t.id]?.restricted
          ? "Coding Restriction"
          : coding[t.id]?.policy_configured
            ? "Allowed"
            : "Not configured",
      ),
      date(nextMaintenance(t, d)),
      actions(
        button("View", () =>
          details(t.code, {
            Plate: t.plate,
            Vehicle: `${t.make} ${t.model}`,
            Status: label(truckStatus(t, d)),
            Mileage: t.mileage,
            Condition: t.condition,
            "Registration Expiry": date(t.registration_expiry),
            Notes: t.notes,
          }),
        ),
        ...(!t.archived
          ? [
              button("Edit", () => edit(t)),
              button("Archive", async () => {
                if (confirm(`Archive ${t.code}? History will be retained.`)) {
                  await archiveTruck(t.id);
                  await state.refresh();
                }
              }),
            ]
          : []),
        button(
          "Delete",
          async () => {
            if (
              confirm(
                `Permanently delete ${t.code}? Only unused trucks can be deleted.`,
              )
            ) {
              await deleteTruck(t.id);
              await state.refresh();
            }
          },
          "danger",
        ),
      ),
    ]),
    8,
  );
}
if (state) {
  $("#add-truck").onclick = () => edit();
  for (const id of ["search", "maintenance-filter", "archive-filter"])
    $("#" + id).addEventListener("input", () => render(state));
  bindForm("truck-modal-form", async (p) => {
    await saveTruck(p);
    $("#truck-modal").close();
    await state.refresh();
  });
  watch(state, fleetTables);
}
