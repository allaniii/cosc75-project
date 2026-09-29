import { boot, watch, loadFleet, fleetTables } from "../../components/shell.js";
import { truck } from "../../components/data.js";
import {
  $,
  options,
  bindForm,
  text,
  el,
  badge,
  button,
  details,
} from "../../utils/dom.js";
import { activeTrip, stamp, label } from "../../utils/format.js";
import {
  uploadPhoto,
  reportIssue,
  photoUrl,
} from "../../services/maintenance.js";
let attachment, attachmentFile;
function render({ data: d, profile: p }) {
  const ids = new Set([
    ...d.driver_truck_assignments
      .filter((a) => !a.ends_at)
      .map((a) => a.truck_id),
    ...d.dispatches.filter(activeTrip).map((a) => a.truck_id),
  ]);
  options(
    $("#issue-form").elements.truck_id,
    d.trucks.filter((t) => ids.has(t.id) && !t.archived),
    (t) => `${t.code} · ${t.plate}`,
    null,
  );
  $("#issue-form button").disabled = !ids.size;
  const company = d.company_settings[0];
  text(
    "owner-info",
    [company.owner_name, company.owner_phone, company.email]
      .filter(Boolean)
      .join(" · ") || "Owner contact is not configured.",
  );
  if (company.owner_phone) {
    $("#contact-owner").href =
      "tel:" + company.owner_phone.replace(/[^+0-9]/g, "");
    $("#contact-owner").hidden = false;
  }
  const host = $("#report-history");
  host.replaceChildren();
  for (const r of [...d.maintenance_reports].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )) {
    const article = el("article", undefined, "notification-item");
    const heading = el("div", undefined, "flex between");
    heading.append(
      el("strong", `${r.category} · ${truck(d, r.truck_id)?.plate}`),
      badge(r.review_state),
    );
    article.append(
      heading,
      el("p", r.description),
      el(
        "small",
        `${label(r.priority)} · ${stamp(r.created_at)} · ${r.location}`,
      ),
    );
    if (r.resolution)
      article.append(el("p", "Resolution: " + r.resolution, "notice success"));
    if (r.photo_path)
      article.append(
        button("View Photo", async () => {
          const data = await photoUrl(r.photo_path);
          details("Maintenance Attachment", { Issue: r.category });
          const img = el("img");
          img.src = data.signedUrl;
          img.alt = "Reported vehicle issue";
          img.className = "report-image";
          $("#detail-body").append(img);
        }),
      );
    host.append(article);
  }
  if (!host.childElementCount)
    host.append(el("p", "No maintenance reports submitted yet.", "empty"));
}
const state = await boot("driver", loadFleet, render);
if (state) {
  bindForm("issue-form", async (p, f) => {
    const file = f.elements.photo.files[0];
    if (file !== attachmentFile) {
      attachment = null;
      attachmentFile = file;
    }
    if (file && !attachment)
      attachment = await uploadPhoto(file, state.profile.id);
    await reportIssue({ ...p, photo_path: attachment });
    attachment = null;
    attachmentFile = null;
    f.reset();
    await state.refresh();
  });
  watch(state, fleetTables);
}
