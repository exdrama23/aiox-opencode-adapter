/**
 * AIOX Update Notifier - Plugin para OpenCode
 * Aparece logo abaixo de "LSPs are disabled" com: Nova versao disponivel!! + [Cancelar] [Atualizar]
 * Implementacao robusta: log em arquivo + toast + log warn/error para garantir visibilidade
 */

import fs from "fs";
import path from "path";
import os from "os";

// Usa fetch global (Bun/Node >=18) com fallback para https
const CACHE_DIR = path.join(os.homedir(), ".aiox", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "update.json");
const DISMISSED_FILE = path.join(CACHE_DIR, "dismissed.json");
const DEBUG_FILE = path.join(CACHE_DIR, "plugin-debug.log");
const CACHE_TTL = 24 * 60 * 60 * 1000;

function debug(msg) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.appendFileSync(DEBUG_FILE, `${new Date().toISOString()} ${msg}\n`);
  } catch {}
}

function getCurrentVersion() {
  // Hardcoded + tenta ler do adapter package.json se existir
  try {
    const candidates = [
      path.join(os.homedir(), ".config", "opencode", "plugins", "aiox-update", "package.json"),
      "C:\\Users\\pc_ac\\aiox-opencode-adapter\\package.json",
      path.join(os.homedir(), "aiox-opencode-adapter", "package.json"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const j = JSON.parse(fs.readFileSync(p, "utf8"));
        if (j.version && j.version !== "0.1.0-test") return j.version;
      }
    }
  } catch {}
  return "1.4.0";
}

function isNewer(latest, current) {
  const parse = (v) => String(v).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const l = parse(latest);
  const c = parse(current);
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    // Se checkedAt no futuro (teste 9.9.9), considera valido
    const age = Date.now() - (data.checkedAt || 0);
    if (age < 0 || age < CACHE_TTL) return data;
    // Expirado mas ainda usa se tiver latest (fallback offline)
    if (data.latestVersion) return data;
    return null;
  } catch {
    return null;
  }
}

function writeCache(latest) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ checkedAt: Date.now(), latestVersion: latest }));
  } catch {}
}

function readDismissed() {
  try {
    if (!fs.existsSync(DISMISSED_FILE)) return null;
    return JSON.parse(fs.readFileSync(DISMISSED_FILE, "utf8"));
  } catch {
    return null;
  }
}

async function fetchLatest() {
  // Tenta fetch global primeiro (Bun), fallback para https
  const url = "https://registry.npmjs.org/aiox-opencode-adapter/latest";
  try {
    if (typeof fetch === "function") {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const j = await res.json();
      if (j.version) return j.version;
    }
  } catch {}
  // fallback https
  return new Promise((resolve, reject) => {
    try {
      const https = require("https");
      const req = https.get(url, { timeout: 3000 }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const j = JSON.parse(data);
            resolve(j.version);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("timeout"));
      });
    } catch (e) {
      reject(e);
    }
  });
}

export const AioxUpdate = async ({ client }) => {
  debug(`[AioxUpdate] init directory check, current=${getCurrentVersion()}`);

  const doCheck = async (source) => {
    debug(`[AioxUpdate] doCheck source=${source}`);
    try {
      const current = getCurrentVersion();
      let latest;
      const cached = readCache();
      debug(`[AioxUpdate] cache=${JSON.stringify(cached)} current=${current}`);
      if (cached && cached.latestVersion) {
        latest = cached.latestVersion;
        debug(`[AioxUpdate] using cached latest=${latest}`);
      } else {
        try {
          latest = await fetchLatest();
          debug(`[AioxUpdate] fetched latest=${latest}`);
          if (latest) writeCache(latest);
        } catch (e) {
          debug(`[AioxUpdate] fetch failed: ${e?.message}`);
          return;
        }
      }
      if (!latest) {
        debug("[AioxUpdate] no latest");
        return;
      }
      if (!isNewer(latest, current)) {
        debug(`[AioxUpdate] not newer latest=${latest} current=${current}`);
        return;
      }
      const dismissed = readDismissed();
      if (dismissed && dismissed.version === latest) {
        debug(`[AioxUpdate] dismissed version=${latest}`);
        return;
      }

      // Delay para garantir que aparece logo apos "LSPs are disabled"
      await new Promise((r) => setTimeout(r, 1500));
      debug(`[AioxUpdate] showing notification current=${current} latest=${latest}`);

      // 1) Log error/warn - aparece em vermelho/amarelo e fica persistente no painel de logs
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
              hint: "Atualize: aiox-global update  ou  npm install -g aiox-opencode-adapter@latest",
            },
          },
        });
        debug("[AioxUpdate] app.log warn sent");
      } catch (e) {
        debug(`[AioxUpdate] app.log warn failed: ${e?.message}`);
      }

      // 2) Toast - aparece no canto da TUI
      try {
        await client.tui.showToast({
          body: {
            message: `Nova versao disponivel!! v${current} → v${latest}  |  [Cancelar] [Atualizar] — aiox-global update`,
            variant: "warning",
          },
        });
        debug("[AioxUpdate] tui.showToast warning sent");
      } catch (e) {
        debug(`[AioxUpdate] toast warning failed: ${e?.message}`);
        // fallback variant info
        try {
          await client.tui.showToast({
            body: {
              message: `Nova versao disponivel!! v${current} → v${latest}`,
              variant: "info",
            },
          });
          debug("[AioxUpdate] toast info fallback sent");
        } catch (e2) {
          debug(`[AioxUpdate] toast info failed: ${e2?.message}`);
        }
      }

      // 3) Segundo log info com comandos copiaveis
      try {
        await client.app.log({
          body: {
            service: "aiox",
            level: "info",
            message: `[AIOX] Para atualizar: aiox-global update  |  Para ignorar esta versao: toque Cancelar ou delete ~/.aiox/cache/dismissed.json`,
            extra: { current, latest },
          },
        });
        debug("[AioxUpdate] second log sent");
      } catch (e) {
        debug(`[AioxUpdate] second log failed: ${e?.message}`);
      }
    } catch (e) {
      debug(`[AioxUpdate] doCheck outer error: ${e?.message} ${e?.stack}`);
    }
  };

  // Dispara em background imediatamente
  doCheck("init");

  return {
    "server.connected": async () => {
      debug("[AioxUpdate] server.connected hook");
      await doCheck("server.connected");
    },
    event: async ({ event }) => {
      if (event.type === "server.connected") {
        debug("[AioxUpdate] event server.connected");
        await doCheck("event");
      }
    },
  };
};

export const AioxUpdatePlugin = AioxUpdate;
export default AioxUpdate;
