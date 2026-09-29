import { boot, watch, fleetTables } from "../../components/shell.js";
import { driverData, showCoding } from "../../components/driver.js";
import { truck, deliveryDetails } from "../../components/data.js";
import { $, options, bindForm, el } from "../../utils/dom.js";
import { activeTrip, stamp, label } from "../../utils/format.js";
import { confirmDelivery } from "../../services/dispatch.js";
async function render(state) {
  const d = state.data;
  const active = d.dispatches
      .filter(activeTrip)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    history = d.dispatches
      .filter((x) => !activeTrip(x))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  options(
    "#dispatch-choice",
    [...active, ...history],
    (x) => `${x.code} · ${x.destination} · ${label(x.status)}`,
    null,
  );
  const current = d.dispatches.find(
    (x) => x.id === $("#dispatch-choice").value,
  );
  deliveryDetails(current, d);
  const form = $("#delivery-form");
  for (const radio of form.querySelectorAll('[name="status"]')) {
    radio.disabled =
      !current ||
      !(current.status === "on_way"
        ? ["on_way", "delivered", "not_delivered"].includes(radio.value)
        : ["scheduled", "not_delivered"].includes(current.status) &&
          radio.value === "on_way");
    if (radio.disabled) radio.checked = false;
  }
  form.querySelector("button").disabled = !current || !activeTrip(current);
  await showCoding(truck(d, current?.truck_id), d, current);
  const host = $("#delivery-timeline");
  host.replaceChildren();
  if (!current) {
    host.append(el("li", "No delivery assigned."));
    return;
  }
  const logs = d.delivery_status_logs
    .filter((x) => x.dispatch_id === current.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const [name, status] of [
    ["Departure", "scheduled"],
    ["In Transit", "on_way"],
    ["Destination", "delivered"],
  ]) {
    const event = logs.find((x) => x.new_status === status),
      li = el("li", undefined, event ? "done" : "");
    li.append(
      el("strong", name),
      el("p", event ? stamp(event.created_at) : "Not reached", "muted"),
    );
    host.append(li);
  }
  for (const log of logs.filter((x) =>
    ["not_delivered", "cancelled"].includes(x.new_status),
  )) {
    const li = el("li");
    li.append(
      el("strong", label(log.new_status)),
      el("p", stamp(log.created_at), "muted"),
    );
    host.append(li);
  }
}
const state = await boot("driver", driverData, render);
if (state) {
  $("#dispatch-choice").onchange = () => render(state);
  bindForm("delivery-form", async (p) => {
    await confirmDelivery(p.id, p.status);
    await state.refresh();
  });
  watch(state, [...fleetTables, "delivery_status_logs"]);
}
