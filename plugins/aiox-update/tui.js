/**
 * AIOX Update Notifier - parte TUI (OpenCode V2)
 *
 * O servidor nao expoe toasts para plugins V2, entao a notificacao visual
 * fica na parte TUI do mesmo plugin. O OpenCode carrega ./tui.js ao lado de
 * ./index.js sem precisar de package.json.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(os.homedir(), ".aiox", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "update.json");
const REGISTRY_URL = "https://registry.npmjs.org/aiox-opencode-adapter/latest";

function readInstalledVersion() {
  const candidates = [
    path.join(PLUGIN_DIR, "version.json"),
    path.join(PLUGIN_DIR, "..", "..", "package.json"),
  ];

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
      if (pkg && pkg.version) return String(pkg.version);
    } catch {}
  }
  return "0.0.0";
}

function isNewer(latest, current) {
  const parse = (v) =>
    String(v)
      .replace(/^v/, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const l = parse(latest);
  const c = parse(current);
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

function readCachedLatest() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    if (!data.latestVersion) return null;
    const ttl = 24 * 60 * 60 * 1000;
    if (typeof data.checkedAt === "number" && Date.now() - data.checkedAt > ttl) return null;
    return data.latestVersion;
  } catch {
    return null;
  }
}

async function fetchLatest() {
  try {
    if (typeof fetch !== "function") return null;
    const res = await fetch(REGISTRY_URL, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const pkg = await res.json();
    return pkg && pkg.version ? String(pkg.version) : null;
  } catch {
    return null;
  }
}

export default {
  id: "aiox.update.tui",
  async setup(context) {
    try {
      const current = readInstalledVersion();
      const latest = readCachedLatest() || (await fetchLatest());
      if (!latest || !isNewer(latest, current)) return;

      context.ui.toast.show({
        title: "Nova versão disponível",
        message: `v${current} → v${latest} — rode: aiox-global update`,
        variant: "warning",
        duration: 12000,
      });
    } catch {
      // Nunca quebrar a TUI por causa do notificador.
    }
  },
};
