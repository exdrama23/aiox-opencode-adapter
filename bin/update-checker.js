const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const pkg = require('../package.json');

const CACHE_TTL = 24 * 60 * 60 * 1000;
const DEFAULT_REGISTRY_URL = `https://registry.npmjs.org/${pkg.name}/latest`;
const FETCH_TIMEOUT_MS = 3000;

function getRegistryUrl() {
  // Overridable for mirrors and for tests that must stay offline.
  return process.env.AIOX_REGISTRY_URL || DEFAULT_REGISTRY_URL;
}

// Resolved lazily so a test can redirect the cache to a temp dir with
// AIOX_CACHE_DIR instead of writing into the user's real ~/.aiox.
function cacheDir() {
  if (process.env.AIOX_CACHE_DIR) return path.resolve(process.env.AIOX_CACHE_DIR);
  return path.join(os.homedir(), '.aiox', 'cache');
}

function cacheFile() {
  return path.join(cacheDir(), 'update.json');
}

function getCurrentVersion() {
  return pkg.version;
}

/**
 * Fetch the latest published version.
 * Resolves `null` on any failure (offline, 404, timeout, malformed body) so
 * callers never have to handle a rejection.
 */
function fetchLatestVersion(timeoutMs = FETCH_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let req;
    try {
      req = https.get(getRegistryUrl(), { timeout: timeoutMs }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          done(null);
          return;
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const pkg = JSON.parse(data);
            done(pkg && typeof pkg.version === 'string' ? pkg.version : null);
          } catch {
            done(null);
          }
        });
      });
    } catch {
      done(null);
      return;
    }

    req.on('error', () => done(null));
    req.on('timeout', () => {
      req.destroy();
      done(null);
    });
  });
}

function readCache() {
  try {
    const file = cacheFile();
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || typeof data.latestVersion !== 'string') return null;
    if (typeof data.checkedAt !== 'number') return null;
    // A cache written by a previous package name must not be reused after a
    // rename: the version it holds belongs to a different npm package.
    if (data.name && data.name !== pkg.name) return null;
    if (Date.now() - data.checkedAt >= CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(version) {
  // Never persist a failed lookup: a null/undefined entry would poison the
  // cache and suppress the update banner for 24h.
  if (!version || typeof version !== 'string') return;
  try {
    const dir = cacheDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(cacheFile(), JSON.stringify({
      name: pkg.name,
      checkedAt: Date.now(),
      latestVersion: version,
    }));
  } catch {
    // Cache is best-effort.
  }
}

function parseVersion(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isNewer(latest, current) {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  if (!l || !c) return false;
  for (let i = 0; i < 3; i++) {
    if (l[i] > c[i]) return true;
    if (l[i] < c[i]) return false;
  }
  return false;
}

const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
};

function showBanner(current, latest) {
  console.log('');
  console.log(`${c.dim}--${c.reset} ${c.bold}Nova versao disponivel${c.reset}`);
  console.log(`${c.dim}--${c.reset}`);
  console.log(`${c.dim}--${c.reset} Atual    ${c.gray}v${current}${c.reset}`);
  console.log(`${c.dim}--${c.reset} Ultima   ${c.green}v${latest}${c.reset}`);
  console.log(`${c.dim}--${c.reset}`);
  console.log(`${c.dim}--${c.reset} Atualize com uma das opcoes:`);
  console.log(`${c.dim}--${c.reset}`);
  console.log(`${c.dim}--${c.reset}   ${c.cyan}npm install -g ${pkg.name}@latest${c.reset}`);
  console.log(`${c.dim}--${c.reset}   ${c.green}ou${c.reset}`);
  console.log(`${c.dim}--${c.reset}   ${c.cyan}aiox-global update${c.reset}`);
  console.log('');
}

/**
 * Show the update banner when a newer version is published.
 * Never throws and never blocks the process for longer than FETCH_TIMEOUT_MS.
 */
async function checkForUpdate() {
  if (process.env.AIOX_DISABLE_UPDATE_CHECK === 'true') return;

  try {
    const current = getCurrentVersion();
    const cached = readCache();
    const latest = cached ? cached.latestVersion : await fetchLatestVersion();

    if (!cached) writeCache(latest);
    if (latest && isNewer(latest, current)) showBanner(current, latest);
  } catch {
    // Update notification must never break the CLI.
  }
}

module.exports = {
  checkForUpdate,
  showBanner,
  fetchLatestVersion,
  getCurrentVersion,
  getRegistryUrl,
  parseVersion,
  isNewer,
  readCache,
  writeCache,
};
