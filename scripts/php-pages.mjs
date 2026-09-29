import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
// These optional PHP entry points serve the built HTML. Business logic remains in Supabase.
for (const base of [".", "admin", "driver"]) {
  for (const file of await readdir(join("dist", base))) {
    if (!file.endsWith(".html")) continue;
    const php = `<?php\n// Edit ${base === "." ? "" : base + "/"}${file}, then run npm run build.\n// Fixed filename: no request input is used for file access.\nheader('Content-Type: text/html; charset=UTF-8');\nheader('X-Content-Type-Options: nosniff');\nreadfile(__DIR__ . '/${file}');\n`;
    await writeFile(join("dist", base, file.replace(".html", ".php")), php);
  }
}
