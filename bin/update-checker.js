const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const CACHE_DIR = path.join(os.homedir(), '.aiox', 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'update.json');
const CACHE_TTL = 24 * 60 * 60 * 1000;

function getCurrentVersion() {
  const pkg = require('../package.json');
  return pkg.version;
}

function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    const req = https.get(
      'https://registry.npmjs.org/aiox-opencode-adapter/latest',
      { timeout: 2000 },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const pkg = JSON.parse(data);
            resolve(pkg.version);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function readCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    if (!fs.existsSync(CACHE_FILE)) {
      return null;
    }
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (Date.now() - data.checkedAt < CACHE_TTL) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCache(version) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      checkedAt: Date.now(),
      latestVersion: version
    }));
  } catch {

  }
}

function isNewer(latest, current) {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
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
  console.log(`${c.dim}│${c.reset} ${c.bold}Nova versão disponível${c.reset}`);
  console.log(`${c.dim}│${c.reset}`);
  console.log(`${c.dim}│${c.reset} Atual    ${c.gray}v${current}${c.reset}`);
  console.log(`${c.dim}│${c.reset} Última   ${c.green}v${latest}${c.reset}`);
  console.log(`${c.dim}│${c.reset}`);
  console.log(`${c.dim}│${c.reset} Atualize com uma das opções:`);
  console.log(`${c.dim}│${c.reset}`);
  console.log(`${c.dim}│${c.reset}   ${c.dim}•${c.reset} ${c.cyan}npm install -g aiox-opencode-adapter@latest${c.reset}`);
  console.log(`${c.dim}│${c.reset}   ${c.dim}${c.reset} ${c.green}ou${c.reset}`);
  console.log(`${c.dim}│${c.reset}   ${c.dim}•${c.reset} ${c.cyan}aiox-global update${c.reset}`);
  console.log('');
}

async function checkForUpdate() {
  if (process.env.AIOX_DISABLE_UPDATE_CHECK === 'true') return;

  try {
    const current = getCurrentVersion();

    const cached = readCache();
    let latest;

    if (cached) {
      latest = cached.latestVersion;
    } else {
      latest = await fetchLatestVersion();
      writeCache(latest);
    }

    if (isNewer(latest, current)) {
      showBanner(current, latest);
    }
  } catch {

  }
}

module.exports = { checkForUpdate, showBanner };
