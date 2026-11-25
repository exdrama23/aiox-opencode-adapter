/**
 * AIOX Update Notifier - plugin para OpenCode
 *
 * V2: exporta um objeto { id, setup } (novo contrato de plugins do OpenCode 2).
 * V1: mantem o entrypoint legado `server()` para OpenCode 1.18.29+.
 *
 * A notificacao visual (toast) no V2 e feita pela parte TUI em ./tui.js.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(os.homedir(), ".aiox", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "update.json");
const DEBUG_FILE = path.join(CACHE_DIR, "plugin-debug.log");
const DEBUG_MAX_BYTES = 256 * 1024;
const REGISTRY_URL = "https://registry.npmjs.org/aiox-universal/latest";

function debug(msg) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    if (fs.existsSync(DEBUG_FILE) && fs.statSync(DEBUG_FILE).size > DEBUG_MAX_BYTES) {
      // Keep the log bounded: retain only the most recent ~32 KB.
      const tail = fs.readFileSync(DEBUG_FILE).slice(-32 * 1024).toString("utf8");
      fs.writeFileSync(DEBUG_FILE, tail.slice(tail.indexOf("\n") + 1));
    }
    fs.appendFileSync(DEBUG_FILE, `${new Date().toISOString()} ${msg}\n`);
  } catch {}
}

export function readInstalledVersion() {
  const candidates = [
    path.join(PLUGIN_DIR, "version.json"),
    path.join(PLUGIN_DIR, "..", "..", "package.json"),
  ];

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
      if (pkg && pkg.version) return String(pkg.version);
    } catch (e) {
      debug(`[readInstalledVersion] ${file} ${e?.message}`);
    }
  }

  return "0.0.0";
}

export function isNewer(latest, current) {
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

export function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    if (!data.latestVersion) return null;
    const ttl = 24 * 60 * 60 * 1000;
    if (typeof data.checkedAt === "number" && Date.now() - data.checkedAt > ttl) return null;
    return data;
  } catch (e) {
    debug(`[readCache] ${e?.message}`);
    return null;
  }
}

export async function fetchLatestVersion(timeoutMs = 3000) {
  try {
    if (typeof fetch !== "function") return null;
    const res = await fetch(REGISTRY_URL, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const pkg = await res.json();
    return pkg && pkg.version ? String(pkg.version) : null;
  } catch (e) {
    debug(`[fetchLatestVersion] ${e?.message}`);
    return null;
  }
}

export async function resolveLatestVersion() {
  const cached = readCache();
  if (cached) return cached.latestVersion;

  const latest = await fetchLatestVersion();
  if (latest) {
    try {
      if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify({ checkedAt: Date.now(), latestVersion: latest }));
    } catch {}
  }
  return latest;
}

async function checkForUpdate(source) {
  debug(`[AioxUpdate] check source=${source}`);
  try {
    const current = readInstalledVersion();
    const latest = await resolveLatestVersion();
    if (!latest) {
      debug("[AioxUpdate] no latest version");
      return null;
    }
    if (!isNewer(latest, current)) {
      debug(`[AioxUpdate] up to date current=${current} latest=${latest}`);
      return null;
    }

    debug(`[AioxUpdate] update available current=${current} latest=${latest}`);
    return { current, latest };
  } catch (e) {
    debug(`[AioxUpdate] error ${e?.message} ${e?.stack}`);
    return null;
  }
}

// V1 legacy entrypoint (OpenCode 1.18.29+ still calls `server()`).
async function v1Server({ client }) {
  const doCheck = async (source) => {
    const update = await checkForUpdate(source);
    if (!update) return;
    const { current, latest } = update;

    try {
      await client.app.log({
        body: {
          service: "aiox",
          level: "warn",
          message: `Nova versao disponivel!! v${current} → v${latest}`,
          extra: {
            title: "Nova versao disponivel!!",
            current,
            latest,
            actions: ["Cancelar", "Atualizar"],
            hint: "aiox-global update",
          },
        },
      });
    } catch (e) {
      debug(`[AioxUpdate] log fail ${e?.message}`);
    }

    try {
      await client.tui.showToast({
        body: {
          message: `Nova versao disponivel!! v${current} → v${latest} | [Cancelar] [Atualizar]`,
          variant: "warning",
        },
      });
    } catch (e) {
      debug(`[AioxUpdate] toast fail ${e?.message}`);
    }
  };

  void doCheck("init");

  return {
    "server.connected": async () => {
      await doCheck("server.connected");
    },
  };
}

const AioxUpdatePlugin = {
  id: "aiox.update",
  async setup() {
    debug("[AioxUpdate] setup (v2)");
    // Nao bloqueia o carregamento do OpenCode com uma chamada de rede.
    void checkForUpdate("setup");
  },
  // V1 compatibility entrypoint.
  server: v1Server,
};

export const AioxUpdate = AioxUpdatePlugin;
export default AioxUpdatePlugin;
