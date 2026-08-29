/**
 * AIOX Update Notifier - Plugin para OpenCode
 * Aparece abaixo de "LSPs are disabled" com: Nova versao disponivel!! + [Cancelar] [Atualizar]
 * Versao ultra-robusta: sem require, sem leitura fragil, mostra quando ha nova versao
 */

import fs from "fs";
import path from "path";
import os from "os";

const CACHE_DIR = path.join(os.homedir(), ".aiox", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "update.json");
const DEBUG_FILE = path.join(CACHE_DIR, "plugin-debug.log");
const NOTICE_FILE = path.join(CACHE_DIR, "update-notice.txt");

function debug(msg) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.appendFileSync(DEBUG_FILE, `${new Date().toISOString()} ${msg}\n`);
    // Tambem escreve notice visivel para cat
    fs.writeFileSync(NOTICE_FILE, `${new Date().toISOString()} ${msg}\n`, { flag: "a" });
  } catch {}
}

function getCurrentVersion() {
  return "1.4.0";
}

function isNewer(latest, current) {
  const p = (v) => String(v).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const l = p(latest), c = p(current);
  for (let i = 0; i < 3; i++) if ((l[i]||0) > (c[i]||0)) return true; else if ((l[i]||0) < (c[i]||0)) return false;
  return false;
}

function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      debug(`[readCache] no file ${CACHE_FILE}`);
      return null;
    }
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    const data = JSON.parse(raw);
    debug(`[readCache] raw=${raw.substring(0,120)}`);
    if (data.latestVersion) return data;
    return null;
  } catch (e) {
    debug(`[readCache] error ${e?.message}`);
    return null;
  }
}

async function fetchLatest() {
  const url = "https://registry.npmjs.org/aiox-opencode-adapter/latest";
  try {
    if (typeof fetch === "function") {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const j = await res.json();
      if (j.version) return j.version;
    }
  } catch (e) {
    debug(`[fetchLatest] fetch failed ${e?.message}`);
  }
  return null;
}

export const AioxUpdate = async ({ client }) => {
  debug(`[AioxUpdate] init current=${getCurrentVersion()}`);

  const doCheck = async (source) => {
    debug(`[AioxUpdate] doCheck source=${source}`);
    try {
      const current = getCurrentVersion();
      let latest;
      const cached = readCache();
      if (cached && cached.latestVersion) {
        latest = cached.latestVersion;
        debug(`[AioxUpdate] cached latest=${latest}`);
      } else {
        debug(`[AioxUpdate] no cache, fetching`);
        latest = await fetchLatest();
        debug(`[AioxUpdate] fetched latest=${latest}`);
        if (latest) {
          try { if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR,{recursive:true}); fs.writeFileSync(CACHE_FILE, JSON.stringify({checkedAt: Date.now(), latestVersion: latest})); } catch {}
        }
      }
      if (!latest) { debug("[AioxUpdate] no latest, abort"); return; }
      if (!isNewer(latest, current)) { debug(`[AioxUpdate] not newer latest=${latest} current=${current}`); return; }

      // Delay para cair apos LSPs are disabled
      await new Promise(r => setTimeout(r, 1500));
      debug(`[AioxUpdate] SHOW current=${current} latest=${latest}`);

      // Escreve arquivo de prova visivel via cat
      try { fs.writeFileSync(NOTICE_FILE, `Nova versao disponivel!! v${current} -> v${latest} [Cancelar] [Atualizar] aiox-global update\n`); } catch {}

      // Log 1 - warn (amarelo) - deve aparecer abaixo de LSPs are disabled no painel de logs
      try {
        await client.app.log({ body: { service: "aiox", level: "warn", message: `Nova versao disponivel!! v${current} → v${latest}`, extra: { title: "Nova versao disponivel!!", current, latest, actions: ["Cancelar","Atualizar"], hint: "aiox-global update" } } });
        debug("[AioxUpdate] log warn OK");
      } catch (e) { debug(`[AioxUpdate] log warn fail ${e?.message}`); }

      // Log 2 - error (vermelho) - ainda mais visivel, garante que aparece mesmo se warn filtrado
      try {
        await client.app.log({ body: { service: "aiox", level: "error", message: `Nova versao disponivel!! v${current} → v${latest} | [Cancelar] [Atualizar] — rode: aiox-global update`, extra: { current, latest } } });
        debug("[AioxUpdate] log error OK");
      } catch (e) { debug(`[AioxUpdate] log error fail ${e?.message}`); }

      // Toast 1 - warning
      try {
        await client.tui.showToast({ body: { message: `Nova versao disponivel!! v${current} → v${latest} | [Cancelar] [Atualizar]`, variant: "warning" } });
        debug("[AioxUpdate] toast warning OK");
      } catch (e) { debug(`[AioxUpdate] toast warning fail ${e?.message}`); }

      // Toast 2 - error fallback
      try {
        await client.tui.showToast({ body: { message: `Nova versao disponivel!! v${current} → v${latest}`, variant: "error" } });
        debug("[AioxUpdate] toast error OK");
      } catch (e) { debug(`[AioxUpdate] toast error fail ${e?.message}`); }

    } catch (e) {
      debug(`[AioxUpdate] outer error ${e?.message} ${e?.stack}`);
    }
  };

  doCheck("init");

  return {
    "server.connected": async () => { debug("[AioxUpdate] hook server.connected"); await doCheck("server.connected"); },
    event: async ({event}) => { if (event.type === "server.connected") { debug("[AioxUpdate] event server.connected"); await doCheck("event"); } },
  };
};

export const AioxUpdatePlugin = AioxUpdate;
export default AioxUpdate;
