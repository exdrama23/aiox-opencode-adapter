/**
 * What the OpenCode runtime actually loaded.
 *
 * The distinction matters: `cybersec.md` existed on disk for weeks while
 * OpenCode silently skipped it (`agent file skipped reason=markdown`) because of
 * a duplicated YAML key. Checking files on disk cannot catch that; only asking
 * the runtime and reading its log can.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ERROR_PATTERNS = [
  { label: 'agent file skipped', regex: /agent file skipped/i },
  { label: 'failed to load plugin', regex: /failed to load plugin|plugin (?:load )?error/i },
  { label: 'schema error', regex: /SchemaError|InvalidConfig|failed to parse config/i },
  { label: 'invalid agent', regex: /invalid agent|agent.*invalid permission/i },
];

/**
 * OpenCode log lines look like:
 *   timestamp=2026-11-25T12:59:40.658Z level=WARN run=... message="failed to load plugin"
 * The timestamp is what lets `doctor --deep` ignore errors left over from a
 * fixed installation instead of failing forever on old history.
 */
function parseLineTimestamp(line) {
  const match = line.match(/timestamp=([0-9T:.\-Z]+)/);
  if (!match) return null;
  const parsed = Date.parse(match[1]);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolveDataDir(env = process.env) {
  if (env.OPENCODE_DATA_DIR) return env.OPENCODE_DATA_DIR;
  if (env.XDG_DATA_HOME) return path.join(env.XDG_DATA_HOME, 'opencode');
  const home = env.USERPROFILE || env.HOME;
  return path.join(home, '.local', 'share', 'opencode');
}

function resolveLogDir(env = process.env) {
  if (env.OPENCODE_LOG_DIR) return env.OPENCODE_LOG_DIR;
  return path.join(resolveDataDir(env), 'log');
}

function latestLogFile(logDir) {
  if (!fs.existsSync(logDir)) return null;
  const files = fs
    .readdirSync(logDir)
    .filter((f) => f.endsWith('.log'))
    .map((f) => {
      const full = path.join(logDir, f);
      try {
        const stat = fs.statSync(full);
        return { file: full, mtime: stat.mtimeMs, size: stat.size };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime);

  return files.length ? files[0] : null;
}

/**
 * Read only the tail of a file. The live log grows to tens of megabytes, so
 * `readFileSync` on it would be needlessly expensive.
 */
function readTail(file, maxBytes = 256 * 1024) {
  const stat = fs.statSync(file);
  const start = Math.max(0, stat.size - maxBytes);
  const length = stat.size - start;
  const buffer = Buffer.alloc(length);
  const fd = fs.openSync(file, 'r');
  try {
    fs.readSync(fd, buffer, 0, length, start);
  } finally {
    fs.closeSync(fd);
  }
  return { text: buffer.toString('utf8'), truncated: start > 0 };
}

function scanLogText(text, { since = null } = {}) {
  const hits = [];
  let ignored = 0;
  let latest = null;

  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    ERROR_PATTERNS.forEach((pattern) => {
      if (!pattern.regex.test(line)) return;

      const timestamp = parseLineTimestamp(line);
      const entry = {
        line: index + 1,
        kind: pattern.label,
        timestamp: timestamp === null ? null : new Date(timestamp).toISOString(),
        text: line.trim().slice(0, 300),
      };

      if (timestamp !== null && (latest === null || timestamp > latest)) latest = timestamp;

      // A hit older than the current install is history, not a live failure.
      if (since !== null && timestamp !== null && timestamp < since) {
        ignored++;
        return;
      }
      hits.push(entry);
    });
  });

  return {
    hits,
    ignored,
    latest: latest === null ? null : new Date(latest).toISOString(),
  };
}

function tailLog({ logDir = resolveLogDir(), lines = 40 } = {}) {
  const latest = latestLogFile(logDir);
  if (!latest) return { ok: false, reason: 'no log file found', logDir, file: null, lines: [] };

  const { text, truncated } = readTail(latest.file);
  const all = text.split(/\r?\n/).filter((line) => line.length > 0);
  return {
    ok: true,
    logDir,
    file: latest.file,
    size: latest.size,
    mtime: latest.mtime,
    truncated,
    lines: all.slice(-lines),
  };
}

function scanLog({ logDir = resolveLogDir(), since = null } = {}) {
  const latest = latestLogFile(logDir);
  if (!latest) return { ok: false, reason: 'no log file found', logDir, file: null, hits: [], ignored: 0 };

  const { text, truncated } = readTail(latest.file);
  const scan = scanLogText(text, { since });
  return {
    ok: true,
    logDir,
    file: latest.file,
    size: latest.size,
    truncated,
    ...scan,
  };
}

/**
 * Ask the runtime which agents it loaded.
 * `--standalone` avoids attaching to an already running managed server.
 */
function loadedAgents({ bin = process.env.AIOX_OPENCODE_BIN || 'opencode', timeout = 60000 } = {}) {
  const attempts = [['debug', 'agents', '--standalone'], ['debug', 'agents']];
  // On Windows `opencode` is a .cmd shim, which spawnSync cannot execute
  // without a shell.
  const useShell = process.platform === 'win32';
  let lastError = null;

  for (const args of attempts) {
    let result;
    try {
      result = useShell
        ? spawnSync(`"${bin}" ${args.join(' ')}`, {
            encoding: 'utf8',
            timeout,
            windowsHide: true,
            shell: true,
            maxBuffer: 32 * 1024 * 1024,
          })
        : spawnSync(bin, args, {
            encoding: 'utf8',
            timeout,
            windowsHide: true,
            maxBuffer: 32 * 1024 * 1024,
          });
    } catch (error) {
      lastError = error.message;
      continue;
    }

    if (result.error) {
      lastError = result.error.message;
      continue;
    }
    if (result.status !== 0) {
      lastError = (result.stderr || '').trim().split(/\r?\n/).slice(-3).join(' ') || `exit ${result.status}`;
      continue;
    }

    const raw = (result.stdout || '').replace(/^\uFEFF/, '').trim();
    const start = raw.indexOf('[');
    if (start === -1) {
      lastError = 'unexpected output (no JSON array)';
      continue;
    }

    try {
      const parsed = JSON.parse(raw.slice(start));
      if (!Array.isArray(parsed)) {
        lastError = 'unexpected output (not an array)';
        continue;
      }
      return {
        ok: true,
        bin,
        args,
        agents: parsed.map((agent) => ({
          name: agent.id || agent.name,
          mode: agent.mode || null,
          permissions: Array.isArray(agent.permissions) ? agent.permissions.length : null,
          description: agent.description || null,
        })),
      };
    } catch (error) {
      lastError = `could not parse JSON: ${error.message}`;
    }
  }

  return { ok: false, bin, error: lastError, agents: [] };
}

function runtimeVersion({ bin = process.env.AIOX_OPENCODE_BIN || 'opencode', timeout = 20000 } = {}) {
  try {
    const result = process.platform === 'win32'
      ? spawnSync(`"${bin}" --version`, { encoding: 'utf8', timeout, windowsHide: true, shell: true })
      : spawnSync(bin, ['--version'], { encoding: 'utf8', timeout, windowsHide: true });
    if (result.error || result.status !== 0) return null;
    const match = (result.stdout || '').match(/v?\d+\.\d+\.\d+/);
    return match ? match[0].replace(/^v/, '') : null;
  } catch {
    return null;
  }
}

/**
 * Inspect a Docker container used by an MCP server.
 *
 * `docker ps -a` only proves the container exists. The pentest MCP config is
 * `docker exec -i pentest-mcp ...`, which fails while the container is
 * stopped - so "found" must not be reported as healthy.
 */
function dockerContainerState({ name = 'pentest-mcp', run = defaultDockerRun } = {}) {
  const output = run(name);
  if (output === null || output === undefined) {
    return { dockerAvailable: false, found: false, state: 'unknown', status: null };
  }

  const line = String(output)
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}|`));

  if (!line) return { dockerAvailable: true, found: false, state: 'missing', status: null };

  const [, state = 'unknown', status = null] = line.split('|');
  return { dockerAvailable: true, found: true, state, status };
}

function defaultDockerRun(name) {
  try {
    const { execSync } = require('child_process');
    const fmt = '{{.Names}}|{{.State}}|{{.Status}}';
    return execSync(`docker ps -a --filter name=${name} --format "${fmt}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 20000,
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Synchronous TCP probe. Node cannot do sync sockets, so this runs a tiny
 * child process: `true` = accepting connections, `false` = refused/timeout,
 * `null` = probe could not run.
 */
function tcpProbe({ host = '127.0.0.1', port, timeout = 1000 } = {}) {
  if (!port) return null;
  const script =
    `const s=require('net').connect(${Number(port)},${JSON.stringify(host)});` +
    'const done=(c)=>{try{s.destroy()}catch{};process.exit(c)};' +
    `s.setTimeout(${Number(timeout)},()=>done(2));` +
    "s.on('connect',()=>done(0));" +
    "s.on('error',()=>done(1));";

  const result = spawnSync(process.execPath, ['-e', script], {
    timeout: Number(timeout) + 3000,
    windowsHide: true,
  });

  if (result.error) return null;
  return result.status === 0;
}

/** Extract host/port from an MCP command array (e.g. `--server http://localhost:8888`). */
function mcpServerTarget(command = []) {
  for (const arg of command) {
    const match = String(arg).match(/^https?:\/\/([^/:\s]+):(\d+)/);
    if (match) return { host: match[1], port: Number(match[2]) };
  }
  return null;
}

module.exports = {
  ERROR_PATTERNS,
  resolveDataDir,
  resolveLogDir,
  latestLogFile,
  readTail,
  scanLogText,
  scanLog,
  tailLog,
  loadedAgents,
  runtimeVersion,
  dockerContainerState,
  tcpProbe,
  mcpServerTarget,
};
