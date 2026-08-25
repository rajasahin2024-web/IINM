// Copies self-hosted TinyMCE from node_modules into public/tinymce so it is
// served statically by Next.js (no cloud API key required, GPL2+ build).
import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "node_modules", "tinymce");
const dst = join(root, "public", "tinymce");

if (!existsSync(src)) {
  console.log("[copy-tinymce] node_modules/tinymce not found, skipping.");
  process.exit(0);
}

if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });
cpSync(src, dst, { recursive: true });
console.log("[copy-tinymce] Copied TinyMCE -> public/tinymce");
