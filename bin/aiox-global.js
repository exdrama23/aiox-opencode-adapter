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
} = require('../lib/opencodeCompat');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const OPENCODE_DIR = resolveOpencodeDir();
const OPENCODE_AGENTS_DIR = path.join(OPENCODE_DIR, 'agents');
const OPENCODE_CONFIG = path.join(OPENCODE_DIR, 'opencode.json');
const OPENCODE_SKILLS_DIR = path.join(OPENCODE_DIR, 'skills');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');

const { checkForUpdate } = require('./update-checker');
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

function cmdInit() {
  log('Installing AIOX agents globally for OpenCode...\n');

  if (!fs.existsSync(OPENCODE_AGENTS_DIR)) {
    fs.mkdirSync(OPENCODE_AGENTS_DIR, { recursive: true });
    log(`Created: ${OPENCODE_AGENTS_DIR}`);
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

  log(`\nInstalled ${copied}/${AGENTS.length} agents.`);

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
  // Ensure top-level agent/agents mirrored
  if (config.agent && !config.agents) {
    config.agents = structuredClone(config.agent);
  } else if (!config.agent && config.agents) {
    config.agent = structuredClone(config.agents);
  } else if (config.agent && config.agents) {
    // Both exist -> ensure they are synchronized, V2 (agents) wins if divergence?
    // Merge: ensure both contain union of keys, with agents as source
    const merged = {};
    const allKeys = new Set([...Object.keys(config.agent), ...Object.keys(config.agents)]);
    for (const k of allKeys) {
      // Prefer agents (V2) if exists
      merged[k] = structuredClone(config.agents[k] || config.agent[k]);
    }
    config.agent = structuredClone(merged);
    config.agents = structuredClone(merged);
  }

  // Ensure global permission / permissions dual
  const hasPerm = !!config.permission;
  const hasPerms = !!config.permissions;
  if (hasPerm && !hasPerms) {
    config.permissions = convertV1ToV2(config.permission);
  } else if (!hasPerm && hasPerms) {
    config.permission = convertV2ToV1(config.permissions);
  } else if (hasPerm && hasPerms) {
    config.permissions = dedupPermissionsArray(config.permissions);
    // V2 wins, keep both as is
  } else if (!hasPerm && !hasPerms) {
    // No global permission defined, keep as is (maybe default)
  }

  // Ensure each agent has both permission and permissions
  const agentCollections = [];
  if (config.agent) agentCollections.push(config.agent);
  if (config.agents) agentCollections.push(config.agents);

  // Collect all unique agent names
  const allAgentNames = new Set();
  if (config.agent) Object.keys(config.agent).forEach(k => allAgentNames.add(k));
  if (config.agents) Object.keys(config.agents).forEach(k => allAgentNames.add(k));

  for (const name of allAgentNames) {
    // Get agent objects (may be in one collection only)
    let agentV1Obj = config.agent ? config.agent[name] : null;
    let agentV2Obj = config.agents ? config.agents[name] : null;
    // Merge to single source - prefer V2
    let source = agentV2Obj || agentV1Obj;
    if (!source) continue;
    let perm = source.permission;
    let perms = source.permissions;

    // Normalize alias within permission if needed (shell->bash)
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
      // Neither, skip
      continue;
    }

    // Ensure agent object has both
    const updated = { ...source, permission: perm, permissions: perms };

    if (config.agent) config.agent[name] = structuredClone(updated);
    if (config.agents) config.agents[name] = structuredClone(updated);
  }

  // If only one collection existed initially, ensure the other mirrored
  if (config.agent && !config.agents) {
    config.agents = structuredClone(config.agent);
  } else if (!config.agent && config.agents) {
    config.agent = structuredClone(config.agents);
  }
}

function cmdConfig() {
  log('Generating OpenCode config...\n');

  const templatePath = path.join(TEMPLATE_DIR, 'opencode.json');
  if (!fs.existsSync(templatePath)) {
    fail('Template not found: ' + templatePath);
    return;
  }

  let config = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

  // Dual-write normalization for template
  ensureDualPermissions(config);

  if (fs.existsSync(OPENCODE_AGENTS_DIR)) {
    const installedAgents = fs.readdirSync(OPENCODE_AGENTS_DIR).filter(f => f.endsWith('.md'));
    const templateAgents = Object.keys(config.agent || {});
    let added = 0;

    for (const file of installedAgents) {
      const agentName = file.replace('.md', '');
      if (config.agent && config.agent[agentName]) continue;

      const content = fs.readFileSync(path.join(OPENCODE_AGENTS_DIR, file), 'utf8');
      const parsed = parseAgentFrontmatterV2(content);
      if (parsed && parsed.description) {
        if (!config.agent) config.agent = {};
        if (!config.agents) config.agents = {};
        const agentEntry = {
          description: parsed.description,
          mode: parsed.mode || 'subagent',
          color: parsed.color || '#607D8B',
        };
        if (parsed.permission) agentEntry.permission = parsed.permission;
        if (parsed.permissions) agentEntry.permissions = parsed.permissions;
        // Ensure dual within agent entry
        if (agentEntry.permission && !agentEntry.permissions) {
          agentEntry.permissions = convertV1ToV2(agentEntry.permission);
        } else if (!agentEntry.permission && agentEntry.permissions) {
          agentEntry.permission = convertV2ToV1(agentEntry.permissions);
        }
        config.agent[agentName] = structuredClone(agentEntry);
        config.agents[agentName] = structuredClone(agentEntry);
        added++;
        ok(`Added agent: @${agentName} (${parsed.mode || 'subagent'})`);
      }
    }

    if (added > 0) {
      log(`Registered ${added} additional agents from installed files.`);
    }
  }

  // Ensure again dual after adding agents
  ensureDualPermissions(config);

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
        config.mcp.hexstrike = {
          type: 'local',
          command: [python, p, '--server', 'http://localhost:8888'],
          enabled: true,
          timeout: 300000
        };
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
      config.mcp['pentest-mcp'] = {
        type: 'local',
        command: ['docker', 'exec', '-i', 'pentest-mcp', 'python3', '/app/server.py'],
        enabled: true,
        timeout: 300000
      };
      ok('Pentest MCP configured (Docker container found)');
    } else {
      warn('Pentest MCP not found. Run "aiox-global setup-pentest" to install.');
    }
  } catch {
    warn('Docker not available. Pentest MCP requires Docker.');
  }

  if (!fs.existsSync(OPENCODE_DIR)) {
    fs.mkdirSync(OPENCODE_DIR, { recursive: true });
  }

  if (fs.existsSync(OPENCODE_CONFIG)) {
    const backup = OPENCODE_CONFIG + '.bak';
    fs.copyFileSync(OPENCODE_CONFIG, backup);
    info(`Backed up existing config to ${backup}`);
  }

  fs.writeFileSync(OPENCODE_CONFIG, JSON.stringify(config, null, 2));
  ok(`Config written to ${OPENCODE_CONFIG}`);

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

function cmdDoctor() {
  log('Checking AIOX global installation...\n');

  try {
    const nodeVer = process.version;
    ok(`Node.js ${nodeVer}`);
  } catch { fail('Node.js not found'); }

  ok(`Config directory: ${OPENCODE_DIR}`);

  if (fs.existsSync(OPENCODE_AGENTS_DIR)) {
    ok(`Agents directory: ${OPENCODE_AGENTS_DIR}`);
  } else {
    fail(`Config directory not found: ${OPENCODE_AGENTS_DIR}`);
    log('Run "aiox-global init" to install.');
    return;
  }

  // Windows duplication alert
  if (os.platform() === 'win32') {
    const appDataDir = process.env.APPDATA ? path.join(process.env.APPDATA, 'opencode') : null;
    const homeConfigDir = path.join(os.homedir(), '.config', 'opencode');
    const localAppDataDir = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'opencode') : null;
    const candidates = [appDataDir, homeConfigDir, localAppDataDir].filter(Boolean);
    const existing = candidates.filter(p => {
      try { return fs.existsSync(p); } catch { return false; }
    });
    // Alert if APPDATA and home config both exist and are different
    if (appDataDir && fs.existsSync(appDataDir) && fs.existsSync(homeConfigDir) && path.resolve(appDataDir) !== path.resolve(homeConfigDir)) {
      warn(`Duplicate config directories detected: ${appDataDir} and ${homeConfigDir} both exist. This may cause confusion. Consider consolidating.`);
    }
    if (existing.length > 1) {
      info(`Config candidates found: ${existing.join(', ')} (using ${OPENCODE_DIR})`);
    }
  }

  const files = fs.readdirSync(OPENCODE_AGENTS_DIR).filter(f => f.endsWith('.md'));
  const aioxAgents = files.filter(f => AGENTS.includes(f));
  const otherAgents = files.filter(f => !AGENTS.includes(f));

  if (aioxAgents.length === AGENTS.length) {
    ok(`All ${AGENTS.length} AIOX agents installed`);
  } else if (aioxAgents.length > 0) {
    warn(`${aioxAgents.length}/${AGENTS.length} AIOX agents found (missing: ${AGENTS.filter(a => !aioxAgents.includes(a)).join(', ')})`);
  } else {
    fail('No AIOX agents found. Run "aiox-global init"');
  }

  if (otherAgents.length > 0) {
    log(`  Other agents: ${otherAgents.map(f => f.replace('.md', '')).join(', ')}`);
  }

  if (fs.existsSync(OPENCODE_CONFIG)) {
    ok('OpenCode config found');
    try {
      const config = JSON.parse(fs.readFileSync(OPENCODE_CONFIG, 'utf8'));
      if (config.default_agent) ok(`Default agent: ${config.default_agent}`);
      if (config.mcp) {
        const mcps = Object.keys(config.mcp);
        if (mcps.length > 0) ok(`MCPs configured: ${mcps.join(', ')}`);
        else warn('No MCPs configured. Run "aiox-global config"');
      }
    } catch {
      warn('Could not parse opencode.json');
    }
  } else {
    warn('No opencode.json found. Run "aiox-global config"');
  }

  const hexstrikeDir = path.join(os.homedir(), 'hexstrike-ai');
  if (fs.existsSync(path.join(hexstrikeDir, 'hexstrike_mcp.py'))) {
    ok('HexStrike AI installed');
  } else {
    warn('HexStrike AI not installed. Run "aiox-global setup-hexstrike"');
  }

  const dockerCheck = exec('docker ps -a --filter name=pentest-mcp --format "{{.Names}}"');
  if (dockerCheck && dockerCheck.includes('pentest-mcp')) {
    ok('Pentest MCP container found');
  } else {
    warn('Pentest MCP not installed. Run "aiox-global setup-pentest"');
  }

  console.log(`\nTotal agents in ${OPENCODE_DIR}/agents/: ${files.length}`);
}

function cmdUpdate() {
  log('Checking for updates...\n');

  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  const currentVersion = pkg.version;
  info(`Current version: ${currentVersion}`);

  log('Checking npm registry...');
  const latestVersion = exec('npm view aiox-opencode-adapter version');
  if (!latestVersion) {
    fail('Could not check for updates. Check your internet connection.');
    return;
  }
  info(`Latest version: ${latestVersion}`);

  if (currentVersion === latestVersion) {
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
  cmdInit();
  console.log('');

  log('Step 2/3: Generating configuration...');
  cmdConfig();
  console.log('');

  log('Step 3/3: Verifying installation...');
  cmdDoctor();

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
}

const args = process.argv.slice(2);
const cmd = args[0];

switch (cmd) {
  case 'init':
  case 'install':
    cmdInit();
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
    cmdDoctor();
    break;
  case 'customize':
  case 'custom':
    cmdCustomize(args[1]);
    break;
  case 'preset':
  case 'template':
    cmdPreset(args[1]);
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
   aiox-global setup-hexstrike Install HexStrike AI pentesting MCP
   aiox-global setup-pentest   Install Pentest MCP (Docker)
   aiox-global list            List installed agents
   aiox-global update          Update to latest version
   aiox-global customize       Customize an agent (creates local copy)
   aiox-global preset          Apply a preset (dev, pentest, fullstack, agile, minimal)
   aiox-global doctor          Check installation health
   aiox-global uninstall       Remove AIOX agents
   aiox-global help            Show this help
   aiox-global --version       Show version
 `);
    break;
  default:
    console.error(`Unknown command: ${cmd}. Run "aiox-global help" for usage.`);
    process.exit(1);
}
