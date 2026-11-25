/**
 * Installed-state inspection.
 *
 * Everything here is read-only and synchronous: `status`, `init --dry-run`
 * and `restore` need to answer "what is installed and does it match the
 * package?" without touching the network or the OpenCode runtime.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function hashFile(filePath) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Compare each packaged agent with the copy in the OpenCode agents directory.
 *
 * `manifest` maps agent file -> hash as it was written by `init`. It is what
 * separates "the package moved on" (outdated) from "the user edited this"
 * (modified): the hash alone cannot tell those apart.
 *
 * state: 'equal' | 'outdated' | 'modified' | 'differs' | 'missing' | 'unreadable'
 */
function compareAgents(packageAgentsDir, installedAgentsDir, agentFiles, manifest = null) {
  return agentFiles.map((file) => {
    const pkgPath = path.join(packageAgentsDir, file);
    const installedPath = path.join(installedAgentsDir, file);
    const name = file.replace(/\.md$/, '');
    const pkgHash = hashFile(pkgPath);
    const installedHash = hashFile(installedPath);

    if (!pkgHash) return { name, file, state: 'unreadable', hash: null, reason: 'not in package' };
    if (!installedHash) return { name, file, state: 'missing', hash: pkgHash };
    if (pkgHash === installedHash) return { name, file, state: 'equal', hash: pkgHash };

    const installedAtInstall = manifest && manifest[file];
    if (installedAtInstall && installedAtInstall === installedHash) {
      return { name, file, state: 'outdated', hash: installedHash, packageHash: pkgHash };
    }
    if (installedAtInstall) {
      return { name, file, state: 'modified', hash: installedHash, packageHash: pkgHash };
    }
    return { name, file, state: 'differs', hash: installedHash, packageHash: pkgHash };
  });
}

/** Agents in the directory that the package does not ship (user's own). */
function listExtraAgents(installedAgentsDir, agentFiles) {
  if (!fs.existsSync(installedAgentsDir)) return [];
  const known = new Set(agentFiles);
  return fs
    .readdirSync(installedAgentsDir)
    .filter((f) => f.endsWith('.md') && !known.has(f))
    .map((f) => f.replace(/\.md$/, ''));
}

/**
 * Describe the OpenCode config without judging it: V2 uses `agents` /
 * `permissions` / `mcp.servers`, V1 uses flat `agent` / `mcp`.
 */
function describeConfig(configPath) {
  const result = {
    path: configPath,
    exists: fs.existsSync(configPath),
    valid: false,
    shape: 'none',
    defaultAgent: null,
    mcp: [],
    plugins: [],
    agentEntries: [],
    error: null,
  };

  if (!result.exists) return result;

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    result.error = error.message;
    return result;
  }

  result.valid = true;

  if (config.mcp && typeof config.mcp === 'object') {
    result.shape = config.mcp.servers && typeof config.mcp.servers === 'object' ? 'v2' : 'v1';
  }
  if (config.agents || config.permissions) result.shape = 'v2';
  else if ((config.agent || config.permission) && result.shape === 'none') result.shape = 'v1';

  const mcpBlock = (config.mcp && config.mcp.servers) || config.mcp || {};
  result.mcp = Object.keys(mcpBlock).filter((k) => k !== 'servers').sort();

  const plugins = config.plugin || config.plugins || [];
  result.plugins = (Array.isArray(plugins) ? plugins : []).map((p) => (Array.isArray(p) ? p[0] : String(p)));

  const agentBlock = config.agents || config.agent || {};
  if (agentBlock && typeof agentBlock === 'object') result.agentEntries = Object.keys(agentBlock).sort();

  result.defaultAgent =
    config.default_agent || config.defaultAgent || (config.default && config.default.agent) || null;

  return result;
}

function pluginInstalled(configDir) {
  const dir = path.join(configDir, 'plugins', 'aiox-update', 'index.js');
  const legacy = path.join(configDir, 'plugins', 'aiox-update.js');
  return {
    installed: fs.existsSync(dir) || fs.existsSync(legacy),
    format: fs.existsSync(dir) ? 'directory (v2)' : fs.existsSync(legacy) ? 'single file (v1)' : 'none',
    path: fs.existsSync(dir) ? path.dirname(dir) : legacy,
  };
}

function createBackup(agentsDir, backupRoot, stamp = new Date()) {
  const id = stamp.toISOString().replace(/[:.]/g, '-').replace('Z', '');
  const target = path.join(backupRoot, id);
  fs.mkdirSync(target, { recursive: true });

  let count = 0;
  if (fs.existsSync(agentsDir)) {
    fs.readdirSync(agentsDir)
      .filter((f) => f.endsWith('.md'))
      .forEach((file) => {
        fs.copyFileSync(path.join(agentsDir, file), path.join(target, file));
        count++;
      });
  }

  fs.writeFileSync(
    path.join(target, 'backup.json'),
    JSON.stringify({ id, createdAt: stamp.toISOString(), agentsDir, agents: count }, null, 2)
  );

  return { id, dir: target, agents: count };
}

function listBackups(backupRoot) {
  if (!fs.existsSync(backupRoot)) return [];
  return fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(backupRoot, entry.name);
      let meta = null;
      try {
        meta = JSON.parse(fs.readFileSync(path.join(dir, 'backup.json'), 'utf8'));
      } catch {
        // Backups written by hand or truncated still show up, just without metadata.
      }
      return {
        id: entry.name,
        dir,
        createdAt: meta ? meta.createdAt : null,
        agents: meta ? meta.agents : null,
        files: fs.readdirSync(dir).filter((f) => f.endsWith('.md')).length,
      };
    })
    .sort((a, b) => (a.id < b.id ? 1 : -1));
}

function restoreBackup(agentsDir, backup) {
  if (!fs.existsSync(backup.dir)) throw new Error(`Backup not found: ${backup.dir}`);
  fs.mkdirSync(agentsDir, { recursive: true });

  const files = fs.readdirSync(backup.dir).filter((f) => f.endsWith('.md'));
  files.forEach((file) => fs.copyFileSync(path.join(backup.dir, file), path.join(agentsDir, file)));

  return { restored: files.map((f) => f.replace(/\.md$/, '')), dir: backup.dir };
}

module.exports = {
  hashFile,
  compareAgents,
  listExtraAgents,
  describeConfig,
  pluginInstalled,
  createBackup,
  listBackups,
  restoreBackup,
};
