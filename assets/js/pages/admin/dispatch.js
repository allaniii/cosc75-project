import { boot, watch, loadFleet, fleetTables } from "../../components/shell.js";
import {
  truck,
  person,
  assigned,
  dispatchRows,
} from "../../components/data.js";
import {
  $,
  text,
  table,
  badge,
  button,
  actions,
  options,
  openModal,
  bindForm,
  details,
  values,
  message,
} from "../../utils/dom.js";
import {
  dateKey,
  localInput,
  fromManila,
  activeTrip,
  truckStatus,
  label,
  stamp,
} from "../../utils/format.js";
import {
  saveDispatch,
  cancelDispatch,
  eligibility,
} from "../../services/dispatch.js";
import { checkCoding } from "../../services/coding.js";
import { selectRoute } from "../../services/maps.js";
let coding = {},
  lastRoute;
const state = await boot(
  "admin",
  async () => {
    const d = await loadFleet();
    coding = Object.fromEntries(
      await Promise.all(
        d.trucks
          .filter((t) => !t.archived)
          .map(async (t) => [
            t.id,
            await checkCoding(
              t.id,
              d.company_settings[0].default_area,
              dateKey() + "T00:00:00+08:00",
              new Date(new Date(dateKey() + "T00:00:00+08:00").getTime() + 86400000).toISOString(),
            ),
          ]),
      ),
    );
    return d;
  },
  render,
);
function render({ data: d }) {
  text("on-route", d.dispatches.filter((x) => x.status === "on_way").length);
  text(
    "available",
    d.trucks.filter((t) => !t.archived && truckStatus(t, d) === "available")
      .length,
  );
  text("restricted", Object.values(coding).filter((x) => x.restricted).length);
  const query = $("#search").value.toLowerCase(),
    date = $("#date-filter").value;
  const filtered = d.dispatches.filter(
    (x) =>
      [
        x.code,
        x.destination,
        person(d, x.driver_id),
        truck(d, x.truck_id)?.plate,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query) &&
      (!date || dateKey(x.starts_at) === date),
  );
  const acts = (x) =>
    actions(
      button("View", () =>
        details(x.code, {
          Driver: person(d, x.driver_id),
          Truck: truck(d, x.truck_id)?.plate,
          Pickup: x.pickup,
          Destination: x.destination,
          Client: x.client,
          Starts: stamp(x.starts_at),
          Ends: stamp(x.ends_at),
          Status: label(x.status),
          Notes: x.notes,
        }),
      ),
      ...(x.status === "scheduled" ? [button("Edit", () => edit(x))] : []),
      ...(activeTrip(x)
        ? [
            button(
              "Cancel",
              async () => {
                if (
                  confirm(
                    `Cancel ${x.code}? The trip history will be retained.`,
                  )
                ) {
                  await cancelDispatch(x.id);
                  await state.refresh();
                }
              },
              "danger",
            ),
          ]
        : []),
    );
  table("schedule-body", dispatchRows(filtered.filter(activeTrip), d, acts), 8);
  table(
    "history-body",
    dispatchRows(
      filtered.filter((x) => !activeTrip(x)),
      d,
      acts,
    ),
    8,
  );
  options(
    "#route-select",
    [...d.dispatches].sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    (x) => `${x.code} — ${x.pickup} → ${x.destination}`,
    null,
  );
  const selected = d.dispatches.find((x) => x.id === $("#route-select").value);
  if (JSON.stringify(selected) !== lastRoute) {
    lastRoute = JSON.stringify(selected);
    selectRoute(selected);
  }
}
function edit(d = {}) {
  const f = openModal("dispatch-modal", d);
  options(
    f.elements.driver_id,
    state.data.profiles.filter((p) => p.role === "driver" && p.active),
    (p) => p.full_name,
  );
  options(
    f.elements.truck_id,
    state.data.trucks.filter((t) => !t.archived),
    (t) => `${t.plate} · ${t.code} · ${t.truck_type}`,
  );
  options(f.elements.area_id, state.data.coding_areas, (a) => a.name, null);
  f.elements.driver_id.value = d.driver_id || "";
  f.elements.truck_id.value = d.truck_id || "";
  f.elements.area_id.value =
    d.area_id || state.data.company_settings[0].default_area;
  f.elements.starts_at.value = localInput(d.starts_at || new Date());
  f.elements.ends_at.value = localInput(
    d.ends_at ||
      new Date(
        Date.now() +
          state.data.company_settings[0].default_dispatch_hours * 3600000,
      ),
  );
  preview();
}
let previewCounter = 0;
async function preview() {
  const token = ++previewCounter;
  const p = values($("#dispatch-modal-form"));
  const t = truck(state.data, p.truck_id);
  if (!t) {
    text("truck-preview", "Choose a truck and schedule.");
    return;
  }
  const meta = `${t.code} · ${t.plate} · ${t.truck_type} · Regular driver: ${person(state.data, assigned(state.data, t.id)?.driver_id)}`;
  if (!p.driver_id || !p.starts_at || !p.ends_at) {
    text("truck-preview", meta + " · Select driver and complete schedule.");
    return;
  }
  try {
    const result = await eligibility({
      truck_id: p.truck_id,
      driver_id: p.driver_id,
      area_id: p.area_id,
      starts_at: fromManila(p.starts_at),
      ends_at: fromManila(p.ends_at),
      ignore_id: p.id || null,
    });
    if (token === previewCounter)
      text(
        "truck-preview",
        meta +
          " · " +
          (result.reason || "Available") +
          (result.policy_configured
            ? ""
            : " · No active coding policy configured"),
      );
  } catch (e) {
    if (token === previewCounter) text("truck-preview", e.message);
  }
}
if (state) {
  $("#new-dispatch").onclick = () => edit();
  $("#dispatch-modal-form").addEventListener("change", preview);
  bindForm("dispatch-modal-form", async (p) => {
    p.starts_at = fromManila(p.starts_at);
    p.ends_at = fromManila(p.ends_at);
    await saveDispatch(p);
    $("#dispatch-modal").close();
    await state.refresh();
  });
  for (const id of ["search", "date-filter"])
    $("#" + id).oninput = () => render(state);
  $("#reset-filters").onclick = () => {
    $("#search").value = "";
    $("#date-filter").value = "";
    render(state);
  };
  $("#route-select").onchange = () =>
    selectRoute(
      state.data.dispatches.find((x) => x.id === $("#route-select").value),
    );
  watch(state, fleetTables);
}
