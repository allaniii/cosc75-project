import { boot, watch, loadFleet, fleetTables } from "../../components/shell.js";
import { regularTruck, truck, vehicle } from "../../components/data.js";
import { showCoding } from "../../components/driver.js";
import { definition, el, $ } from "../../utils/dom.js";
import {
  activeTrip,
  truckStatus,
  label,
  date,
  nextMaintenance,
} from "../../utils/format.js";
const state = await boot(
  "driver",
  loadFleet,
  async ({ data: d, profile: p }) => {
    const t = regularTruck(d, p.id);
    vehicle("assigned-vehicle", t, d);
    definition(
      "truck-details",
      t
        ? {
            Make: t.make,
            Model: t.model,
            "Truck ID": t.code,
            "Plate Number": t.plate,
            Status: label(truckStatus(t, d)),
            "Next Maintenance": date(nextMaintenance(t, d)),
          }
        : { Vehicle: "No regular truck assigned" },
    );
    await showCoding(t, d);
    const host = $("#temporary-trucks");
    host.replaceChildren();
    const ids = [
      ...new Set(
        d.dispatches
          .filter(activeTrip)
          .filter((x) => x.truck_id !== t?.id)
          .map((x) => x.truck_id),
      ),
    ];
    for (const id of ids) {
      const v = truck(d, id);
      host.append(
        el("p", `${v?.code} · ${v?.plate} · Temporary delivery assignment`),
      );
    }
    if (!ids.length)
      host.append(el("p", "No temporary dispatch vehicles.", "muted"));
  },
);
watch(state, fleetTables);
