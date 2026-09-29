export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [
  ...root.querySelectorAll(selector),
];
export function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text ?? "—";
  if (cls) n.className = cls;
  return n;
}
export function text(id, value) {
  const n = document.getElementById(id);
  if (n) n.textContent = value ?? "—";
}
export function message(value, type = "error") {
  const n = $("#message");
  if (n) {
    n.className = value ? `notice ${type}` : "";
    n.textContent = value || "";
    if (value) n.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}
export function badge(value) {
  const s = String(value || "");
  const warning =
      /scheduled|medium|high|soon|reviewed|not_delivered|not configured|not scheduled/i.test(
        s,
      ),
    bad =
      /urgent|overdue|restriction|restricted|out_of_service|cancelled/i.test(s);
  const n = el(
    "span",
    s.replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase()),
    "badge " + (bad ? "danger" : warning ? "warn" : ""),
  );
  return n;
}
export function plate(value) {
  return el("span", value, "plate");
}
export function button(title, handler, kind = "secondary") {
  const b = el("button", title, `button small ${kind}`);
  b.type = "button";
  b.addEventListener("click", async () => {
    b.disabled = true;
    try {
      await handler();
    } catch (e) {
      message(e.message);
    } finally {
      b.disabled = false;
    }
  });
  return b;
}
export function actions(...buttons) {
  const n = el("div", undefined, "row-actions");
  n.append(...buttons);
  return n;
}
export function table(id, rows, columns, empty = "No records found.") {
  const body = document.getElementById(id);
  if (!body) return;
  body.replaceChildren();
  if (!rows.length) {
    const tr = el("tr"),
      td = el("td", empty, "empty");
    td.colSpan = columns;
    tr.append(td);
    body.append(tr);
    return;
  }
  for (const row of rows) {
    const tr = el("tr");
    for (const value of row) {
      const td = el("td");
      if (value instanceof Node) td.append(value);
      else td.textContent = value ?? "—";
      tr.append(td);
    }
    body.append(tr);
  }
}
export function options(
  select,
  records,
  labeler,
  blank = "Select…",
  key = "id",
) {
  if (typeof select === "string") select = $(select);
  if (!select) return;
  const current = select.value;
  select.replaceChildren();
  if (blank !== null) select.add(new Option(blank, ""));
  for (const r of records) select.add(new Option(labeler(r), r[key]));
  if ([...select.options].some((x) => x.value === current))
    select.value = current;
}
export function fill(form, record = {}) {
  form.reset();
  for (const [key, value] of Object.entries(record)) {
    const n = form.elements.namedItem(key);
    if (n && !(n instanceof RadioNodeList)) n.value = value ?? "";
  }
}
export function values(form) {
  return Object.fromEntries(
    [...new FormData(form)].filter(([, v]) => typeof v === "string"),
  );
}
export function openModal(id, record = {}) {
  const d = document.getElementById(id),
    f = $("form", d);
  if (f) fill(f, record);
  const e = $(".modal-error", d);
  if (e) e.hidden = true;
  d.showModal();
  return f;
}
export function bindForm(id, handler) {
  const form = typeof id === "string" ? document.getElementById(id) : id;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const submit =
      $('[type="submit"]', form) || $('button:not([type="button"])', form);
    if (submit?.disabled) return;
    if (submit) submit.disabled = true;
    const err = $(".modal-error", form);
    if (err) err.hidden = true;
    try {
      await handler(values(form), form);
      message("Saved successfully.", "success");
    } catch (error) {
      if (err) {
        err.textContent = error.message;
        err.hidden = false;
      } else message(error.message);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
  return form;
}
export function details(title, record) {
  text("detail-title", title);
  const dl = el("dl", undefined, "key-value");
  for (const [key, value] of Object.entries(record)) {
    dl.append(el("dt", key), el("dd", value));
  }
  $("#detail-body").replaceChildren(dl);
  $("#detail-dialog").showModal();
}
export function definition(id, record) {
  const n = document.getElementById(id);
  if (!n) return;
  n.replaceChildren();
  for (const [k, v] of Object.entries(record)) {
    const box = el("div");
    box.append(el("dt", k));
    const dd = el("dd");
    if (v instanceof Node) dd.append(v);
    else dd.textContent = v ?? "—";
    box.append(dd);
    n.append(box);
  }
}
export function wireDialogs() {
  for (const b of $$("[data-close]"))
    b.addEventListener("click", () => b.closest("dialog").close());
  for (const d of $$("dialog"))
    d.addEventListener("click", (e) => {
      if (e.target === d) {
        const r = d.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          d.close();
      }
    });
}
export function wireTabs() {
  for (const b of $$("[data-tab]"))
    b.addEventListener("click", () => {
      for (const a of $$("[data-tab]")) {
        const active = a === b;
        a.setAttribute("aria-selected", String(active));
        $("#panel-" + a.dataset.tab).hidden = !active;
      }
      document.dispatchEvent(new Event("tabchange"));
    });
  const tabs = $$('[role="tab"]');
  tabs.forEach((b, i) =>
    b.addEventListener("keydown", (e) => {
      if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const n =
          tabs[
            (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length
          ];
        n.focus();
        n.click();
      }
    }),
  );
}
export function download(name, content, type = "text/csv;charset=utf-8") {
  const href = URL.createObjectURL(new Blob([content], { type }));
  const a = el("a");
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
