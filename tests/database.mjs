import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
let count = 0;
const admin = "11111111-1111-4111-8111-111111111111",
  driver = "22222222-2222-4222-8222-222222222222",
  other = "33333333-3333-4333-8333-333333333333";
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;create publication supabase_realtime;`,
);
const files = (await readdir("supabase/migrations")).filter((f) =>
  f.includes("_core.sql"),
);
await db.exec(await readFile("supabase/migrations/" + files[0], "utf8"));
const infra = (await readdir("supabase/migrations")).find((f) =>
  f.includes("_storage_realtime.sql"),
);
await db.exec(await readFile("supabase/migrations/" + infra, "utf8"));
await db.exec(
  `insert into storage.objects(bucket_id,name) values('maintenance-images','${driver}/test.png'),('maintenance-images','${other}/test.png')`,
);
await db.exec(
  `insert into auth.users values ('${admin}'),('${driver}'),('${other}');insert into public.profiles(id,role,full_name) values ('${admin}','administrator','Admin'),('${driver}','driver','Driver One'),('${other}','driver','Driver Two');insert into public.drivers values ('${driver}','LIC1','2099-01-01'),('${other}','LIC2','2099-01-01');`,
);
async function as(id, role = "authenticated") {
  await db.exec(
    `reset role;select set_config('request.jwt.claim.sub','${id || ""}',false);set role ${role}`,
  );
}
async function query(sql, params = []) {
  return (await db.query(sql, params)).rows;
}
async function action(name, p = {}, key = crypto.randomUUID()) {
  const rows = await query(
    "select public.perform_action($1,$2::jsonb,$3::uuid) as result",
    [name, JSON.stringify(p), key],
  );
  return rows[0].result;
}
async function ok(name, fn) {
  await fn();
  count++;
  console.log("PASS " + name);
}
async function fails(p, pattern) {
  await assert.rejects(p, pattern);
}
try {
  await as(null, "anon");
  await ok("anonymous cannot read operational data", () =>
    fails(query("select * from public.trucks"), /permission denied/),
  );
  await ok("anonymous cannot mutate", () =>
    fails(action("time_in"), /permission denied/),
  );
  await as(admin);
  const a = await action("truck_save", {
    code: "T1",
    plate: "abc 1231",
    truck_type: "Cargo Truck",
    make: "Isuzu",
    model: "Giga",
    driver_id: driver,
  });
  const b = await action("truck_save", {
    code: "T2",
    plate: "xyz 5672",
    truck_type: "Cargo Truck",
    driver_id: other,
  });
  const c = await action("truck_save", {
    code: "UNUSED",
    plate: "xxx 0005",
    truck_type: "Cargo Truck",
  });
  await ok("plates normalize and trucks are stored", async () =>
    assert.equal(
      (await query("select plate from public.trucks where id=$1", [a.id]))[0]
        .plate,
      "ABC1231",
    ),
  );
  await ok("normalized plate uniqueness", () =>
    fails(
      action("truck_save", {
        code: "DUPE",
        plate: "ABC-1231",
        truck_type: "Cargo Truck",
      }),
      /duplicate key/,
    ),
  );
  await ok("unused truck can be deleted", () =>
    action("truck_delete", { id: c.id }),
  );
  await ok("referenced truck cannot be deleted", () =>
    fails(action("truck_delete", { id: a.id }), /foreign key/),
  );
  await as(driver);
  await ok("driver only sees assigned truck and own profile", async () => {
    assert.equal((await query("select * from public.trucks")).length, 1);
    assert.equal((await query("select * from public.profiles")).length, 1);
  });
  await ok("driver cannot forge role by direct update", () =>
    fails(
      query("update public.profiles set role='administrator' where id=$1", [
        driver,
      ]),
      /permission denied/,
    ),
  );
  await ok("driver can read only own private image objects", async () =>
    assert.equal((await query("select * from storage.objects")).length, 1),
  );
  await ok("direct image upload bypass is rejected", () =>
    fails(
      query(
        "insert into storage.objects(bucket_id,name) values('maintenance-images',$1)",
        [driver + "/bypass.png"],
      ),
      /row-level security/,
    ),
  );
  await ok("driver cannot call admin mutation", () =>
    fails(action("truck_delete", { id: b.id }), /Administrator/),
  );
  await ok("driver cannot query an unauthorized truck state", () =>
    fails(query("select public.truck_state($1)", [b.id]), /not accessible/),
  );
  await ok("time out without active shift rejected", () =>
    fails(action("time_out"), /No active shift/),
  );
  const request = crypto.randomUUID();
  const shift = await action("time_in", {}, request);
  await ok("idempotent retry returns same shift", async () =>
    assert.equal((await action("time_in", {}, request)).id, shift.id),
  );
  await ok("second time in cannot create another active shift", async () => {
    assert.equal((await action("time_in")).id, shift.id);
    assert.equal((await query("select * from public.attendance")).length, 1);
  });
  await ok("request id cannot be reused for different action", () =>
    fails(action("time_out", {}, request), /already used/),
  );
  await action("time_out");
  await action("time_in");
  await action("time_out");
  await ok("multiple completed shifts in one day allowed", async () =>
    assert.equal((await query("select * from public.attendance")).length, 2),
  );
  await as(other);
  await ok("other driver cannot read attendance", async () =>
    assert.equal((await query("select * from public.attendance")).length, 0),
  );
  await as(admin);
  // Monday in a future year, so planned intervals cannot be overdue during tests.
  const start = "2098-01-06T07:00:00+08:00",
    end = "2098-01-06T08:00:00+08:00";
  const weekday = Number(
    (await query("select extract(dow from '2098-01-06'::date) as day"))[0].day,
  );
  const rule = await action("coding_save", {
    area_id: "metro-manila",
    weekday,
    digits: "12",
    start_time: "07:00",
    end_time: "10:00",
    enabled: true,
  });
  const coding = async (s, e, area = "metro-manila") =>
    (
      await query("select public.check_coding($1,$2,$3,$4) as result", [
        a.id,
        area,
        s,
        e,
      ])
    )[0].result;
  await ok("coding includes exact start boundary", async () =>
    assert.equal((await coding(start, end)).restricted, true),
  );
  await ok("coding excludes exact end boundary", async () =>
    assert.equal(
      (await coding("2098-01-06T10:00:00+08:00", "2098-01-06T11:00:00+08:00"))
        .restricted,
      false,
    ),
  );
  await action("area_save", { id: "cavite", name: "Cavite" });
  await ok("coding area isolation", async () =>
    assert.equal((await coding(start, end, "cavite")).restricted, false),
  );
  await action("coding_save", {
    id: rule.id,
    area_id: "metro-manila",
    weekday,
    digits: "12",
    start_time: "22:00",
    end_time: "03:00",
    enabled: true,
  });
  await ok("overnight rule includes next day", async () =>
    assert.equal(
      (await coding("2098-01-07T01:00:00+08:00", "2098-01-07T02:00:00+08:00"))
        .restricted,
      true,
    ),
  );
  await ok("overnight end boundary excludes next trip", async () =>
    assert.equal(
      (await coding("2098-01-07T03:00:00+08:00", "2098-01-07T04:00:00+08:00"))
        .restricted,
      false,
    ),
  );
  await action("coding_save", {
    id: rule.id,
    area_id: "metro-manila",
    weekday,
    digits: "12",
    start_time: "07:00",
    end_time: "10:00",
    enabled: true,
  });
  const payload = {
    driver_id: driver,
    truck_id: a.id,
    area_id: "metro-manila",
    starts_at: start,
    ends_at: end,
    client: "Test client",
    pickup: "Cavite",
    destination: "Manila",
  };
  await ok("coding blocks backend dispatch even with forged UI", () =>
    fails(action("dispatch_save", payload), /Coding Restriction/),
  );
  await action("coding_save", {
    id: rule.id,
    area_id: "metro-manila",
    weekday,
    digits: "12",
    start_time: "07:00",
    end_time: "10:00",
    enabled: false,
  });
  await ok("disabled coding rules do not restrict", async () =>
    assert.equal((await coding(start, end)).restricted, false),
  );
  const dispatch = await action("dispatch_save", payload);
  await ok("truck overlap rejected", () =>
    fails(
      action("dispatch_save", { ...payload, driver_id: other }),
      /Truck has an overlapping/,
    ),
  );
  await ok("driver overlap on another truck rejected", () =>
    fails(
      action("dispatch_save", { ...payload, truck_id: b.id }),
      /Driver has an overlapping/,
    ),
  );
  await ok("adjacent dispatch intervals allowed", () =>
    action("dispatch_save", {
      ...payload,
      starts_at: end,
      ends_at: "2098-01-06T09:00:00+08:00",
    }),
  );
  await ok("empty/invalid intervals rejected", () =>
    fails(
      action("dispatch_save", { ...payload, starts_at: end, ends_at: start }),
      /valid interval/,
    ),
  );
  await as(other);
  await ok("forged delivery ownership rejected", () =>
    fails(
      action("delivery_status", { id: dispatch.id, status: "on_way" }),
      /not accessible/,
    ),
  );
  await as(driver);
  await ok("cannot jump directly from scheduled to delivered", () =>
    fails(
      action("delivery_status", { id: dispatch.id, status: "delivered" }),
      /Invalid transition/,
    ),
  );
  // Departure rechecks actual interval: cancel adjacent future booking, use present-day dispatch.
  await as(admin);
  for (const d of await query(
    "select id from public.dispatches where status='scheduled'",
  ))
    await action("dispatch_cancel", { id: d.id });
  const now = new Date(),
    later = new Date(now.getTime() + 3600000);
  const live = await action("dispatch_save", {
    ...payload,
    starts_at: now.toISOString(),
    ends_at: later.toISOString(),
  });
  await as(driver);
  await action("delivery_status", { id: live.id, status: "on_way" });
  await ok("delivery retry does not add duplicate status log", async () => {
    await action("delivery_status", { id: live.id, status: "on_way" });
    assert.equal(
      (
        await query(
          "select * from public.delivery_status_logs where dispatch_id=$1 and new_status='on_way'",
          [live.id],
        )
      ).length,
      1,
    );
  });
  await action("delivery_status", { id: live.id, status: "not_delivered" });
  await action("delivery_status", { id: live.id, status: "on_way" });
  await action("delivery_status", { id: live.id, status: "delivered" });
  await ok("completed dispatch cannot be reopened", () =>
    fails(
      action("delivery_status", { id: live.id, status: "on_way" }),
      /Invalid transition/,
    ),
  );
  await ok("delivery logs are immutable", () =>
    fails(
      query("delete from public.delivery_status_logs"),
      /permission denied/,
    ),
  );
  await ok("forged maintenance report truck rejected", () =>
    fails(
      action("report_issue", {
        truck_id: b.id,
        category: "Brakes",
        description: "Brake noise while moving",
        priority: "high",
      }),
      /Current assigned truck/,
    ),
  );
  const report = await action("report_issue", {
    truck_id: a.id,
    category: "Brakes",
    description: "Brake noise while moving",
    priority: "high",
  });
  await ok("urgent/high report locks truck", async () =>
    assert.equal(
      (await query("select public.truck_state($1) as state", [a.id]))[0].state,
      "under_maintenance",
    ),
  );
  await as(other);
  await ok("other driver cannot see maintenance issue", async () =>
    assert.equal(
      (await query("select * from public.maintenance_reports")).length,
      0,
    ),
  );
  await as(admin);
  await ok("maintenance block enforced on dispatch", () =>
    fails(action("dispatch_save", payload), /Under Maintenance/),
  );
  const job = {
    truck_id: a.id,
    report_id: report.id,
    service_type: "Brake repair",
    scheduled_at: now.toISOString(),
    ends_at: later.toISOString(),
    priority: "high",
    status: "scheduled",
  };
  const work = await action("maintenance_save", job);
  await action("maintenance_save", {
    ...job,
    id: work.id,
    status: "cancelled",
  });
  await ok(
    "cancelled service does not release unresolved report lock",
    async () =>
      assert.equal(
        (await query("select public.truck_state($1) as state", [a.id]))[0]
          .state,
        "under_maintenance",
      ),
  );
  const work2 = await action("maintenance_save", job);
  await action("maintenance_save", {
    ...job,
    id: work2.id,
    status: "completed",
    notes: "Replaced pads and tested braking",
    cost: 1200,
  });
  await ok(
    "completing linked repair atomically resolves report and lock",
    async () => {
      assert.equal(
        (
          await query(
            "select review_state from public.maintenance_reports where id=$1",
            [report.id],
          )
        )[0].review_state,
        "resolved",
      );
      assert.equal(
        (await query("select public.truck_state($1) as state", [a.id]))[0]
          .state,
        "available",
      );
    },
  );
  await action("driver_active", { id: other, active: false });
  await as(other);
  await ok("deactivated driver immediately loses read access", async () =>
    assert.equal((await query("select * from public.trucks")).length, 0),
  );
  await ok("deactivated driver cannot mutate with old token", () =>
    fails(action("time_in"), /Active authenticated/),
  );
  await as(admin);
  await ok("all public app tables have RLS enabled", async () =>
    assert.equal(
      (
        await query(
          "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
        )
      ).length,
      0,
    ),
  );
  await ok("no public-schema SECURITY DEFINER functions", async () =>
    assert.equal(
      (
        await query(
          "select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef",
        )
      ).length,
      0,
    ),
  );
  await ok(
    "Realtime publication contains required operational tables",
    async () => {
      const tables = (
        await query(
          "select tablename from pg_publication_tables where pubname='supabase_realtime'",
        )
      ).map((x) => x.tablename);
      for (const t of [
        "attendance",
        "dispatches",
        "maintenance_reports",
        "notifications",
      ])
        assert.ok(tables.includes(t));
    },
  );
  console.log(
    `\n${count} database checks passed. Local PGlite PostgreSQL engine; hosted Supabase services and parallel sessions are not covered.`,
  );
} catch (e) {
  console.error("FAIL", e.message, e.detail || "", e.where || "");
  process.exitCode = 1;
} finally {
  await db.close();
}
