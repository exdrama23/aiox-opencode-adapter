#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const {
  convertV1ToV2,
  convertV2ToV1,
  resolveOpencodeDir,
  parsePermissionObject,
  parsePermissionsArray,
  dedupPermissionsArray,
  safeClone,
  stripV2Keys,
  stripV1Keys,
  normalizeMcp,
  dropRedundantAgentPermissions,
  detectCompatMode,
} = require('../lib/opencodeCompat');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const OPENCODE_DIR = resolveOpencodeDir();
const OPENCODE_AGENTS_DIR = path.join(OPENCODE_DIR, 'agents');
const OPENCODE_CONFIG = path.join(OPENCODE_DIR, 'opencode.json');
const OPENCODE_SKILLS_DIR = path.join(OPENCODE_DIR, 'skills');
const OPENCODE_PLUGINS_DIR = path.join(OPENCODE_DIR, 'plugins');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');
const PLUGIN_SRC_DIR = path.join(__dirname, '..', 'plugins', 'aiox-update');

const STATE_DIR = path.join(os.homedir(), '.aiox');
const BACKUP_ROOT = path.join(STATE_DIR, 'backups');
const MANIFEST_FILE = path.join(STATE_DIR, 'installed-manifest.json');

const {
  compareAgents,
  listExtraAgents,
  describeConfig,
  pluginInstalled,
  createBackup,
  listBackups,
  restoreBackup,
  hashFile,
} = require('../lib/installedState');

const {
  loadedAgents,
  runtimeVersion,
  scanLog,
  tailLog,
  resolveLogDir,
  dockerContainerState,
  tcpProbe,
  mcpServerTarget,
} = require('../lib/opencodeRuntime');

const {
  checkForUpdate,
  fetchLatestVersion,
  getCurrentVersion,
  isNewer,
} = require('./update-checker');
checkForUpdate();

const AGENTS = [
  'aiox-master.md',
  'dev.md',
  'architect.md',
  'sm.md',
  'pm.md',
  'po.md',
  'qa.md',
  'analyst.md',
  'devops.md',
  'data-engineer.md',
  'ux-design-expert.md',
  'squad-creator.md',
  'cybersec.md',
];

function log(msg) { console.log(`[AIOX] ${msg}`); }
function warn(msg) { console.log(`[AIOX WARN] ${msg}`); }
function ok(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); }
function info(msg) { console.log(`  → ${msg}`); }

function exec(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
  } catch {
    return null;
  }
}

function getPackageVersion() {
  try {
    return JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Set an MCP server regardless of whether the config currently uses the
 * V1 flat shape or the native V2 `mcp.servers` shape.
 */
function setMcpServer(config, name, serverConfig) {
  if (!config.mcp || typeof config.mcp !== 'object') config.mcp = {};
  const isV2 = config.mcp.servers && typeof config.mcp.servers === 'object';
  if (isV2) {
    config.mcp.servers[name] = serverConfig;
  } else {
    config.mcp[name] = serverConfig;
  }
}

function installUpdatePlugin() {
  if (!fs.existsSync(PLUGIN_SRC_DIR)) return;

  if (!fs.existsSync(OPENCODE_PLUGINS_DIR)) {
    fs.mkdirSync(OPENCODE_PLUGINS_DIR, { recursive: true });
  }

  const pluginDir = path.join(OPENCODE_PLUGINS_DIR, 'aiox-update');
  fs.mkdirSync(pluginDir, { recursive: true });

  for (const file of ['index.js', 'tui.js', 'package.json']) {
    const src = path.join(PLUGIN_SRC_DIR, file);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(pluginDir, file));
  }

  // The installed plugin has no sibling package.json, so persist the version.
  fs.writeFileSync(
    path.join(pluginDir, 'version.json'),
    JSON.stringify({ version: getPackageVersion() }, null, 2)
  );

  // Remove the legacy single-file V1 plugin if it is still around.
  const legacy = path.join(OPENCODE_PLUGINS_DIR, 'aiox-update.js');
  if (fs.existsSync(legacy)) fs.unlinkSync(legacy);

  ok(`aiox-update plugin -> ${pluginDir}`);
}

function removeUpdatePlugin() {
  const pluginDir = path.join(OPENCODE_PLUGINS_DIR, 'aiox-update');
  const legacy = path.join(OPENCODE_PLUGINS_DIR, 'aiox-update.js');
  let removed = false;

  if (fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true, force: true });
    ok('Removed plugin: aiox-update/');
    removed = true;
  }
  if (fs.existsSync(legacy)) {
    fs.unlinkSync(legacy);
    ok('Removed plugin: aiox-update.js');
    removed = true;
  }
  return removed;
}

function readManifest() {
  try {
    const data = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
    return data && data.agents && typeof data.agents === 'object' ? data.agents : null;
  } catch {
    return null;
  }
}

/**
 * Record the hash of what `init` wrote, so `status` can tell "the package
 * changed" apart from "you edited the file".
 */
function writeManifest() {
  try {
    const agents = {};
    AGENTS.forEach((file) => {
      const hash = hashFile(path.join(OPENCODE_AGENTS_DIR, file));
      if (hash) agents[file] = hash;
    });
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(
      MANIFEST_FILE,
      JSON.stringify({ version: getPackageVersion(), writtenAt: new Date().toISOString(), agents }, null, 2)
    );
  } catch {
    // A missing manifest only downgrades `status` detail; never fatal.
  }
}

function cmdInit(options = {}) {
  const { dryRun = false } = options;
  const comparison = compareAgents(AGENTS_DIR, OPENCODE_AGENTS_DIR, AGENTS, readManifest());
  const changes = comparison.filter((agent) => agent.state !== 'equal');

  if (dryRun) {
    log('Dry run: nothing will be written.\n');
    log(`Target: ${OPENCODE_AGENTS_DIR}`);
    log(`Plan: ${changes.length} of ${AGENTS.length} agents would change\n`);
    if (changes.length === 0) {
      ok(`All ${AGENTS.length} agents already match the package`);
    } else {
      changes.forEach((agent) => console.log(`  ~ ${agent.name.padEnd(20)} ${agent.state}`));
    }
    log('\nWould also refresh the aiox-update plugin and the install manifest.');
    return;
  }

  log('Installing AIOX agents globally for OpenCode...\n');

  if (!fs.existsSync(OPENCODE_AGENTS_DIR)) {
    fs.mkdirSync(OPENCODE_AGENTS_DIR, { recursive: true });
    log(`Created: ${OPENCODE_AGENTS_DIR}`);
  }

  const existing = fs.readdirSync(OPENCODE_AGENTS_DIR).filter((f) => f.endsWith('.md'));
  if (options.backup !== false && existing.length > 0) {
    try {
      const backup = createBackup(OPENCODE_AGENTS_DIR, BACKUP_ROOT);
      info(`Backup: ${backup.agents} agents -> ${backup.dir}`);
    } catch (error) {
      warn(`Could not create backup: ${error.message}`);
    }
  }

  let copied = 0;
  AGENTS.forEach(file => {
    const src = path.join(AGENTS_DIR, file);
    const dest = path.join(OPENCODE_AGENTS_DIR, file);

    if (!fs.existsSync(src)) {
      fail(`${file}: source not found`);
      return;
    }

    fs.copyFileSync(src, dest);
    ok(`${file} -> ${dest}`);
    copied++;
  });

  writeManifest();

  log(`\nInstalled ${copied}/${AGENTS.length} agents.`);

  // Install AIOX update plugin (V2 server + TUI parts; V1 fallback entrypoint)
  try {
    installUpdatePlugin();
  } catch (e) {
    warn(`Could not install plugin: ${e.message}`);
  }

  if (fs.existsSync(OPENCODE_CONFIG)) {
    try {
      const config = JSON.parse(fs.readFileSync(OPENCODE_CONFIG, 'utf8'));
      if (!config.default_agent) {
        log('\nNote: Your opencode.json has no default_agent set.');
        log('Run "aiox-global config" to generate a config with AIOX defaults.');
      }
    } catch {
      warn('Could not parse opencode.json. Run "aiox-global config" to regenerate.');
    }
  } else {
    log('\nNo opencode.json found. Run "aiox-global config" to generate one.');
  }

  log('\nDone! AIOX agents are now available globally in OpenCode.');
  log('Usage:');
  log('  aiox-global config     # Generate OpenCode config');
  log('  opencode               # Start OpenCode');
  log('  @dev                   # Invoke Dex (Developer)');
  log('  @architect             # Invoke Aria (Architect)');
  log('  @aiox-master           # Invoke Orion (Orchestrator)');
  log('  @cybersec              # Invoke Kira (Cybersecurity)');
  log('  Tab                    # Switch between primary agents');
}

function parseAgentFrontmatterV2(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result = {};

  const descMatch = yaml.match(/description:\s*"(.+?)"/);
  if (descMatch) result.description = descMatch[1];

  const modeMatch = yaml.match(/mode:\s*(\w+)/);
  if (modeMatch) result.mode = modeMatch[1];

  const colorMatch = yaml.match(/color:\s*"(.+?)"/);
  if (colorMatch) result.color = colorMatch[1];

  // Handle prompt / system aliases (V1: prompt, V2: system)
  const promptMatch = yaml.match(/^\s*prompt:\s*"?(.*?)"?\s*$/m);
  const systemMatch = yaml.match(/^\s*system:\s*"?(.*?)"?\s*$/m);
  // Need more robust multiline? but handle simple
  // Use alternative that captures without quotes and with \r?
  const promptAlt = yaml.match(/prompt:\s*"(.+?)"/);
  const systemAlt = yaml.match(/system:\s*"(.+?)"/);
  let promptVal = null;
  let systemVal = null;
  if (promptMatch) promptVal = promptMatch[1].replace(/^"|"$/g, '').trim();
  if (promptAlt && !promptVal) promptVal = promptAlt[1];
  if (systemMatch) systemVal = systemMatch[1].replace(/^"|"$/g, '').trim();
  if (systemAlt && !systemVal) systemVal = systemAlt[1];
  if (promptVal || systemVal) {
    // Cross-normalization: if only one exists, mirror to other
    const finalPrompt = promptVal || systemVal;
    const finalSystem = systemVal || promptVal;
    result.prompt = finalPrompt;
    result.system = finalSystem;
  }

  // Handle disable / disabled aliases (V1: disable, V2: disabled)
  const disableMatch = yaml.match(/^\s*disable:\s*(\w+)/m);
  const disabledMatch = yaml.match(/^\s*disabled:\s*(\w+)/m);
  let disableVal = null;
  let disabledVal = null;
  if (disableMatch) disableVal = disableMatch[1].trim();
  if (disabledMatch) disabledVal = disabledMatch[1].trim();
  if (disableVal !== null || disabledVal !== null) {
    // Normalize to boolean string? Keep as boolean if true/false
    const normalize = (v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return v;
    };
    const finalDisable = disableVal !== null ? normalize(disableVal) : normalize(disabledVal);
    const finalDisabled = disabledVal !== null ? normalize(disabledVal) : normalize(disableVal);
    // V2 wins if both exist: final values already captured separately, but if both exist keep each own value
    if (disableVal !== null && disabledVal !== null) {
      result.disable = normalize(disableVal);
      result.disabled = normalize(disabledVal);
    } else {
      result.disable = finalDisable;
      result.disabled = finalDisabled;
    }
  }

  // Parse permissions: V1 (permission:) and V2 (permissions:)
  let permV1 = parsePermissionObject(yaml);
  let permsV2 = parsePermissionsArray(yaml);

  // Handle alias inside V1 object already normalized in parsePermissionObject (shell->bash, subagent->task)
  // But also need to handle case where yaml uses V2 naming inside permission block (defensive)
  
  // Cross-normalization: if only V1 exists, generate V2; if only V2, generate V1; if both, V2 wins but validate
  if (permV1 && !permsV2) {
    permsV2 = convertV1ToV2(permV1);
  } else if (!permV1 && permsV2) {
    permV1 = convertV2ToV1(permsV2);
  } else if (permV1 && permsV2) {
    // Both exist: V2 wins, but we keep V1 as is for compat; optionally validate consistency
    // If they diverge significantly, we could warn, but not error. For now just ensure dedup
    permsV2 = dedupPermissionsArray(permsV2);
    // Validate consistency: compute expected V2 from V1 and compare size?
    // Not throwing, just keeping V2 as source of truth
    const expectedV2 = convertV1ToV2(permV1);
    if (expectedV2.length !== permsV2.length) {
      // divergence - keep V2 but could log? avoid noise in parser
    }
    // Also ensure permV1 has aliases normalized
    // If permsV2 and permV1 diverge, V2 is truth, permV1 stays as parsed
  }

  if (permV1) result.permission = permV1;
  if (permsV2) result.permissions = permsV2;

  // Also handle case where permission object had shell/subagent keys directly parsed as V2 naming inside yaml but already handled
  // Ensure result has both for downstream dual-write

  return result;
}

// Backward-compatible wrapper
function parseAgentFrontmatter(content) {
  return parseAgentFrontmatterV2(content);
}

function ensureDualPermissions(config) {
  ensureCompatPermissions(config, 'dual');
}

function ensureCompatPermissions(config, mode = 'dual') {
  // mode: 'dual' = keep both, 'v1' = strip V2, 'v2' = strip V1
  if (mode === 'dual') {
    // Ensure top-level agent/agents mirrored
    if (config.agent && !config.agents) {
      config.agents = safeClone(config.agent);
    } else if (!config.agent && config.agents) {
      config.agent = safeClone(config.agents);
    } else if (config.agent && config.agents) {
      const merged = {};
      const allKeys = new Set([...Object.keys(config.agent), ...Object.keys(config.agents)]);
      for (const k of allKeys) {
        merged[k] = safeClone(config.agents[k] || config.agent[k]);
      }
      config.agent = safeClone(merged);
      config.agents = safeClone(merged);
    }

    const hasPerm = !!config.permission;
    const hasPerms = !!config.permissions;
    if (hasPerm && !hasPerms) {
      config.permissions = convertV1ToV2(config.permission);
    } else if (!hasPerm && hasPerms) {
      config.permission = convertV2ToV1(config.permissions);
    } else if (hasPerm && hasPerms) {
      config.permissions = dedupPermissionsArray(config.permissions);
    }

    const allAgentNames = new Set();
    if (config.agent) Object.keys(config.agent).forEach(k => allAgentNames.add(k));
    if (config.agents) Object.keys(config.agents).forEach(k => allAgentNames.add(k));

    for (const name of allAgentNames) {
      let agentV1Obj = config.agent ? config.agent[name] : null;
      let agentV2Obj = config.agents ? config.agents[name] : null;
      let source = agentV2Obj || agentV1Obj;
      if (!source) continue;
      let perm = source.permission;
      let perms = source.permissions;

      if (perm) {
        if (perm.shell && !perm.bash) {
          perm.bash = perm.shell;
          delete perm.shell;
        }
        if (perm.subagent && !perm.task) {
          perm.task = perm.subagent;
          delete perm.subagent;
        }
      }

      if (perm && !perms) {
        perms = convertV1ToV2(perm);
      } else if (!perm && perms) {
        perm = convertV2ToV1(perms);
      } else if (perm && perms) {
        perms = dedupPermissionsArray(perms);
      } else {
        continue;
      }

      const updated = { ...source, permission: perm, permissions: perms };

      if (config.agent) config.agent[name] = safeClone(updated);
      if (config.agents) config.agents[name] = safeClone(updated);
    }

    if (config.agent && !config.agents) {
      config.agents = safeClone(config.agent);
    } else if (!config.agent && config.agents) {
      config.agent = safeClone(config.agents);
    }
  } else if (mode === 'v1') {
    // First ensure we have V1 data: if only V2 exists, convert
    if (config.agents && !config.agent) {
      config.agent = safeClone(config.agents);
      // Convert each agent's permissions -> permission if needed
      for (const name of Object.keys(config.agent)) {
        const e = config.agent[name];
        if (e && e.permissions && !e.permission) e.permission = convertV2ToV1(e.permissions);
      }
    }
    if (config.permissions && !config.permission) {
      config.permission = convertV2ToV1(config.permissions);
    }
    if (config.agents) {
      // Merge missing agents from agents into agent
      if (!config.agent) config.agent = {};
      for (const [k, v] of Object.entries(config.agents)) {
        if (!config.agent[k]) config.agent[k] = safeClone(v);
      }
    }
    // Ensure each agent has V1 permission
    if (config.agent) {
      for (const name of Object.keys(config.agent)) {
        const e = config.agent[name];
        if (e.permissions && !e.permission) e.permission = convertV2ToV1(e.permissions);
      }
    }
    stripV2Keys(config);
  } else if (mode === 'v2') {
    if (config.agent && !config.agents) {
      config.agents = safeClone(config.agent);
      for (const name of Object.keys(config.agents)) {
        const e = config.agents[name];
        if (e && e.permission && !e.permissions) e.permissions = convertV1ToV2(e.permission);
      }
    }
    if (config.permission && !config.permissions) {
      config.permissions = convertV1ToV2(config.permission);
    }
    if (config.agent) {
      if (!config.agents) config.agents = {};
      for (const [k, v] of Object.entries(config.agent)) {
        if (!config.agents[k]) config.agents[k] = safeClone(v);
      }
    }
    if (config.agents) {
      for (const name of Object.keys(config.agents)) {
        const e = config.agents[name];
        if (e.permission && !e.permissions) e.permissions = convertV1ToV2(e.permission);
      }
    }
    stripV1Keys(config);
  }
}

function cmdConfig() {
  log('Generating OpenCode config...\n');

  const compatMode = detectCompatMode(process.argv.slice(2));

  const templatePath = path.join(TEMPLATE_DIR, 'opencode.json');
  if (!fs.existsSync(templatePath)) {
    fail('Template not found: ' + templatePath);
    return;
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  } catch (e) {
    fail('Failed to parse template: ' + e.message);
    return;
  }

  try {
    ensureCompatPermissions(config, compatMode);
  } catch (e) {
    fail('Failed to normalize template permissions: ' + e.message);
    return;
  }

  if (fs.existsSync(OPENCODE_AGENTS_DIR)) {
    let installedAgents = [];
    try {
      installedAgents = fs.readdirSync(OPENCODE_AGENTS_DIR).filter(f => f.endsWith('.md'));
    } catch (e) {
      warn('Could not read agents directory: ' + e.message);
      installedAgents = [];
    }
    const templateAgents = Object.keys((compatMode === 'v2' ? config.agents : config.agent) || {});
    let added = 0;

    for (const file of installedAgents) {
      const agentName = file.replace('.md', '');
      const targetCollection = compatMode === 'v2' ? config.agents : config.agent;
      if (targetCollection && targetCollection[agentName]) continue;

      let content;
      try {
        content = fs.readFileSync(path.join(OPENCODE_AGENTS_DIR, file), 'utf8');
      } catch (e) {
        warn(`Could not read ${file}: ${e.message}`);
        continue;
      }
      let parsed;
      try {
        parsed = parseAgentFrontmatterV2(content);
      } catch (e) {
        warn(`Could not parse ${file}: ${e.message}`);
        continue;
      }
      if (parsed && parsed.description) {
        if (compatMode === 'dual') {
          if (!config.agent) config.agent = {};
          if (!config.agents) config.agents = {};
        } else if (compatMode === 'v2') {
          if (!config.agents) config.agents = {};
        } else {
          if (!config.agent) config.agent = {};
        }
        const agentEntry = {
          description: parsed.description,
          mode: parsed.mode || 'subagent',
          color: parsed.color || '#607D8B',
        };
        if (compatMode === 'dual') {
          if (parsed.permission) agentEntry.permission = parsed.permission;
          if (parsed.permissions) agentEntry.permissions = parsed.permissions;
          if (agentEntry.permission && !agentEntry.permissions) {
            agentEntry.permissions = convertV1ToV2(agentEntry.permission);
          } else if (!agentEntry.permission && agentEntry.permissions) {
            agentEntry.permission = convertV2ToV1(agentEntry.permissions);
          }
          config.agent[agentName] = safeClone(agentEntry);
          config.agents[agentName] = safeClone(agentEntry);
        } else if (compatMode === 'v2') {
          const perm = parsed.permissions || (parsed.permission ? convertV1ToV2(parsed.permission) : null);
          if (perm) agentEntry.permissions = perm;
          else if (parsed.permission) agentEntry.permissions = convertV1ToV2(parsed.permission);
          config.agents[agentName] = safeClone(agentEntry);
        } else {
          const perm = parsed.permission || (parsed.permissions ? convertV2ToV1(parsed.permissions) : null);
          if (perm) agentEntry.permission = perm;
          config.agent[agentName] = safeClone(agentEntry);
        }
        added++;
        ok(`Added agent: @${agentName} (${parsed.mode || 'subagent'})`);
      }
    }

    if (added > 0) {
      log(`Registered ${added} additional agents from installed files.`);
    }
  }

  try {
    ensureCompatPermissions(config, compatMode);
  } catch (e) {
    fail('Failed to finalize permissions: ' + e.message);
    return;
  }
  // Strip opposite version keys for strict V1/V2 schemas (V1 default)
  // ensureCompatPermissions already stripped based on mode, but double-ensure
  if (compatMode === 'v1') stripV2Keys(config);
  else if (compatMode === 'v2') stripV1Keys(config);

  // Agent .md frontmatter is merged by OpenCode at load time; duplicating it
  // here only inflates the agent's permission list.
  try {
    dropRedundantAgentPermissions(config, OPENCODE_AGENTS_DIR);
  } catch (e) {
    warn(`Could not dedupe agent permissions: ${e.message}`);
  }

  const hexstrikePaths = [
    path.join(os.homedir(), 'hexstrike-ai', 'hexstrike_mcp.py'),
    'C:\\hexstrike-ai\\hexstrike_mcp.py',
    '/opt/hexstrike-ai/hexstrike_mcp.py',
  ];
  const hexstrikeEnv = path.join(os.homedir(), 'hexstrike-ai', 'hexstrike-env', 'Scripts', 'python.exe');
  const hexstrikeEnvUnix = path.join(os.homedir(), 'hexstrike-ai', 'hexstrike-env', 'bin', 'python3');

  let hexstrikeFound = false;
  for (const p of hexstrikePaths) {
    if (fs.existsSync(p)) {
      const isWin = os.platform() === 'win32';
      const python = isWin ? hexstrikeEnv : hexstrikeEnvUnix;
      if (fs.existsSync(python)) {
        setMcpServer(config, 'hexstrike', {
          type: 'local',
          command: [python, p, '--server', 'http://localhost:8888'],
          enabled: true,
          timeout: 300000
        });
        ok(`HexStrike MCP configured (${p})`);
        hexstrikeFound = true;
        break;
      }
    }
  }
  if (!hexstrikeFound) {
    warn('HexStrike not found. Run "aiox-global setup-hexstrike" to install.');
  }

  try {
    const dockerCheck = exec('docker ps -a --filter name=pentest-mcp --format "{{.Names}}"');
    if (dockerCheck && dockerCheck.includes('pentest-mcp')) {
      setMcpServer(config, 'pentest-mcp', {
        type: 'local',
        command: ['docker', 'exec', '-i', 'pentest-mcp', 'python3', '/app/server.py'],
        enabled: true,
        timeout: 300000
      });
      ok('Pentest MCP configured (Docker container found)');
    } else {
      warn('Pentest MCP not found. Run "aiox-global setup-pentest" to install.');
    }
  } catch {
    warn('Docker not available. Pentest MCP requires Docker.');
  }

  try {
    if (!fs.existsSync(OPENCODE_DIR)) {
      fs.mkdirSync(OPENCODE_DIR, { recursive: true });
    }

    // MCP entries are assigned above, after the first normalization pass.
    normalizeMcp(config, compatMode);

    if (fs.existsSync(OPENCODE_CONFIG)) {
      const backup = OPENCODE_CONFIG + '.bak';
      fs.copyFileSync(OPENCODE_CONFIG, backup);
      info(`Backed up existing config to ${backup}`);
    }

    fs.writeFileSync(OPENCODE_CONFIG, JSON.stringify(config, null, 2));
    ok(`Config written to ${OPENCODE_CONFIG}`);
  } catch (e) {
    fail('Failed to write config: ' + e.message);
    return;
  }

  log('\nConfig generated! MCPs will auto-connect on next OpenCode restart.');
}

function cmdSetupHexstrike() {
  log('Setting up HexStrike AI...\n');

  const hexstrikeDir = path.join(os.homedir(), 'hexstrike-ai');

  if (fs.existsSync(path.join(hexstrikeDir, 'hexstrike_mcp.py'))) {
    ok('HexStrike already installed at ' + hexstrikeDir);
    log('To reinstall, delete the directory first: ' + hexstrikeDir);
    return;
  }

  const git = exec('git --version');
  if (!git) {
    fail('Git not found. Please install Git first.');
    return;
  }

  log('Cloning HexStrike AI repository...');
  const cloneResult = exec('git clone https://github.com/AIOX-Squads/hexstrike-ai.git "' + hexstrikeDir + '"');
  if (!cloneResult && !fs.existsSync(path.join(hexstrikeDir, 'hexstrike_mcp.py'))) {
    fail('Failed to clone repository. Check your internet connection.');
    return;
  }
  ok('Repository cloned');

  log('Creating Python virtual environment...');
  const isWin = os.platform() === 'win32';
  const pythonCmd = isWin ? 'python' : 'python3';
  const venvDir = path.join(hexstrikeDir, 'hexstrike-env');

  const venvResult = exec(`"${pythonCmd}" -m venv "${venvDir}"`);
  if (!fs.existsSync(venvDir)) {
    fail('Failed to create virtual environment. Is Python installed?');
    return;
  }
  ok('Virtual environment created');

  log('Installing dependencies...');
  const pip = isWin
    ? path.join(venvDir, 'Scripts', 'pip.exe')
    : path.join(venvDir, 'bin', 'pip');
  const installResult = exec(`"${pip}" install -r "${path.join(hexstrikeDir, 'requirements.txt')}"`);
  ok('Dependencies installed');

  log('\nHexStrike AI installed successfully!');
  log('Run "aiox-global config" to add it to OpenCode.');
}

function cmdSetupPentest() {
  log('Setting up Pentest MCP (Docker)...\n');

  const docker = exec('docker --version');
  if (!docker) {
    fail('Docker not found. Please install Docker first.');
    return;
  }
  ok('Docker found: ' + docker);

  const existing = exec('docker ps -a --filter name=pentest-mcp --format "{{.Names}}"');
  if (existing && existing.includes('pentest-mcp')) {
    const status = exec('docker inspect -f "{{.State.Status}}" pentest-mcp');
    if (status === 'running') {
      ok('Pentest MCP is already running');
    } else {
      log('Starting existing container...');
      exec('docker start pentest-mcp');
      ok('Pentest MCP started');
    }
    log('Run "aiox-global config" to add it to OpenCode.');
    return;
  }

  log('Pulling pentest-mcp image...');
  const pullResult = exec('docker pull pentest-mcp/pentest-mcp:latest');
  if (!pullResult) {
    warn('Could not pull pentest-mcp image. Trying alternative image names...');
    exec('docker pull ghcr.io/pentest-mcp/server:latest');
  }

  log('Creating container...');
  const runResult = exec('docker run -d --name pentest-mcp -p 8888:8888 pentest-mcp/pentest-mcp:latest');
  if (!runResult) {
    fail('Failed to create container. Check Docker permissions.');
    return;
  }
  ok('Pentest MCP container created and running');

  log('\nPentest MCP installed successfully!');
  log('Run "aiox-global config" to add it to OpenCode.');
}

function cmdList() {
  log('Installed AIOX agents:\n');

  if (!fs.existsSync(OPENCODE_AGENTS_DIR)) {
    warn('No agents installed. Run "aiox-global init" first.');
    return;
  }

  const files = fs.readdirSync(OPENCODE_AGENTS_DIR).filter(f => f.endsWith('.md'));
  if (files.length === 0) {
    warn('No agents found. Run "aiox-global init" first.');
    return;
  }

  files.forEach(file => {
    const filePath = path.join(OPENCODE_AGENTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const descMatch = content.match(/description:\s*"(.+?)"/);
    const modeMatch = content.match(/mode:\s*(\w+)/);
    const desc = descMatch ? descMatch[1] : '(no description)';
    const mode = modeMatch ? modeMatch[1] : 'subagent';
    const name = file.replace('.md', '');
    console.log(`  @${name.padEnd(18)} ${mode.padEnd(10)} ${desc}`);
  });

  console.log(`\nTotal: ${files.length} agents`);
}

const STATE_ICON = {
  equal: '✓',
  outdated: '↑',
  modified: '~',
  differs: '?',
  missing: '✗',
  unreadable: '!',
};

const STATE_HINT = {
  outdated: 'package has a newer version - run "aiox-global init"',
  modified: 'edited locally - "init" will overwrite it (backup is kept)',
  differs: 'differs from the package',
  missing: 'not installed - run "aiox-global init"',
};

function cmdStatus(options = {}) {
  const { json = false } = options;
  const comparison = compareAgents(AGENTS_DIR, OPENCODE_AGENTS_DIR, AGENTS, readManifest());
  const extras = listExtraAgents(OPENCODE_AGENTS_DIR, AGENTS);
  const config = describeConfig(OPENCODE_CONFIG);
  const plugin = pluginInstalled(OPENCODE_DIR);

  const summary = { total: AGENTS.length, equal: 0, outdated: 0, modified: 0, differs: 0, missing: 0, unreadable: 0 };
  comparison.forEach((agent) => { summary[agent.state] += 1; });

  const needsAttention = summary.missing + summary.outdated + summary.unreadable;
  const exitCode = needsAttention > 0 || !config.exists || !config.valid ? 1 : 0;

  if (json) {
    console.log(JSON.stringify({
      version: getPackageVersion(),
      agentsDir: OPENCODE_AGENTS_DIR,
      configPath: OPENCODE_CONFIG,
      summary,
      agents: comparison,
      extraAgents: extras,
      config,
      plugin,
      manifest: Boolean(readManifest()),
    }, null, 2));
    process.exitCode = exitCode;
    return;
  }

  log(`AIOX status v${getPackageVersion()}\n`);
  log(`Agents directory: ${OPENCODE_AGENTS_DIR}`);
  log(`Package ships:    ${AGENTS.length} agents`);
  if (!readManifest()) {
    warn('No install manifest (installed by an older version). Run "aiox-global init" once to enable drift detection.');
  }
  console.log('');

  comparison.forEach((agent) => {
    const icon = STATE_ICON[agent.state] || '?';
    const hint = STATE_HINT[agent.state] ? `  ${STATE_HINT[agent.state]}` : '';
    console.log(`  ${icon} ${agent.name.padEnd(18)} ${agent.state}${hint}`);
  });

  console.log('');
  const parts = Object.entries(summary)
    .filter(([key, value]) => key !== 'total' && value > 0)
    .map(([key, value]) => `${value} ${key}`);
  log(`${summary.total} agents: ${parts.join(', ')}`);

  log(`Config: ${config.exists ? config.shape.toUpperCase() : 'missing'}` +
    (config.valid && config.defaultAgent ? ` · default_agent=${config.defaultAgent}` : '') +
    (config.mcp.length ? ` · MCPs: ${config.mcp.join(', ')}` : ' · no MCPs'));
  if (!config.exists) warn(`No config at ${OPENCODE_CONFIG}. Run "aiox-global config"`);
  if (config.exists && !config.valid) fail(`Config is not valid JSON: ${config.error}`);

  log(`Plugin: aiox-update ${plugin.format}${plugin.installed ? '' : ' - run "aiox-global init"'}`);
  if (extras.length) log(`Other agents: ${extras.join(', ')}`);

  if (summary.modified > 0) {
    log('\nLocally modified agents are overwritten by "init"; use "aiox-global customize <agent>" to keep changes.');
  }

  process.exitCode = exitCode;
}

function cmdRestore(options = {}) {
  const { json = false, list = false, id = null } = options;
  const backups = listBackups(BACKUP_ROOT);

  if (list) {
    if (json) {
      console.log(JSON.stringify({ backupRoot: BACKUP_ROOT, backups }, null, 2));
      return;
    }
    if (backups.length === 0) {
      log(`No backups in ${BACKUP_ROOT}`);
      return;
    }
    log(`Backups in ${BACKUP_ROOT}:\n`);
    backups.forEach((backup) => {
      const when = backup.createdAt || '(unknown date)';
      console.log(`  ${backup.id.padEnd(28)} ${String(backup.files).padStart(2)} agents  ${when}`);
    });
    log('\nRestore with: aiox-global restore --id <id>');
    return;
  }

  let target = null;
  if (id) {
    target = backups.find((backup) => backup.id === id || backup.id.startsWith(id));
    if (!target) {
      if (json) {
        console.log(JSON.stringify({ error: `Backup not found: ${id}`, available: backups.map((b) => b.id) }, null, 2));
      } else {
        fail(`Backup not found: ${id}`);
        log(`Available: ${backups.map((b) => b.id).join(', ') || 'none'}`);
      }
      process.exitCode = 1;
      return;
    }
  } else {
    target = backups[0] || null;
    if (!target) {
      if (json) console.log(JSON.stringify({ error: 'No backups available', backupRoot: BACKUP_ROOT }, null, 2));
      else warn(`No backups available in ${BACKUP_ROOT}. Backups are created by "aiox-global init".`);
      process.exitCode = 1;
      return;
    }
  }

  const result = restoreBackup(OPENCODE_AGENTS_DIR, target);

  // Deliberately do not refresh the manifest: it records what the package
  // wrote, so a restored file stays visible as "modified" instead of
  // masquerading as "outdated".

  if (json) {
    console.log(JSON.stringify({ backup: target.id, restored: result.restored, agentsDir: OPENCODE_AGENTS_DIR }, null, 2));
    return;
  }

  log(`Restored ${result.restored.length} agents from ${target.id}\n`);
  result.restored.forEach((name) => console.log(`  ✓ ${name}`));
}

function cmdLogs(options = {}) {
  const { json = false, errors = false, lines = 40 } = options;
  const logDir = resolveLogDir();

  if (errors) {
    const scan = scanLog({ logDir });
    if (json) {
      console.log(JSON.stringify(scan, null, 2));
      process.exitCode = scan.ok && scan.hits.length > 0 ? 1 : 0;
      return;
    }
    if (!scan.ok) {
      warn(`No OpenCode log found in ${logDir}`);
      return;
    }
    log(`Scanning ${scan.file}${scan.truncated ? ' (tail only)' : ''}\n`);
    if (scan.hits.length === 0) {
      ok('No plugin, agent or config errors found');
      return;
    }
    fail(`${scan.hits.length} error line(s) found:`);
    scan.hits.slice(-40).forEach((hit) => {
      console.log(`  [${hit.kind}] ${hit.text}`);
    });
    process.exitCode = 1;
    return;
  }

  const tail = tailLog({ logDir, lines });
  if (json) {
    console.log(JSON.stringify(tail, null, 2));
    process.exitCode = tail.ok ? 0 : 1;
    return;
  }
  if (!tail.ok) {
    warn(`No OpenCode log found in ${logDir}`);
    process.exitCode = 1;
    return;
  }
  log(`Last ${tail.lines.length} line(s) of ${tail.file}\n`);
  tail.lines.forEach((line) => console.log(line));
}

function cmdDoctor(options = {}) {
  const { deep = false, json = false } = options;
  const checks = [];
  const record = (status, label) => {
    checks.push({ status, label });
    if (json) return;
    if (status === 'ok') ok(label);
    else if (status === 'warn') warn(label);
    else fail(label);
  };

  if (!json) log('Checking AIOX global installation...\n');

  record('ok', `Node.js ${process.version}`);
  record('ok', `Config directory: ${OPENCODE_DIR}`);
  if (process.env.OPENCODE_CONFIG_DIR) {
    record('warn', 'OPENCODE_CONFIG_DIR is set. OpenCode 2.4.1 ignores it when loading config, so only aiox-global uses this path.');
  }

  if (!fs.existsSync(OPENCODE_AGENTS_DIR)) {
    record('fail', `Config directory not found: ${OPENCODE_AGENTS_DIR}`);
    finishDoctor(checks, json, 'Run "aiox-global init" to install.');
    return;
  }
  record('ok', `Agents directory: ${OPENCODE_AGENTS_DIR}`);

  // Windows duplication alert
  if (os.platform() === 'win32') {
    const appDataDir = process.env.APPDATA ? path.join(process.env.APPDATA, 'opencode') : null;
    const homeConfigDir = path.join(os.homedir(), '.config', 'opencode');
    const localAppDataDir = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'opencode') : null;
    const candidates = [appDataDir, homeConfigDir, localAppDataDir].filter(Boolean);
    const existing = candidates.filter(p => {
      try { return fs.existsSync(p); } catch { return false; }
    });
    if (appDataDir && fs.existsSync(appDataDir) && fs.existsSync(homeConfigDir) && path.resolve(appDataDir) !== path.resolve(homeConfigDir)) {
      record('warn', `Duplicate config directories detected: ${appDataDir} and ${homeConfigDir} both exist. This may cause confusion. Consider consolidating.`);
    }
    if (existing.length > 1 && !json) {
      info(`Config candidates found: ${existing.join(', ')} (using ${OPENCODE_DIR})`);
    }
  }

  const files = fs.readdirSync(OPENCODE_AGENTS_DIR).filter(f => f.endsWith('.md'));
  const aioxAgents = files.filter(f => AGENTS.includes(f));
  const otherAgents = files.filter(f => !AGENTS.includes(f));

  if (aioxAgents.length === AGENTS.length) {
    record('ok', `All ${AGENTS.length} AIOX agents installed`);
  } else if (aioxAgents.length > 0) {
    record('warn', `${aioxAgents.length}/${AGENTS.length} AIOX agents found (missing: ${AGENTS.filter(a => !aioxAgents.includes(a)).join(', ')})`);
  } else {
    record('fail', 'No AIOX agents found. Run "aiox-global init"');
  }

  if (otherAgents.length > 0 && !json) {
    log(`  Other agents: ${otherAgents.map(f => f.replace('.md', '')).join(', ')}`);
  }

  const config = describeConfig(OPENCODE_CONFIG);
  if (config.exists && config.valid) {
    record('ok', 'OpenCode config found');
    if (config.defaultAgent) record('ok', `Default agent: ${config.defaultAgent}`);
    if (config.mcp.length > 0) record('ok', `MCPs configured: ${config.mcp.join(', ')}`);
    else record('warn', 'No MCPs configured. Run "aiox-global config"');
  } else if (config.exists) {
    record('fail', `Could not parse opencode.json: ${config.error}`);
  } else {
    record('warn', 'No opencode.json found. Run "aiox-global config"');
  }

  const plugin = pluginInstalled(OPENCODE_DIR);
  if (plugin.installed && plugin.format.startsWith('directory')) {
    record('ok', 'aiox-update plugin installed (V1 + V2)');
  } else if (plugin.installed) {
    record('warn', 'Legacy aiox-update.js found. Run "aiox-global init" to migrate it.');
  } else {
    record('warn', 'aiox-update plugin not installed. Run "aiox-global init"');
  }

  const hexstrikeDir = path.join(os.homedir(), 'hexstrike-ai');
  const hexstrikeInstalled = fs.existsSync(path.join(hexstrikeDir, 'hexstrike_mcp.py'));
  if (hexstrikeInstalled) {
    record('ok', 'HexStrike AI installed');
  } else {
    record('warn', 'HexStrike AI not installed. Run "aiox-global setup-hexstrike"');
  }

  // Installed is not the same as reachable: the MCP config points at a local
  // server process that has to be started separately.
  const hexstrikeServer = hexstrikeInstalled ? hexstrikeTarget() : null;
  if (hexstrikeServer) {
    const reachable = tcpProbe(hexstrikeServer);
    if (reachable === true) {
      record('ok', `HexStrike server reachable on ${hexstrikeServer.host}:${hexstrikeServer.port}`);
    } else if (reachable === false) {
      record(
        'warn',
        `HexStrike server NOT reachable on ${hexstrikeServer.host}:${hexstrikeServer.port} - the MCP will fail to connect. ` +
        `Start it from ${hexstrikeDir} (see docs/pt/HEXSTRIKE-SETUP.md)`
      );
    }
  }

  const docker = dockerContainerState();
  if (!docker.dockerAvailable) {
    record('warn', 'Docker not available or not responding - Pentest MCP cannot run. Run "aiox-global setup-pentest"');
  } else if (!docker.found) {
    record('warn', 'Pentest MCP not installed. Run "aiox-global setup-pentest"');
  } else if (docker.state === 'running') {
    record('ok', `Pentest MCP container running (${docker.status || 'up'})`);
  } else {
    record(
      'warn',
      `Pentest MCP container exists but is NOT running (state=${docker.state}${docker.status ? `, ${docker.status}` : ''}). ` +
      'The MCP config uses "docker exec", so it will fail to connect. Start it with: docker start pentest-mcp'
    );
  }

  if (deep) {
    const version = runtimeVersion();
    if (version) record('ok', `OpenCode runtime ${version}`);

    const runtime = loadedAgents();
    if (runtime.ok) {
      const loaded = new Set(runtime.agents.map((agent) => agent.name));
      const missing = AGENTS.map((f) => f.replace(/\.md$/, '')).filter((name) => !loaded.has(name));
      if (missing.length === 0) {
        record('ok', `OpenCode loaded all ${AGENTS.length} AIOX agents (${runtime.agents.length} total)`);
      } else {
        record('fail', `OpenCode did NOT load: ${missing.join(', ')} (file exists but the runtime rejected it)`);
      }

      const master = runtime.agents.find((agent) => agent.name === 'aiox-master');
      if (master && master.permissions !== null) {
        record('ok', `aiox-master: ${master.permissions} permission rules`);
      }
      if (!json) {
        checks.push({ status: 'info', label: `Runtime invoked as: ${runtime.bin} ${runtime.args.join(' ')}` });
      }
    } else {
      record('warn', `Could not query the OpenCode runtime (${runtime.error || 'unknown error'}). Deep check skipped.`);
    }

    const scan = scanLog({ since: lastInstallTime() });
    if (!scan.ok) {
      record('warn', `No OpenCode log found in ${logDirLabel()} - cannot check plugin/agent errors`);
    } else if (scan.hits.length > 0) {
      const kinds = [...new Set(scan.hits.map((hit) => hit.kind))];
      const newest = scan.hits[scan.hits.length - 1].timestamp;
      record('fail', `${scan.hits.length} error line(s) in ${path.basename(scan.file)}: ${kinds.join(', ')}` +
        (newest ? ` (newest at ${newest})` : '') +
        ' - run "aiox-global logs --errors"');
    } else if (scan.ignored > 0) {
      record('ok', `No errors since the last install (${scan.ignored} older line(s) in ${path.basename(scan.file)} ignored)`);
    } else {
      record('ok', `No plugin/agent errors in ${path.basename(scan.file)}`);
    }
  }

  if (!json) console.log(`\nTotal agents in ${OPENCODE_DIR}/agents/: ${files.length}`);
  finishDoctor(checks, json);
}

function logDirLabel() {
  return resolveLogDir();
}

/** Where the hexstrike MCP expects its server, taken from the config itself. */
function hexstrikeTarget() {
  try {
    const raw = JSON.parse(fs.readFileSync(OPENCODE_CONFIG, 'utf8'));
    const block = (raw.mcp && (raw.mcp.servers || raw.mcp)) || {};
    const server = block.hexstrike;
    if (!server || server.disabled) return null;
    return mcpServerTarget(server.command || []);
  } catch {
    return null;
  }
}

/**
 * Newest mtime among the files `init` writes. Errors older than this belong to
 * a previous installation and must not fail the current one.
 */
function lastInstallTime() {
  let newest = 0;
  const consider = (file) => {
    try {
      const stat = fs.statSync(file);
      if (stat.mtimeMs > newest) newest = stat.mtimeMs;
    } catch {
      // Missing files simply do not contribute.
    }
  };

  consider(OPENCODE_CONFIG);
  consider(path.join(OPENCODE_PLUGINS_DIR, 'aiox-update', 'index.js'));

  if (fs.existsSync(OPENCODE_AGENTS_DIR)) {
    fs.readdirSync(OPENCODE_AGENTS_DIR)
      .filter((file) => file.endsWith('.md'))
      .forEach((file) => consider(path.join(OPENCODE_AGENTS_DIR, file)));
  }

  return newest > 0 ? newest : null;
}

function finishDoctor(checks, json, hint) {
  const failures = checks.filter((check) => check.status === 'fail');
  const warnings = checks.filter((check) => check.status === 'warn');

  if (json) {
    console.log(JSON.stringify({
      ok: failures.length === 0,
      failures: failures.length,
      warnings: warnings.length,
      checks,
    }, null, 2));
  } else if (checks.length > 0) {
    const verdict = failures.length === 0
      ? (warnings.length === 0 ? 'all checks passed' : `passed with ${warnings.length} warning(s)`)
      : `${failures.length} failure(s), ${warnings.length} warning(s)`;
    console.log('');
    log(`Doctor: ${verdict}`);
  }

  if (hint && !json) log(hint);
  process.exitCode = failures.length > 0 ? 1 : 0;
}

async function cmdUpdate() {
  log('Checking for updates...\n');

  const currentVersion = getCurrentVersion();
  info(`Current version: ${currentVersion}`);

  // Direct registry request with a short timeout. Spawning `npm view` here made
  // every `update` (and the test suite) wait on a full npm process.
  log('Checking npm registry...');
  const latestVersion = await fetchLatestVersion();
  if (!latestVersion) {
    fail('Could not check for updates. Check your internet connection.');
    return;
  }
  info(`Latest version: ${latestVersion}`);

  if (!isNewer(latestVersion, currentVersion)) {
    ok('You are already on the latest version!');
    return;
  }

  log(`\nUpdate available: ${currentVersion} → ${latestVersion}`);

  const customDir = path.join(OPENCODE_DIR, 'custom');
  if (fs.existsSync(OPENCODE_AGENTS_DIR)) {
    const customAgents = fs.readdirSync(OPENCODE_AGENTS_DIR)
      .filter(f => f.endsWith('.md') && !AGENTS.includes(f));

    if (customAgents.length > 0) {
      if (!fs.existsSync(customDir)) {
        fs.mkdirSync(customDir, { recursive: true });
      }
      customAgents.forEach(agent => {
        const src = path.join(OPENCODE_AGENTS_DIR, agent);
        const dest = path.join(customDir, agent);
        fs.copyFileSync(src, dest);
      });
      info(`Backed up ${customAgents.length} custom agents to ${customDir}`);
    }
  }

  log('\nUpdating npm package...');
  const updateResult = exec('npm install -g aiox-opencode-adapter@latest');
  if (!updateResult) {
    fail('Failed to update npm package. Try running: npm install -g aiox-opencode-adapter');
    return;
  }
  ok('npm package updated');

  log('\nReinstalling agents...');
  cmdInit();

  if (fs.existsSync(customDir)) {
    const customAgents = fs.readdirSync(customDir).filter(f => f.endsWith('.md'));
    if (customAgents.length > 0) {
      customAgents.forEach(agent => {
        const src = path.join(customDir, agent);
        const dest = path.join(OPENCODE_AGENTS_DIR, agent);
        fs.copyFileSync(src, dest);
        ok(`Restored custom agent: ${agent}`);
      });
    }
  }

  log('\nUpdate complete!');
  log('Run "aiox-global doctor" to verify installation.');
}

function cmdCustomize(agentName) {
  if (!agentName) {
    log('Usage: aiox-global customize <agent-name>\n');
    log('Available agents:');
    AGENTS.forEach(f => {
      const name = f.replace('.md', '');
      console.log(`  ${name}`);
    });
    log('\nExample: aiox-global customize dev');
    return;
  }

  const agentFile = agentName.endsWith('.md') ? agentName : `${agentName}.md`;
  const agentPath = path.join(AGENTS_DIR, agentFile);

  if (!fs.existsSync(agentPath)) {
    fail(`Agent not found: ${agentName}`);
    log('Available agents:');
    AGENTS.forEach(f => {
      const name = f.replace('.md', '');
      console.log(`  ${name}`);
    });
    return;
  }

  const customDir = path.join(OPENCODE_DIR, 'custom');
  if (!fs.existsSync(customDir)) {
    fs.mkdirSync(customDir, { recursive: true });
  }

  const customPath = path.join(customDir, agentFile);
  fs.copyFileSync(agentPath, customPath);

  log(`Agent "${agentName}" ready for customization.`);
  log(`\nCustom file: ${customPath}`);
  log('\nYou can now edit this file to customize the agent.');
  log('Custom agents are preserved during updates.');
}

const PRESETS = {
  dev: {
    name: 'Developer',
    description: 'Essential agents for software development',
    agents: ['dev.md', 'architect.md', 'qa.md', 'devops.md'],
  },
  pentest: {
    name: 'Pentester',
    description: 'Security testing and penetration testing',
    agents: ['cybersec.md', 'dev.md', 'devops.md'],
  },
  fullstack: {
    name: 'Full Stack',
    description: 'Complete development team',
    agents: ['dev.md', 'architect.md', 'sm.md', 'pm.md', 'po.md', 'qa.md', 'devops.md', 'data-engineer.md'],
  },
  agile: {
    name: 'Agile Team',
    description: 'Agile project management focus',
    agents: ['sm.md', 'pm.md', 'po.md', 'analyst.md', 'dev.md', 'qa.md'],
  },
  minimal: {
    name: 'Minimal',
    description: 'Just the essentials',
    agents: ['dev.md', 'qa.md'],
  },
};

function cmdPreset(presetName) {
  if (!presetName) {
    log('Available presets:\n');
    Object.entries(PRESETS).forEach(([key, preset]) => {
      console.log(`  ${key.padEnd(12)} ${preset.name} - ${preset.description}`);
      console.log(`               Agents: ${preset.agents.map(a => a.replace('.md', '')).join(', ')}`);
    });
    log('\nUsage: aiox-global preset <preset-name>');
    log('Example: aiox-global preset dev');
    return;
  }

  const preset = PRESETS[presetName];
  if (!preset) {
    fail(`Preset not found: ${presetName}`);
    log('Available presets:');
    Object.keys(PRESETS).forEach(key => console.log(`  ${key}`));
    return;
  }

  log(`Applying preset: ${preset.name}\n`);

  if (!fs.existsSync(OPENCODE_AGENTS_DIR)) {
    fs.mkdirSync(OPENCODE_AGENTS_DIR, { recursive: true });
  }

  let copied = 0;
  preset.agents.forEach(agentFile => {
    const src = path.join(AGENTS_DIR, agentFile);
    const dest = path.join(OPENCODE_AGENTS_DIR, agentFile);

    if (!fs.existsSync(src)) {
      fail(`${agentFile}: source not found`);
      return;
    }

    fs.copyFileSync(src, dest);
    ok(`${agentFile} -> ${dest}`);
    copied++;
  });

  log(`\nInstalled ${copied}/${preset.agents.length} agents from "${preset.name}" preset.`);
  log('Run "aiox-global config" to update OpenCode configuration.');
}

function cmdAutoSetup() {
  log('AIOX Auto-Setup: Configuring everything automatically...\n');

  log('Step 1/3: Installing agents...');
  try {
    cmdInit();
  } catch (e) {
    fail('Step 1 failed: ' + e.message);
  }
  console.log('');

  log('Step 2/3: Generating configuration...');
  try {
    cmdConfig();
  } catch (e) {
    fail('Step 2 failed: ' + e.message);
  }
  console.log('');

  log('Step 3/3: Verifying installation...');
  try {
    cmdDoctor();
  } catch (e) {
    fail('Step 3 failed: ' + e.message);
  }

  console.log('');
  log('Auto-setup complete!');
  log('You can now use OpenCode with AIOX agents.');
  log('Example: @dev, @architect, @cybersec');
}

function cmdUninstall() {
  log('Removing AIOX agents...\n');

  if (!fs.existsSync(OPENCODE_AGENTS_DIR)) {
    warn('No agents directory found. Nothing to uninstall.');
    return;
  }

  let removed = 0;
  AGENTS.forEach(file => {
    const dest = path.join(OPENCODE_AGENTS_DIR, file);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      ok(`Removed: ${file}`);
      removed++;
    }
  });

  log(`\nRemoved ${removed}/${AGENTS.length} agents.`);
  log(`Note: Other custom agents in ${OPENCODE_DIR}/agents/ were not touched.`);

  // Also remove plugin if installed
  try {
    if (!removeUpdatePlugin()) {
      info('No aiox-update plugin found.');
    }
  } catch (e) {
    warn(`Could not remove plugin: ${e.message}`);
  }
}

const args = process.argv.slice(2);

function parseArgs(argv) {
  const flags = { lines: 40 };
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--json': flags.json = true; break;
      case '--deep': flags.deep = true; break;
      case '--dry-run':
      case '--dryrun': flags.dryRun = true; break;
      case '--no-backup': flags.noBackup = true; break;
      case '--errors': flags.errors = true; break;
      case '--list': flags.list = true; break;
      case '-n':
      case '--lines': flags.lines = Number(argv[++i]) || flags.lines; break;
      case '--version':
      case '-v': positional.push('--version'); break;
      case '-h':
      case '--help': positional.push('help'); break;
      default:
        if (/^--lines=(\d+)$/.test(arg)) flags.lines = Number(arg.split('=')[1]);
        else if (/^--id=(.+)$/.test(arg)) flags.id = arg.split('=')[1];
        else if (/^--lines=/.test(arg)) break;
        else if (arg.startsWith('-')) flags[arg.replace(/^--?/, '')] = true;
        else positional.push(arg);
    }
  }

  return { flags, positional };
}

const { flags, positional } = parseArgs(args);
const cmd = positional[0];

switch (cmd) {
  case 'init':
  case 'install':
    cmdInit({ dryRun: flags.dryRun, backup: !flags.noBackup });
    break;
  case 'status':
  case 'diff':
    cmdStatus({ json: flags.json });
    break;
  case 'restore':
    cmdRestore({ json: flags.json, list: flags.list, id: flags.id || positional[1] || null });
    break;
  case 'logs':
  case 'log':
    cmdLogs({ json: flags.json, errors: flags.errors, lines: flags.lines });
    break;
  case 'config':
  case 'configure':
    cmdConfig();
    break;
  case 'setup-hexstrike':
  case 'hexstrike':
    cmdSetupHexstrike();
    break;
  case 'setup-pentest':
  case 'pentest':
    cmdSetupPentest();
    break;
  case 'list':
  case 'ls':
    cmdList();
    break;
  case 'update':
  case 'upgrade':
    cmdUpdate();
    break;
  case 'doctor':
  case 'check':
    cmdDoctor({ deep: flags.deep, json: flags.json });
    break;
  case 'customize':
  case 'custom':
    cmdCustomize(positional[1]);
    break;
  case 'preset':
  case 'template':
    cmdPreset(positional[1]);
    break;
  case 'auto-setup':
  case 'setup':
    cmdAutoSetup();
    break;
  case 'uninstall':
  case 'remove':
    cmdUninstall();
    break;
  case '--version':
  case '-v':
    const versionPkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
    console.log(versionPkg.version);
    break;
  case 'help':
  case undefined:
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
    console.log(`
 ${pkg.name} v${pkg.version}
 ${pkg.description}

 Based on AIOX Framework by SynkraAI (MIT License)
 https://github.com/SynkraAI/aiox-core

  Commands:
    aiox-global auto-setup      Full automatic setup (recommended)
    aiox-global init            Install agents globally for OpenCode
    aiox-global config          Generate opencode.json with auto-detected MCPs
    aiox-global status          Compare installed agents with the package (alias: diff)
    aiox-global doctor          Check installation health
    aiox-global logs            Tail the OpenCode log (--errors to scan for failures)
    aiox-global restore         Restore agents from a backup (--list to see them)
    aiox-global setup-hexstrike Install HexStrike AI pentesting MCP
    aiox-global setup-pentest   Install Pentest MCP (Docker)
    aiox-global list            List installed agents
    aiox-global update          Update to latest version
    aiox-global customize       Customize an agent (creates local copy)
    aiox-global preset          Apply a preset (dev, pentest, fullstack, agile, minimal)
    aiox-global uninstall       Remove AIOX agents
    aiox-global help            Show this help
    aiox-global --version       Show version

  Flags:
    --json        Machine-readable output (status, doctor, logs, restore)
    --deep        doctor: also ask the OpenCode runtime which agents it loaded
    --dry-run     init: show what would change without writing
    --no-backup   init: skip the agents backup
    --errors      logs: scan the log for plugin/agent/config errors
    -n, --lines   logs: number of lines to show (default 40)
 `);
    break;
  default:
    console.error(`Unknown command: ${cmd}. Run "aiox-global help" for usage.`);
    process.exit(1);
}
