// Browser tests use a disposable PostgreSQL engine and mocked Auth/HTTP transport.
// They never access an operational Supabase project. No mock mode exists in the application.
import { chromium } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir, mkdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
const build = spawnSync(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "build",
    "--outDir",
    "test-results/browser-build",
  ],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
    },
  },
);
if (build.status) {
  console.error(build.stderr);
  process.exit(1);
}
const root = resolve("test-results/browser-build");
const server = createServer(async (req, res) => {
  try {
    const path = resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
    if (!path.startsWith(root + "/")) {
      res.writeHead(403).end();
      return;
    }
    res.setHeader(
      "Content-Type",
      {
        ".js": "application/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".png": "image/png",
      }[extname(path)] || "application/octet-stream",
    );
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end("Not found");
  }
});
await new Promise((r) => server.listen(4183, "127.0.0.1", r));
const db = new PGlite();
const admin = "11111111-1111-4111-8111-111111111111",
  driver = "22222222-2222-4222-8222-222222222222";
let actor = admin,
  queue = Promise.resolve();
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);`,
);
const migration = (await readdir("supabase/migrations")).find((x) =>
  x.endsWith("_core.sql"),
);
await db.exec(await readFile("supabase/migrations/" + migration, "utf8"));
await db.exec(
  `insert into auth.users values('${admin}'),('${driver}');insert into public.profiles(id,role,full_name,phone) values('${admin}','administrator','Robert Owens','+63 900 000 0000'),('${driver}','driver','James Wilson','+63 900 000 0001');insert into public.drivers values('${driver}','TEST-LICENSE','2099-01-01');update public.company_settings set owner_name='Robert Owens',owner_phone='+63 900 000 0000';`,
);
async function run(fn) {
  const current = actor;
  const next = queue.then(async () => {
    await db.exec(
      `reset role;select set_config('request.jwt.claim.sub','${current}',false);set role authenticated`,
    );
    return fn();
  });
  queue = next.catch(() => {});
  return next;
}
async function act(action, payload = {}) {
  return run(async () => {
    const r = await db.query(
      "select public.perform_action($1,$2,$3) as result",
      [action, JSON.stringify(payload), crypto.randomUUID()],
    );
    return r.rows[0].result;
  });
}
const truck = await act("truck_save", {
  code: "TRK-001",
  plate: "ABC1234",
  truck_type: "Cargo Truck",
  make: "Isuzu",
  model: "Giga",
  driver_id: driver,
  next_maintenance: "2098-01-01",
  base_status: "available",
  condition: "Good",
});
const today = new Date();
const trip = await act("dispatch_save", {
  code: "DSP-1042",
  driver_id: driver,
  truck_id: truck.id,
  area_id: "metro-manila",
  starts_at: today.toISOString(),
  ends_at: new Date(today.getTime() + 8 * 3600000).toISOString(),
  client: "Test Distribution Inc.",
  pickup: "General Trias, Cavite",
  destination: "Manila",
});
await mkdir("test-results/screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
let checks = 0;
const errors = [];
async function context(userId) {
  actor = userId;
  const user = {
    id: userId,
    email: userId === admin ? "admin@example.test" : "driver@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await ctx.addInitScript(
    ({ user }) => {
      const payload = btoa(
        JSON.stringify({
          sub: user.id,
          role: "authenticated",
          aud: "authenticated",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );
      const session = {
        access_token: "e30." + payload + ".fixture",
        refresh_token: "fixture",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user,
      };
      localStorage.setItem("sb-127-auth-token", JSON.stringify(session));
    },
    { user },
  );
  await ctx.route("http://127.0.0.1:54321/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    let result,
      status = 200;
    try {
      if (url.pathname.startsWith("/auth/v1/user")) result = user;
      else if (url.pathname.startsWith("/auth/v1/logout")) result = {};
      else if (url.pathname.startsWith("/rest/v1/rpc/")) {
        const name = url.pathname.split("/").at(-1),
          p = req.postDataJSON();
        const args = {
          perform_action: ["action", "payload", "request_id"],
          check_coding: ["truck_id", "area_id", "starts_at", "ends_at"],
          check_eligibility: [
            "truck_id",
            "driver_id",
            "area_id",
            "starts_at",
            "ends_at",
            "ignore_id",
          ],
          truck_state: ["truck_id"],
        }[name];
        if (!args) throw new Error("Unexpected RPC " + name);
        result = await run(async () => {
          const rows = (
            await db.query(
              `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
              args.map((k) =>
                typeof p[k] === "object" && p[k] !== null
                  ? JSON.stringify(p[k])
                  : p[k],
              ),
            )
          ).rows;
          return rows[0].result;
        });
      } else if (url.pathname.startsWith("/rest/v1/")) {
        const name = url.pathname.split("/").at(-1);
        if (!/^[a-z_]+$/.test(name)) throw new Error("Bad table");
        const id = url.searchParams.get("id");
        const resultRows = await run(async () => {
          const rows = (
            await db.query(
              `select * from public.${name}${id ? " where id=$1" : ""} order by id`,
              id ? [id.replace(/^eq\./, "")] : [],
            )
          ).rows;
          const start = Number(url.searchParams.get("offset") || 0),
            limit = Number(url.searchParams.get("limit") || 500);
          return rows.slice(start, start + limit);
        });
        result = req.headers().accept?.includes("vnd.pgrst.object")
          ? resultRows[0] || null
          : resultRows;
      } else if (url.pathname.startsWith("/functions/v1/route")) {
        status = 400;
        result = { error: "Routing is pending configuration (test fixture)." };
      } else {
        status = 400;
        result = {
          error: "Endpoint intentionally unavailable in local fixture.",
        };
      }
    } catch (e) {
      status = 400;
      result = { message: e.message, error: e.message };
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result),
    });
  });
  await ctx.route("https://*.tile.openstreetmap.org/**", (r) => r.abort());
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page };
}
async function check(name, fn) {
  await fn();
  checks++;
  console.log("PASS " + name);
}
try {
  let { ctx, page } = await context(admin);
  for (const screen of [
    "dashboard",
    "trucks",
    "dispatch",
    "maintenance",
    "attendance",
    "reports",
    "settings",
  ]) {
    await check(`admin/${screen}.html direct URL and refresh`, async () => {
      const r = await page.goto(`http://127.0.0.1:4183/admin/${screen}.html`);
      assert.equal(r.status(), 200);
      await page.waitForSelector(".nav-link.active");
      await page.waitForFunction(
        () =>
          !document.querySelector("td.empty")?.textContent.includes("Loading"),
      );
      await page.waitForTimeout(150);
      const msg = await page.locator("#message").innerText();
      assert.ok(!msg, `${screen}: ${msg}`);
      await page.screenshot({
        path: `test-results/screenshots/admin-${screen}-fixture.png`,
        fullPage: true,
      });
      await page.reload();
      await page.waitForSelector(".nav-link.active");
    });
  }
  await page.goto("http://127.0.0.1:4183/admin/trucks.html");
  await page.waitForSelector("#trucks-body .plate");
  await check("truck modal, create, and search", async () => {
    await page.click("#add-truck");
    await page.fill("#truck-modal [name=code]", "TRK-002");
    await page.fill("#truck-modal [name=plate]", "XYZ 9876");
    await page.fill("#truck-modal [name=make]", "Hino");
    await page.fill("#truck-modal [name=model]", "500");
    await page.screenshot({
      path: "test-results/screenshots/admin-truck-modal-fixture.png",
    });
    await page.click("#truck-modal button[type=submit]");
    await page.waitForSelector("#truck-modal", { state: "hidden" });
    await page.fill("#search", "XYZ9876");
    await page.waitForFunction(() =>
      document.querySelector("#trucks-body").textContent.includes("XYZ9876"),
    );
    assert.equal(await page.locator("#trucks-body tr").count(), 1);
  });
  await check("mobile table and navigation stay inside viewport", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: "test-results/screenshots/mobile-trucks-fixture.png",
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    );
    await page.click("#menu-toggle");
    await page.waitForSelector(".sidebar.open");
    await page.click('.nav-link[href$="attendance.html"]');
    await page.waitForURL("**/admin/attendance.html");
  });
  await ctx.close();
  ({ ctx, page } = await context(driver));
  for (const screen of [
    "dashboard",
    "attendance",
    "my-truck",
    "delivery-status",
    "maintenance",
  ]) {
    await check(`driver/${screen}.html direct URL and refresh`, async () => {
      await page.goto(`http://127.0.0.1:4183/driver/${screen}.html`);
      await page.waitForSelector(".nav-link.active");
      await page.waitForFunction(
        () =>
          !document.querySelector("td.empty")?.textContent.includes("Loading"),
      );
      await page.waitForTimeout(150);
      assert.equal(await page.locator("#message").innerText(), "");
      await page.screenshot({
        path: `test-results/screenshots/driver-${screen}-fixture.png`,
        fullPage: true,
      });
      await page.reload();
      await page.waitForSelector(".nav-link.active");
    });
  }
  await check("driver route guard redirects admin URLs", async () => {
    await page.goto("http://127.0.0.1:4183/admin/settings.html");
    await page.waitForURL("**/driver/dashboard.html");
  });
  await check(
    "driver time in and time out saved through real SQL RPC",
    async () => {
      await page.goto("http://127.0.0.1:4183/driver/attendance.html");
      await page.waitForSelector(".nav-link.active");
      await page.click("#time-in");
      await page.waitForFunction(() =>
        document
          .querySelector("#active-shift")
          .textContent.includes("Active shift"),
      );
      await page.click("#time-out");
      await page.waitForFunction(() =>
        document
          .querySelector("#attendance-body")
          .textContent.includes("Completed"),
      );
    },
  );
  await check(
    "delivery radio selection does not save before confirmation",
    async () => {
      await page.goto("http://127.0.0.1:4183/driver/delivery-status.html");
      await page.waitForSelector("#dispatch-choice option", {
        state: "attached",
      });
      await page.check("[value=on_way]");
      const before = await run(() =>
        db.query("select status from public.dispatches where id=$1", [trip.id]),
      );
      assert.equal(before.rows[0].status, "scheduled");
      await page.click("#delivery-form button");
      await page.waitForFunction(() =>
        document
          .querySelector("#current-delivery")
          .textContent.includes("On The Way"),
      );
      const after = await run(() =>
        db.query("select status from public.dispatches where id=$1", [trip.id]),
      );
      assert.equal(after.rows[0].status, "on_way");
    },
  );
  await check("maintenance submission appears in own history", async () => {
    await page.goto("http://127.0.0.1:4183/driver/maintenance.html");
    await page.waitForSelector("#truck_id option", { state: "attached" });
    await page.fill(
      "[name=description]",
      "A faint vibration during idle; inspect at next service.",
    );
    await page.click("#issue-form button");
    await page.waitForFunction(() =>
      document
        .querySelector("#report-history")
        .textContent.includes("faint vibration"),
    );
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "test-results/screenshots/mobile-driver-maintenance-fixture.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  );
  await ctx.close();
  const publicContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  page = await publicContext.newPage();
  await check("login page and unauthenticated guard", async () => {
    await page.goto("http://127.0.0.1:4183/login.html");
    await page.screenshot({
      path: "test-results/screenshots/login.png",
      fullPage: true,
    });
    await page.goto("http://127.0.0.1:4183/admin/dashboard.html");
    await page.waitForURL("**/login.html");
  });
  await check("recovery and entry HTML pages exist", async () => {
    assert.equal(
      (await page.goto("http://127.0.0.1:4183/reset-password.html")).status(),
      200,
    );
    assert.equal(
      (await page.goto("http://127.0.0.1:4183/index.html")).status(),
      200,
    );
  });
  assert.deepEqual(errors, [], "Uncaught browser exceptions");
  console.log(
    `\n${checks} browser checks passed. Browser transport/Auth are fixtures; workflow RPCs use the real migration in local PGlite.`,
  );
  await publicContext.close();
} catch (e) {
  console.error("FAIL", e.stack);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
  await db.close();
}
