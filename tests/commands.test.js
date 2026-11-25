/**
 * Tests for the 1.5.0 commands: status, init --dry-run, restore, logs and
 * doctor --deep. Everything runs against a temporary HOME and, for the
 * runtime checks, against a fake `opencode` binary - never the real one.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createSandbox } = require('./helpers/sandbox');

const sandbox = createSandbox('commands');
const AGENTS_DIR = sandbox.agentsDir;
const MANIFEST = path.join(sandbox.home, '.aiox', 'installed-manifest.json');
const BACKUPS = path.join(sandbox.home, '.aiox', 'backups');
const AGENT_FILES = fs
  .readdirSync(path.join(__dirname, '..', 'agents'))
  .filter((f) => f.endsWith('.md'));

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function setManifest(agents) {
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify({ version: 'test', writtenAt: new Date().toISOString(), agents }, null, 2));
}

function readJson(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  return JSON.parse(output.slice(start, end + 1));
}

describe('init', () => {
  test('--dry-run writes nothing', () => {
    const output = sandbox.run('init --dry-run');

    expect(output).toContain('Dry run');
    expect(output).toContain('13 of 13 agents would change');
    expect(fs.existsSync(AGENTS_DIR)).toBe(false);
    expect(fs.existsSync(MANIFEST)).toBe(false);
  });

  test('installs agents and records a manifest', () => {
    sandbox.run('init');

    expect(fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'))).toHaveLength(AGENT_FILES.length);
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(Object.keys(manifest.agents)).toHaveLength(AGENT_FILES.length);
    expect(manifest.agents['dev.md']).toBe(hash(path.join(AGENTS_DIR, 'dev.md')));
  });

  test('a second dry-run reports nothing to do', () => {
    const output = sandbox.run('init --dry-run');
    expect(output).toContain('0 of 13 agents would change');
    expect(output).toContain('already match the package');
  });
});

describe('status', () => {
  test('reports every agent as equal right after init', () => {
    const output = sandbox.run('status --json');
    const data = readJson(output);

    expect(data.summary.total).toBe(AGENT_FILES.length);
    expect(data.summary.equal).toBe(AGENT_FILES.length);
    expect(data.summary.missing).toBe(0);
    expect(data.manifest).toBe(true);
  });

  test('detects a locally modified agent', () => {
    const target = path.join(AGENTS_DIR, 'qa.md');
    fs.appendFileSync(target, '\n<!-- local tweak -->\n');

    const data = readJson(sandbox.run('status --json'));
    const qa = data.agents.find((agent) => agent.name === 'qa');

    expect(qa.state).toBe('modified');
    expect(data.summary.modified).toBe(1);
  });

  test('detects a missing agent and exits non-zero', () => {
    fs.unlinkSync(path.join(AGENTS_DIR, 'po.md'));

    const { output, code } = sandbox.runResult('status --json');
    const data = readJson(output);

    expect(data.agents.find((agent) => agent.name === 'po').state).toBe('missing');
    expect(data.summary.missing).toBe(1);
    expect(code).toBe(1);
  });

  test('distinguishes "package moved on" from "user edited"', () => {
    // Simulate: the installed file is what `init` wrote for an older package
    // version. The manifest agrees with the file, the package does not.
    const target = path.join(AGENTS_DIR, 'sm.md');
    fs.writeFileSync(target, '# old version of sm\n');

    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    manifest.agents['sm.md'] = hash(target);
    setManifest(manifest.agents);

    const data = readJson(sandbox.run('status --json'));
    expect(data.agents.find((agent) => agent.name === 'sm').state).toBe('outdated');
  });

  test('human output marks drift with hints', () => {
    const output = sandbox.run('status');
    expect(output).toMatch(/AIOX status v/);
    expect(output).toContain('modified');
    expect(output).toContain('Locally modified agents are overwritten by "init"');
  });
});

describe('restore', () => {
  test('keeps a backup of the agents it overwrites', () => {
    // The first `init` had nothing to back up; this one overwrites 13 files.
    sandbox.run('init');

    const backups = fs.existsSync(BACKUPS) ? fs.readdirSync(BACKUPS) : [];
    expect(backups.length).toBeGreaterThan(0);

    const newest = path.join(BACKUPS, backups.sort().pop());
    expect(fs.readdirSync(newest).filter((f) => f.endsWith('.md')).length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(newest, 'backup.json'))).toBe(true);
  });

  test('--list --json exposes the backups', () => {
    const data = readJson(sandbox.run('restore --list --json'));
    expect(Array.isArray(data.backups)).toBe(true);
    expect(data.backups.length).toBeGreaterThan(0);
    expect(data.backups[0].id).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  test('restores the newest backup', () => {
    const tweak = '\n<!-- restored marker -->\n';
    const target = path.join(AGENTS_DIR, 'dev.md');
    fs.appendFileSync(target, tweak);

    // init backs up the tweaked file, then overwrites it with the package copy
    sandbox.run('init');
    expect(fs.readFileSync(target, 'utf8')).not.toContain('restored marker');

    const output = sandbox.run('restore');
    expect(output).toContain('Restored');
    expect(fs.readFileSync(target, 'utf8')).toContain('restored marker');
  });

  test('restoring an unknown id fails cleanly', () => {
    const output = sandbox.run('restore --id does-not-exist --json');
    expect(output).toContain('Backup not found');
  });

  test('restore does not rewrite the manifest as "outdated"', () => {
    const data = readJson(sandbox.run('status --json'));
    const dev = data.agents.find((agent) => agent.name === 'dev');
    // The restored file is not what the package ships, but it is also not a
    // package upgrade: it must read as "modified".
    expect(dev.state).toBe('modified');
  });
});

describe('logs', () => {
  const logDir = path.join(sandbox.home, 'fake-log');
  const logFile = path.join(logDir, 'opencode.log');

  beforeAll(() => {
    fs.mkdirSync(logDir, { recursive: true });
    const lines = [
      'timestamp=2026-01-01T00:00:00.000Z level=INFO message="boot"',
      'timestamp=2026-01-01T00:00:01.000Z level=WARN message="agent file skipped" reason=markdown',
      'timestamp=2026-01-01T00:00:02.000Z level=INFO message="ready"',
    ];
    fs.writeFileSync(logFile, `${lines.join('\n')}\n`);
  });

  test('tails the newest log file', () => {
    const output = sandbox.run('logs -n 2 --json', { OPENCODE_LOG_DIR: logDir });
    const data = readJson(output);

    expect(data.ok).toBe(true);
    expect(data.file).toBe(logFile);
    expect(data.lines).toHaveLength(2);
    expect(data.lines[1]).toContain('ready');
  });

  test('--errors finds the skipped agent', () => {
    const output = sandbox.run('logs --errors --json', { OPENCODE_LOG_DIR: logDir });
    const data = readJson(output);

    expect(data.hits).toHaveLength(1);
    expect(data.hits[0].kind).toBe('agent file skipped');
  });

  test('reports a missing log directory instead of crashing', () => {
    const output = sandbox.run('logs', { OPENCODE_LOG_DIR: path.join(sandbox.home, 'nope') });
    expect(output).toMatch(/No OpenCode log found/);
  });
});

describe('docker container state', () => {
  const { dockerContainerState } = require('../lib/opencodeRuntime');

  test('reports docker as unavailable when the command fails', () => {
    expect(dockerContainerState({ run: () => null })).toMatchObject({ dockerAvailable: false, found: false });
  });

  test('reports a missing container', () => {
    expect(dockerContainerState({ run: () => '' })).toMatchObject({ dockerAvailable: true, found: false, state: 'missing' });
  });

  test('reports a running container', () => {
    const result = dockerContainerState({ run: () => 'pentest-mcp|running|Up 2 hours' });
    expect(result).toMatchObject({ found: true, state: 'running' });
  });

  test('reports a stopped container instead of calling it healthy', () => {
    // The whole point: `ps -a` finds it, but `docker exec` will still fail.
    const result = dockerContainerState({ run: () => 'pentest-mcp|exited|Exited (255) 4 weeks ago' });
    expect(result).toMatchObject({ found: true, state: 'exited', status: 'Exited (255) 4 weeks ago' });
  });
});

describe('mcp server target', () => {
  const { mcpServerTarget, tcpProbe } = require('../lib/opencodeRuntime');

  test('extracts host and port from an MCP command', () => {
    const command = ['C:\\py\\python.exe', 'hexstrike_mcp.py', '--server', 'http://localhost:8888'];
    expect(mcpServerTarget(command)).toEqual({ host: 'localhost', port: 8888 });
  });

  test('handles a command without a URL', () => {
    expect(mcpServerTarget(['docker', 'exec', '-i', 'pentest-mcp', 'python3', '/app/server.py'])).toBeNull();
    expect(mcpServerTarget([])).toBeNull();
  });

  test('tcpProbe reports false for a closed port', () => {
    // Port 1 on loopback is never listening.
    expect(tcpProbe({ host: '127.0.0.1', port: 1, timeout: 500 })).toBe(false);
  });

  test('tcpProbe returns null when no port is given', () => {
    expect(tcpProbe({})).toBeNull();
  });
});

describe('doctor --deep', () => {
  function writeFakeOpencode(agents) {
    const dir = path.join(sandbox.home, 'fake-bin');
    fs.mkdirSync(dir, { recursive: true });

    const script = path.join(dir, 'fake-opencode.js');
    fs.writeFileSync(script, `
      const args = process.argv.slice(2);
      if (args.includes('--version')) { console.log('9.9.9'); process.exit(0); }
      console.log(JSON.stringify(${JSON.stringify(agents)}, null, 2));
    `);

    if (process.platform === 'win32') {
      const cmd = path.join(dir, 'fake-opencode.cmd');
      fs.writeFileSync(cmd, `@echo off\r\nnode "${script}" %*\r\n`);
      return cmd;
    }

    const shim = path.join(dir, 'fake-opencode');
    fs.writeFileSync(shim, `#!/bin/sh\nexec node "${script}" "$@"\n`, { mode: 0o755 });
    return shim;
  }

  test('fails when the runtime did not load an agent that exists on disk', () => {
    const loaded = AGENT_FILES
      .filter((file) => file !== 'cybersec.md')
      .map((file) => ({ id: file.replace(/\.md$/, ''), mode: 'subagent' }));
    const bin = writeFakeOpencode(loaded);

    const output = sandbox.run('doctor --deep --json', { AIOX_OPENCODE_BIN: bin });
    const data = readJson(output);

    expect(data.ok).toBe(false);
    expect(data.checks.some((check) => check.status === 'fail' && check.label.includes('cybersec'))).toBe(true);
  });

  test('passes when the runtime loaded everything', () => {
    const loaded = AGENT_FILES.map((file) => ({
      id: file.replace(/\.md$/, ''),
      mode: 'subagent',
      permissions: [{ action: '*', resource: '*', effect: 'allow' }],
    }));
    const bin = writeFakeOpencode(loaded);

    const output = sandbox.run('doctor --deep --json', { AIOX_OPENCODE_BIN: bin });
    const data = readJson(output);

    expect(data.ok).toBe(true);
    expect(data.checks.some((check) => check.label.includes('loaded all 13 AIOX agents'))).toBe(true);
    expect(data.checks.some((check) => check.label.includes('OpenCode runtime 9.9.9'))).toBe(true);
  });

  test('does not fail on log errors older than the last install', () => {
    const logDir = path.join(sandbox.home, 'old-log');
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(
      path.join(logDir, 'opencode.log'),
      'timestamp=2020-01-01T00:00:00.000Z level=WARN message="failed to load plugin"\n'
    );

    const loaded = AGENT_FILES.map((file) => ({ id: file.replace(/\.md$/, '') }));
    const bin = writeFakeOpencode(loaded);

    const output = sandbox.run('doctor --deep --json', {
      AIOX_OPENCODE_BIN: bin,
      OPENCODE_LOG_DIR: logDir,
    });
    const data = readJson(output);

    expect(data.ok).toBe(true);
    expect(data.checks.some((check) => check.label.includes('older line(s)'))).toBe(true);
  });
});
