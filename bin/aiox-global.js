#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const OPENCODE_DIR = path.join(os.homedir(), '.config', 'opencode');
const OPENCODE_AGENTS_DIR = path.join(OPENCODE_DIR, 'agents');
const OPENCODE_CONFIG = path.join(OPENCODE_DIR, 'opencode.json');
const OPENCODE_SKILLS_DIR = path.join(OPENCODE_DIR, 'skills');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');

const AGENTS = [
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

// ─── init ────────────────────────────────────────────────
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

// ─── config ──────────────────────────────────────────────
function cmdConfig() {
  log('Generating OpenCode config...\n');

  const templatePath = path.join(TEMPLATE_DIR, 'opencode.json');
  if (!fs.existsSync(templatePath)) {
    fail('Template not found: ' + templatePath);
    return;
  }

  let config = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

  // Auto-detect HexStrike
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

  // Auto-detect Pentest MCP (Docker)
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

  // Ensure config directory exists
  if (!fs.existsSync(OPENCODE_DIR)) {
    fs.mkdirSync(OPENCODE_DIR, { recursive: true });
  }

  // Backup existing config
  if (fs.existsSync(OPENCODE_CONFIG)) {
    const backup = OPENCODE_CONFIG + '.bak';
    fs.copyFileSync(OPENCODE_CONFIG, backup);
    info(`Backed up existing config to ${backup}`);
  }

  // Write config
  fs.writeFileSync(OPENCODE_CONFIG, JSON.stringify(config, null, 2));
  ok(`Config written to ${OPENCODE_CONFIG}`);

  log('\nConfig generated! MCPs will auto-connect on next OpenCode restart.');
}

// ─── setup-hexstrike ─────────────────────────────────────
function cmdSetupHexstrike() {
  log('Setting up HexStrike AI...\n');

  const hexstrikeDir = path.join(os.homedir(), 'hexstrike-ai');

  // Check if already installed
  if (fs.existsSync(path.join(hexstrikeDir, 'hexstrike_mcp.py'))) {
    ok('HexStrike already installed at ' + hexstrikeDir);
    log('To reinstall, delete the directory first: ' + hexstrikeDir);
    return;
  }

  // Check for git
  const git = exec('git --version');
  if (!git) {
    fail('Git not found. Please install Git first.');
    return;
  }

  // Clone
  log('Cloning HexStrike AI repository...');
  const cloneResult = exec('git clone https://github.com/AIOX-Squads/hexstrike-ai.git "' + hexstrikeDir + '"');
  if (!cloneResult && !fs.existsSync(path.join(hexstrikeDir, 'hexstrike_mcp.py'))) {
    fail('Failed to clone repository. Check your internet connection.');
    return;
  }
  ok('Repository cloned');

  // Create virtual environment
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

  // Install dependencies
  log('Installing dependencies...');
  const pip = isWin
    ? path.join(venvDir, 'Scripts', 'pip.exe')
    : path.join(venvDir, 'bin', 'pip');
  const installResult = exec(`"${pip}" install -r "${path.join(hexstrikeDir, 'requirements.txt')}"`);
  ok('Dependencies installed');

  log('\nHexStrike AI installed successfully!');
  log('Run "aiox-global config" to add it to OpenCode.');
}

// ─── setup-pentest ───────────────────────────────────────
function cmdSetupPentest() {
  log('Setting up Pentest MCP (Docker)...\n');

  // Check Docker
  const docker = exec('docker --version');
  if (!docker) {
    fail('Docker not found. Please install Docker first.');
    return;
  }
  ok('Docker found: ' + docker);

  // Check if already running
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

  // Pull and run
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

// ─── list ────────────────────────────────────────────────
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

// ─── doctor ──────────────────────────────────────────────
function cmdDoctor() {
  log('Checking AIOX global installation...\n');

  // Check Node.js
  try {
    const nodeVer = process.version;
    ok(`Node.js ${nodeVer}`);
  } catch { fail('Node.js not found'); }

  // Check opencode config dir
  if (fs.existsSync(OPENCODE_AGENTS_DIR)) {
    ok(`Config directory: ${OPENCODE_AGENTS_DIR}`);
  } else {
    fail(`Config directory not found: ${OPENCODE_AGENTS_DIR}`);
    log('Run "aiox-global init" to install.');
    return;
  }

  // Check agents
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

  // Check opencode config
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

  // Check MCPs
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

  console.log(`\nTotal agents in ~/.config/opencode/agents/: ${files.length}`);
}

// ─── uninstall ───────────────────────────────────────────
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
  log('Note: Other custom agents in ~/.config/opencode/agents/ were not touched.');
}

// ─── main ────────────────────────────────────────────────
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
  case 'doctor':
  case 'check':
    cmdDoctor();
    break;
  case 'uninstall':
  case 'remove':
    cmdUninstall();
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
  aiox-global init            Install agents globally for OpenCode
  aiox-global config          Generate opencode.json with auto-detected MCPs
  aiox-global setup-hexstrike Install HexStrike AI pentesting MCP
  aiox-global setup-pentest   Install Pentest MCP (Docker)
  aiox-global list            List installed agents
  aiox-global doctor          Check installation health
  aiox-global uninstall       Remove AIOX agents
  aiox-global help            Show this help
`);
    break;
  default:
    console.error(`Unknown command: ${cmd}. Run "aiox-global help" for usage.`);
    process.exit(1);
}
