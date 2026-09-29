import { boot, watch, loadFleet, fleetTables } from "../../components/shell.js";
import { truck, person } from "../../components/data.js";
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
  el,
} from "../../utils/dom.js";
import { stamp, localInput, fromManila, label } from "../../utils/format.js";
import {
  saveService,
  reviewReport,
  photoUrl,
} from "../../services/maintenance.js";
const state = await boot("admin", loadFleet, render);
function edit(j = {}) {
  const f = openModal("service-modal", j);
  options(
    f.elements.truck_id,
    state.data.trucks.filter((t) => !t.archived),
    (t) => `${t.code} · ${t.plate}`,
  );
  options(
    f.elements.report_id,
    state.data.maintenance_reports.filter(
      (r) =>
        ["submitted", "reviewed"].includes(r.review_state) ||
        r.id === j.report_id,
    ),
    (r) =>
      `${truck(state.data, r.truck_id)?.code} · ${r.category} · ${r.id.slice(0, 8)}`,
    "Routine service",
  );
  f.elements.truck_id.value = j.truck_id || "";
  f.elements.report_id.value = j.report_id || "";
  f.elements.scheduled_at.value = localInput(j.scheduled_at || new Date());
  f.elements.ends_at.value = localInput(
    j.ends_at || new Date(Date.now() + 4 * 3600000),
  );
  f.elements.status.value = j.status || "scheduled";
  f.elements.priority.value = j.priority || "medium";
}
async function viewReport(r) {
  details("Driver Maintenance Report", {
    Truck: truck(state.data, r.truck_id)?.code,
    Reporter: person(state.data, r.reporter_id),
    Category: r.category,
    Description: r.description,
    Priority: label(r.priority),
    Location: r.location,
    Submitted: stamp(r.created_at),
    Review: label(r.review_state),
    Resolution: r.resolution,
  });
  if (r.photo_path) {
    const data = await photoUrl(r.photo_path);
    const img = el("img");
    img.src = data.signedUrl;
    img.alt = "Attached maintenance issue";
    img.className = "report-image";
    $("#detail-body").append(img);
  }
}
function render({ data: d }) {
  text(
    "scheduled-count",
    d.maintenance_schedules.filter((j) => j.status === "scheduled").length,
  );
  text(
    "repairs-count",
    d.maintenance_schedules.filter((j) => j.status === "in_progress").length,
  );
  text(
    "urgent-count",
    d.maintenance_reports.filter(
      (r) =>
        r.priority === "urgent" &&
        ["submitted", "reviewed"].includes(r.review_state),
    ).length,
  );
  const q = $("#search").value.toLowerCase(),
    priority = $("#priority-filter").value;
  const jobs = d.maintenance_schedules.filter(
    (j) =>
      (!priority || j.priority === priority) &&
      [truck(d, j.truck_id)?.code, j.service_type, j.mechanic]
        .join(" ")
        .toLowerCase()
        .includes(q),
  );
  const row = (j) => [
    j.id.slice(0, 8),
    truck(d, j.truck_id)?.code,
    j.service_type,
    stamp(j.scheduled_at),
    badge(j.priority),
    badge(j.status),
    j.mechanic || "Unassigned",
    actions(
      button("View", () =>
        details("Maintenance Work", {
          Service: j.service_type,
          Truck: truck(d, j.truck_id)?.code,
          Scheduled: stamp(j.scheduled_at),
          Status: label(j.status),
          Mechanic: j.mechanic,
          Notes: j.notes,
          Cost: j.cost,
        }),
      ),
      ...(["scheduled", "in_progress"].includes(j.status)
        ? [button("Edit", () => edit(j))]
        : []),
    ),
  ];
  table(
    "schedule-body",
    jobs
      .filter((j) => ["scheduled", "in_progress"].includes(j.status))
      .map(row),
    8,
  );
  table(
    "history-body",
    jobs.filter((j) => ["completed", "cancelled"].includes(j.status)).map(row),
    8,
  );
  const reports = d.maintenance_reports.filter(
    (r) =>
      (!priority || r.priority === priority) &&
      [
        r.category,
        r.description,
        truck(d, r.truck_id)?.code,
        person(d, r.reporter_id),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
  );
  table(
    "reports-body",
    reports.map((r) => [
      r.id.slice(0, 8),
      person(d, r.reporter_id),
      plate(truck(d, r.truck_id)?.plate),
      r.category,
      badge(r.priority),
      badge(r.review_state),
      actions(
        button("View", () => viewReport(r)),
        ...(["submitted", "reviewed"].includes(r.review_state)
          ? [
              button("Review", () =>
                openModal("review-modal", { ...r, review_state: "reviewed" }),
              ),
              button("Create Work", () =>
                edit({
                  report_id: r.id,
                  truck_id: r.truck_id,
                  priority: r.priority,
                  service_type: r.category,
                }),
              ),
            ]
          : []),
      ),
    ]),
    7,
  );
  const host = $("#alerts-list");
  host.replaceChildren();
  const alerts = d.maintenance_schedules.filter(
    (j) =>
      ["scheduled", "in_progress"].includes(j.status) &&
      new Date(j.scheduled_at) <=
        new Date(Date.now() + d.company_settings[0].due_soon_days * 86400000),
  );
  for (const j of alerts) {
    const n = el("div", undefined, "notification-item");
    n.append(
      el("strong", `${truck(d, j.truck_id)?.code} · ${j.service_type}`),
      el("p", `${stamp(j.scheduled_at)} · ${label(j.priority)}`),
    );
    host.append(n);
  }
  for (const r of d.maintenance_reports.filter(
    (r) =>
      ["high", "urgent"].includes(r.priority) &&
      ["submitted", "reviewed"].includes(r.review_state),
  ))
    host.append(
      el(
        "p",
        `${truck(d, r.truck_id)?.code} · ${r.category} · ${label(r.priority)} · unresolved`,
      ),
    );
  if (!host.childElementCount)
    host.append(el("p", "No active alerts.", "muted"));
}
if (state) {
  $("#add-service").onclick = () => edit();
  for (const id of ["search", "priority-filter"])
    $("#" + id).oninput = () => render(state);
  bindForm("service-modal-form", async (p) => {
    p.scheduled_at = fromManila(p.scheduled_at);
    p.ends_at = fromManila(p.ends_at);
    await saveService(p);
    $("#service-modal").close();
    await state.refresh();
  });
  bindForm("review-modal-form", async (p) => {
    await reviewReport(p);
    $("#review-modal").close();
    await state.refresh();
  });
  watch(state, fleetTables);
}
