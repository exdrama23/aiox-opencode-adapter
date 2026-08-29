/**
 * AIOX Update Notifier - Plugin para OpenCode
 * Mostra notificacao abaixo de "LSPs are disabled" quando ha nova versao
 * Posicionamento: usa server.connected (dispara logo apos LSP init) + toast
 */

import fs from "fs";
import path from "path";
import os from "os";
import https from "https";

const CACHE_DIR = path.join(os.homedir(), ".aiox", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "update.json");
const DISMISSED_FILE = path.join(CACHE_DIR, "dismissed.json");
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

function getCurrentVersion() {
  try {
    // Tenta pegar do package.json global (quando instalado via npm)
    // Fallback para 1.4.0 se nao encontrar
    const pkgPath = path.join(os.homedir(), ".config", "opencode", "plugins", "aiox-update", "package.json");
    if (fs.existsSync(pkgPath)) {
      const p = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (p.version) return p.version;
    }
  } catch {}
  // tenta do plugin proprio
  try {
    const localPkg = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "package.json");
    if (fs.existsSync(localPkg)) {
      const p = JSON.parse(fs.readFileSync(localPkg, "utf8"));
      if (p.version && p.version !== "0.1.0-test") return p.version;
    }
  } catch {}
  return "1.4.0";
}

function isNewer(latest, current) {
  const parse = (v) => v.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
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
    if (Date.now() - (data.checkedAt || 0) < CACHE_TTL) return data;
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

function fetchLatest() {
  return new Promise((resolve, reject) => {
    const req = https.get(
      "https://registry.npmjs.org/aiox-opencode-adapter/latest",
      { timeout: 3000 },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const pkg = JSON.parse(data);
            resolve(pkg.version);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

export const AioxUpdate = async ({ client, directory }) => {
  // Nao bloqueia startup — checagem em background
  const doCheck = async () => {
    try {
      const current = getCurrentVersion();
      let latest;
      const cached = readCache();
      if (cached && cached.latestVersion) {
        latest = cached.latestVersion;
      } else {
        try {
          latest = await fetchLatest();
          if (latest) writeCache(latest);
        } catch {
          return; // sem rede, silencioso
        }
      }
      if (!latest || !isNewer(latest, current)) return;

      // Verifica se usuario ja cancelou essa versao
      const dismissed = readDismissed();
      if (dismissed && dismissed.version === latest) return;

      // Delay para cair logo apos "LSPs are disabled" (LSP init leva ~1s)
      await new Promise((r) => setTimeout(r, 1200));

      // 1) Log estruturado — aparece no painel de logs, logo abaixo do bloco LSP
      try {
        await client.app.log({
          body: {
            service: "aiox",
            level: "warn",
            message: `Nova versao disponivel!! v${current} → v${latest}`,
            extra: {
              current,
              latest,
              title: "Nova versao disponivel!!",
              actions: ["Cancelar", "Atualizar"],
              hint: "Execute: aiox-global update  ou  npm install -g aiox-opencode-adapter@latest",
            },
          },
        });
      } catch {}

      // 2) Toast visivel no TUI — titulo + instrucoes (simula botoes)
      try {
        await client.tui.showToast({
          body: {
            message: `Nova versao disponivel!! v${current} → v${latest}  |  [Cancelar] [Atualizar] — rode: aiox-global update`,
            variant: "info",
          },
        });
      } catch {}

      // 3) Log secundario com comandos copiaveis (fallback caso toast nao apareca)
      try {
        await client.app.log({
          body: {
            service: "aiox",
            level: "info",
            message: `[AIOX] Atualize com: aiox-global update  |  Cancelar: toque em Dismiss ou ignore`,
            extra: { current, latest },
          },
        });
      } catch {}
    } catch {}
  };

  // Dispara em background sem await
  doCheck();

  return {
    // Hook pos-LSP — reforca toast caso doCheck tenha sido muito cedo
    "server.connected": async () => {
      // Nao re-checa rede aqui, apenas re-exibe se ja sabemos que ha update
      try {
        const cached = readCache();
        if (!cached || !cached.latestVersion) return;
        const current = getCurrentVersion();
        if (!isNewer(cached.latestVersion, current)) return;
        const dismissed = readDismissed();
        if (dismissed && dismissed.version === cached.latestVersion) return;
        await new Promise((r) => setTimeout(r, 800));
        try {
          await client.tui.showToast({
            body: {
              message: `Nova versao disponivel!! v${current} → v${cached.latestVersion}  |  [Cancelar] [Atualizar]`,
              variant: "info",
            },
          });
        } catch {}
      } catch {}
    },
  };
};

export const AioxUpdatePlugin = AioxUpdate;
export default AioxUpdate;
