import { defineConfig } from "vite";
import { resolve } from "node:path";
const pages = [
  "index",
  "login",
  "reset-password",
  "admin/dashboard",
  "admin/trucks",
  "admin/dispatch",
  "admin/maintenance",
  "admin/attendance",
  "admin/reports",
  "admin/settings",
  "driver/dashboard",
  "driver/attendance",
  "driver/my-truck",
  "driver/delivery-status",
  "driver/maintenance",
];
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((p) => [p, resolve(import.meta.dirname, `${p}.html`)]),
      ),
    },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
