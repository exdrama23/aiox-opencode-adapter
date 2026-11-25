const fs = require('fs');
const path = require('path');
const os = require('os');

const V1_TO_V2_ACTION = {
  bash: 'shell',
  task: 'subagent',
  write: 'edit',
  patch: 'edit',
};

const V2_TO_V1_ACTION = {
  shell: 'bash',
  subagent: 'task',
};

function dedupPermissionsArray(perms) {
  const seen = new Map();
  const result = [];
  for (const p of perms) {
    const key = `${p.action}:${p.resource}`;
    if (!seen.has(key)) {
      seen.set(key, true);
      result.push({ action: p.action, resource: p.resource, effect: p.effect });
    }
  }
  return result;
}

/**
 * Convert V1 permission object to V2 permissions array
 * @param {object} permV1 - V1 permission object e.g., {edit:"allow", bash:{"nmap *":"allow"}}
 * @returns {Array<{action:string,resource:string,effect:string}>}
 */
function convertV1ToV2(permV1) {
  if (!permV1 || typeof permV1 !== 'object') return [];
  const perms = [];

  for (const [key, value] of Object.entries(permV1)) {
    const v2Action = V1_TO_V2_ACTION[key] || key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Object-type permission like bash: { "*": "ask", "nmap *": "allow" }
      for (const [resource, effect] of Object.entries(value)) {
        perms.push({ action: v2Action, resource, effect: String(effect) });
      }
    } else {
      // Scalar permission like edit: "allow"
      const effect = String(value);
      perms.push({ action: v2Action, resource: '*', effect });
    }
  }

  return dedupPermissionsArray(perms);
}

/**
 * Convert V2 permissions array to V1 permission object
 * @param {Array} permsV2 - array of {action,resource,effect}
 * @returns {object} V1 permission object
 */
function convertV2ToV1(permsV2) {
  if (!Array.isArray(permsV2)) return {};
  const permV1 = {};

  for (const entry of permsV2) {
    if (!entry || typeof entry !== 'object') continue;
    const action = entry.action;
    const resource = entry.resource != null ? String(entry.resource) : '*';
    const effect = entry.effect != null ? String(entry.effect) : 'allow';
    if (!action) continue;

    const v1Key = V2_TO_V1_ACTION[action] || action;

    // Object-type keys: bash and task (which come from shell/subagent)
    if (v1Key === 'bash' || v1Key === 'task') {
      if (!permV1[v1Key] || typeof permV1[v1Key] !== 'object') {
        permV1[v1Key] = {};
      }
      // deduplication: last wins
      permV1[v1Key][resource] = effect;
    } else {
      // Scalar permissions - if resource is "*", store as scalar; otherwise treat as object map
      if (resource === '*') {
        // If already an object (previous non-* entry), keep object form
        if (permV1[v1Key] && typeof permV1[v1Key] === 'object') {
          permV1[v1Key][resource] = effect;
        } else {
          permV1[v1Key] = effect;
        }
      } else {
        // non-* resource for scalar types -> store as object
        if (!permV1[v1Key] || typeof permV1[v1Key] === 'string') {
          const prev = permV1[v1Key];
          if (typeof prev === 'string') {
            permV1[v1Key] = { '*': prev };
          } else if (!permV1[v1Key]) {
            permV1[v1Key] = {};
          }
        }
        permV1[v1Key][resource] = effect;
      }
    }
  }

  return permV1;
}

/**
 * Resolve OpenCode config directory with priority:
 * OPENCODE_CONFIG_DIR > XDG_CONFIG_HOME/opencode > (win32: %APPDATA%/opencode > ~/.config/opencode > %LOCALAPPDATA%/opencode) > (linux/mac: ~/.config/opencode)
 * Returns first that exists, otherwise first candidate.
 */
function resolveOpencodeDir(options = {}) {
  // Injectable for tests: Jest replaces os.homedir() with a fixed value.
  const env = options.env || process.env;
  const homedir = options.homedir || os.homedir();
  const platform = options.platform || os.platform();
  const candidates = [];

  if (env.OPENCODE_CONFIG_DIR) {
    candidates.push(path.resolve(env.OPENCODE_CONFIG_DIR));
  }

  if (env.XDG_CONFIG_HOME) {
    candidates.push(path.join(env.XDG_CONFIG_HOME, 'opencode'));
  }

  if (platform === 'win32') {
    // OpenCode 2.x resolves its config from `$HOME/.config/opencode` on Windows
    // and ignores %APPDATA%. Putting APPDATA first installed agents into a
    // directory the runtime never reads.
    candidates.push(path.join(homedir, '.config', 'opencode'));
    if (env.APPDATA) {
      candidates.push(path.join(env.APPDATA, 'opencode'));
    }
    if (env.LOCALAPPDATA) {
      candidates.push(path.join(env.LOCALAPPDATA, 'opencode'));
    }
  } else {
    candidates.push(path.join(homedir, '.config', 'opencode'));
  }

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }

  // Nothing exists yet: create where OpenCode will look.
  return path.join(homedir, '.config', 'opencode');
}

/**
 * Parse V1 permission object from yaml string
 * @param {string} yaml - frontmatter yaml content
 * @returns {object|null} V1 permission object or null if not found
 */
function parsePermissionObject(yaml) {
  if (!yaml || typeof yaml !== 'string') return null;

  const lines = yaml.split(/\r?\n/);
  let inPermission = false;
  let permBaseIndent = null;
  let permission = null;
  let currentSubKey = null; // for bash/task blocks
  let subIndent = null;

  // Detect permission block (singular) - line exactly "permission:" at top level (no indent)
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!inPermission) {
      // Match "permission:" but NOT "permissions:"
      // Must be at column 0 or minimal indent, and not "permissions:"
      const permMatch = raw.match(/^(\s*)permission:\s*$/);
      if (permMatch) {
        // Ensure it's not permissions: check that next char after permission is colon and not s
        // Already matched, but double-check not permissions
        if (raw.match(/^\s*permissions:/)) continue;
        inPermission = true;
        permBaseIndent = permMatch[1].length;
        permission = {};
        continue;
      }
    } else {
      // Inside permission block - check if we exited (next top-level key with indent <= permBaseIndent and contains colon)
      if (trimmed === '' || trimmed.startsWith('#')) continue;
      const indent = raw.match(/^(\s*)/)[1].length;
      if (indent <= permBaseIndent) {
        // Check if it's a top-level key (e.g., "description:", "mode:", "permissions:", etc.)
        // Need to see if line contains colon
        if (raw.match(/^\s*\w+:/)) {
          break;
        }
      }

      // Inside permission block, keys are indented 2 spaces relative
      // Handle sub-objects like bash: / shell: / task: / subagent:
      const subObjMatch = raw.match(/^\s{2,}(bash|shell|task|subagent):\s*$/);
      if (subObjMatch) {
        currentSubKey = subObjMatch[1];
        subIndent = indent;
        if (!permission[currentSubKey]) permission[currentSubKey] = {};
        continue;
      }

      // Handle entries inside sub-object: e.g., '  "nmap *": allow' with 4+ spaces
      if (currentSubKey && indent > subIndent) {
        // Try to match quoted resource
        const kvQuoted = raw.match(/^\s+"(.+?)":\s*"(.+?)"\s*$/);
        const kvQuoted2 = raw.match(/^\s+"(.+?)":\s*(\w+)\s*$/);
        const kvSingleQuoted = raw.match(/^\s+'(.+?)':\s*'(.+?)'\s*$/);
        const kvBare = raw.match(/^\s+"(.+?)":\s*'(.+?)'\s*$/);
        let kv = null;
        if (kvQuoted) kv = [kvQuoted[1], kvQuoted[2]];
        else if (kvQuoted2) kv = [kvQuoted2[1], kvQuoted2[2]];
        else if (kvSingleQuoted) kv = [kvSingleQuoted[1], kvSingleQuoted[2]];
        if (kv) {
          permission[currentSubKey][kv[0]] = kv[1];
          continue;
        }
        // Also handle without quotes: nmap *: allow (rare)
        const kvNoQuote = raw.match(/^\s+(.+?):\s*(\w+)\s*$/);
        if (kvNoQuote) {
          let k = kvNoQuote[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
          let v = kvNoQuote[2].trim();
          // Only if we're inside a sub-object and key looks like bash pattern
          if (k && v) {
            permission[currentSubKey][k] = v;
            continue;
          }
        }
        continue;
      } else if (currentSubKey && indent <= subIndent) {
        // Exiting sub-object
        currentSubKey = null;
        subIndent = null;
      }

      // Handle scalar permission entries: e.g., "  edit: allow"
      const scalarMatch = raw.match(/^\s{2,}(\w[\w\-\*]*):\s*"?(\w+)"?\s*$/);
      if (scalarMatch) {
        const key = scalarMatch[1];
        const val = scalarMatch[2];
        // Only accept known scalar keys if not already sub-object
        // But allow any key including hexstrike_*, pentest-mcp_*, etc.
        // Ensure not inside sub-object
        if (!currentSubKey) {
          permission[key] = val;
        } else {
          // If we are inside sub-object but scalar matched, treat as sub entry?
          // But we already handled sub entries above
        }
        continue;
      }
    }
  }

  if (permission && Object.keys(permission).length > 0) {
    // Normalize aliases: shell -> bash, subagent -> task, but keep original? We'll map shell to bash if bash missing
    if (permission.shell && !permission.bash) {
      permission.bash = permission.shell;
      delete permission.shell;
    }
    if (permission.subagent && !permission.task) {
      permission.task = permission.subagent;
      delete permission.subagent;
    }
    // Normalize write/patch -> edit handled by caller, but also do here if edit missing
    // Keep write/patch for backward compat, but ensure edit exists if only write/patch present
    if (permission.write && !permission.edit) {
      permission.edit = permission.write;
    }
    if (permission.patch && !permission.edit) {
      permission.edit = permission.patch;
    }
    return permission;
  }
  return null;
}

/**
 * Parse V2 permissions array from yaml string
 * @param {string} yaml - frontmatter yaml content
 * @returns {Array|null} permissions array or null
 */
function parsePermissionsArray(yaml) {
  if (!yaml || typeof yaml !== 'string') return null;

  const lines = yaml.split(/\r?\n/);
  let inPermissions = false;
  let baseIndent = null;
  const perms = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    if (!inPermissions) {
      const permMatch = raw.match(/^(\s*)permissions:\s*$/);
      if (permMatch) {
        inPermissions = true;
        baseIndent = permMatch[1].length;
        continue;
      }
      // Also handle inline array case: permissions: []
      const inlineMatch = raw.match(/^\s*permissions:\s*\[(.*)\]\s*$/);
      if (inlineMatch) {
        const inner = inlineMatch[1].trim();
        if (!inner) return [];
        // Try to parse JSON-like?
        try {
          const parsed = JSON.parse('[' + inner + ']');
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        return null;
      }
      continue;
    } else {
      const trimmed = raw.trim();
      if (trimmed === '' || trimmed.startsWith('#')) continue;

      const indent = raw.match(/^(\s*)/)[1].length;
      // Exit if we encounter a top-level key (indent <= baseIndent and contains colon but not dash)
      if (indent <= baseIndent && raw.match(/^\s*\w+:\s*/) && !raw.trim().startsWith('-')) {
        break;
      }

      // Detect start of new entry: "- action: ..."
      const actionMatch = raw.match(/^\s*-\s*action:\s*"?([^"\r\n]+)"?\s*$/);
      if (actionMatch) {
        if (current) perms.push(current);
        current = { action: actionMatch[1].trim(), resource: '*', effect: 'allow' };
        continue;
      }

      // Handle resource/effect lines inside entry
      if (current) {
        const resMatch = raw.match(/^\s+resource:\s*"?(.+?)"?\s*$/);
        if (resMatch) {
          let r = resMatch[1].trim();
          // Remove trailing quotes if present
          r = r.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
          current.resource = r;
          continue;
        }
        const effMatch = raw.match(/^\s+effect:\s*"?(\w+)"?\s*$/);
        if (effMatch) {
          current.effect = effMatch[1].trim();
          continue;
        }
        // Also handle case where resource/effect are on same line? unlikely
      }

      // If line is not part of permissions and not indented enough, consider block ended
      // But we already handle top-level detection
    }
  }

  if (current) perms.push(current);

  if (perms.length > 0) {
    return dedupPermissionsArray(perms);
  }
  return null;
}

/**
 * Convert a V1 flat MCP map to the native V2 `mcp.servers` shape.
 * - enabled -> disabled (inverted)
 * - numeric timeout -> { catalog, execution }
 */
function convertMcpV1ToV2(mcpV1) {
  if (!mcpV1 || typeof mcpV1 !== 'object') return { servers: {} };

  const hasServers = mcpV1.servers && typeof mcpV1.servers === 'object';
  const source = hasServers ? mcpV1.servers : mcpV1;
  const servers = {};

  for (const [name, value] of Object.entries(source)) {
    if (name === 'servers' || name === 'timeout') continue;
    if (!value || typeof value !== 'object') continue;

    const cfg = safeClone(value);
    if ('enabled' in cfg) {
      cfg.disabled = !cfg.enabled;
      delete cfg.enabled;
    }
    if (typeof cfg.timeout === 'number') {
      cfg.timeout = { catalog: cfg.timeout, execution: cfg.timeout };
    }
    servers[name] = cfg;
  }

  const result = { servers };
  if (mcpV1.timeout && typeof mcpV1.timeout === 'object') {
    result.timeout = safeClone(mcpV1.timeout);
  }
  return result;
}

/**
 * Convert the native V2 `mcp.servers` shape back to the V1 flat map.
 * - disabled -> enabled (inverted)
 * - timeout object -> numeric (execution ?? catalog)
 */
function convertMcpV2ToV1(mcpV2) {
  if (!mcpV2 || typeof mcpV2 !== 'object') return {};

  const hasServers = mcpV2.servers && typeof mcpV2.servers === 'object';
  const source = hasServers ? mcpV2.servers : mcpV2;
  const result = {};

  for (const [name, value] of Object.entries(source)) {
    if (name === 'servers' || name === 'timeout') continue;
    if (!value || typeof value !== 'object') continue;

    const cfg = safeClone(value);
    if ('disabled' in cfg) {
      cfg.enabled = !cfg.disabled;
      delete cfg.disabled;
    }
    if (cfg.timeout && typeof cfg.timeout === 'object') {
      const timeout = cfg.timeout.execution ?? cfg.timeout.catalog;
      if (typeof timeout === 'number') cfg.timeout = timeout;
      else delete cfg.timeout;
    }
    result[name] = cfg;
  }

  return result;
}

/**
 * Normalize config.mcp to the native shape for the chosen compat mode.
 * Dual mode keeps whatever the user already has (mixed V1/V2 is allowed by OpenCode).
 */
function normalizeMcp(config, mode) {
  if (!config || typeof config !== 'object' || !config.mcp) return;
  if (mode === 'v2') {
    config.mcp = convertMcpV1ToV2(config.mcp);
  } else if (mode === 'v1') {
    config.mcp = convertMcpV2ToV1(config.mcp);
  }
}

/**
 * Convert V1 `plugin` entries to V2 `plugins`.
 * V1: ["pkg", ["./dir", {opts}]]  ->  V2: ["pkg", {package:"./dir", options:{opts}}]
 */
function convertPluginV1ToV2(plugin) {
  if (!Array.isArray(plugin)) return [];
  return plugin.map((entry) => {
    if (typeof entry === 'string') return entry;
    if (Array.isArray(entry) && typeof entry[0] === 'string') {
      if (entry.length > 1 && entry[1] && typeof entry[1] === 'object') {
        return { package: entry[0], options: entry[1] };
      }
      return entry[0];
    }
    return entry;
  }).filter(Boolean);
}

function convertPluginV2ToV1(plugins) {
  if (!Array.isArray(plugins)) return [];
  return plugins.map((entry) => {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object' && typeof entry.package === 'string') {
      return entry.options && typeof entry.options === 'object'
        ? [entry.package, entry.options]
        : entry.package;
    }
    return entry;
  }).filter(Boolean);
}

function normalizePlugins(config, mode) {
  if (!config || typeof config !== 'object') return;
  if (mode === 'v2') {
    if (config.plugin && !config.plugins) config.plugins = convertPluginV1ToV2(config.plugin);
    if (config.plugin) delete config.plugin;
  } else if (mode === 'v1') {
    if (config.plugins && !config.plugin) config.plugin = convertPluginV2ToV1(config.plugins);
    if (config.plugins) delete config.plugins;
  }
}

/**
 * The agent markdown file is the source of truth: OpenCode merges its
 * frontmatter permissions into the agent at load time. Writing the same rules
 * in opencode.json duplicates every entry (43 vs 30 for aiox-master), so drop
 * config-level permissions for agents that have an installed `.md` file.
 *
 * @param {object} config - parsed opencode.json
 * @param {string} agentsDir - directory containing the agent `.md` files
 * @returns {number} number of agents whose permissions were removed
 */
function dropRedundantAgentPermissions(config, agentsDir) {
  if (!config || typeof config !== 'object' || !agentsDir) return 0;
  if (!fs.existsSync(agentsDir)) return 0;

  let installed;
  try {
    installed = new Set(
      fs
        .readdirSync(agentsDir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => file.replace(/\.md$/, ''))
    );
  } catch {
    return 0;
  }

  let dropped = 0;
  for (const collection of [config.agent, config.agents]) {
    if (!collection || typeof collection !== 'object') continue;
    for (const name of Object.keys(collection)) {
      if (!installed.has(name)) continue;
      const entry = collection[name];
      if (!entry || typeof entry !== 'object') continue;
      if ('permission' in entry || 'permissions' in entry) dropped++;
      delete entry.permission;
      delete entry.permissions;
    }
  }
  return dropped;
}

function safeClone(obj) {
  if (typeof structuredClone === 'function') {
    try { return structuredClone(obj); } catch {}
  }
  return JSON.parse(JSON.stringify(obj));
}

function normalizeAgentV2(entry) {
  if (!entry || typeof entry !== 'object') return;

  // prompt -> system
  if (entry.prompt !== undefined && entry.system === undefined) entry.system = entry.prompt;
  delete entry.prompt;

  // disable -> disabled
  if (entry.disable !== undefined && entry.disabled === undefined) entry.disabled = entry.disable;
  delete entry.disable;

  // permission -> permissions
  if (entry.permission && !entry.permissions) entry.permissions = convertV1ToV2(entry.permission);
  delete entry.permission;

  // tools -> permissions entries (deny/allow)
  if (entry.tools && typeof entry.tools === 'object' && !Array.isArray(entry.tools)) {
    if (!entry.permissions) entry.permissions = [];
    for (const [action, enabled] of Object.entries(entry.tools)) {
      entry.permissions.push({
        action,
        resource: '*',
        effect: enabled ? 'allow' : 'deny',
      });
    }
    delete entry.tools;
  }

  // maxSteps -> steps
  if (entry.maxSteps !== undefined && entry.steps === undefined) entry.steps = entry.maxSteps;
  delete entry.maxSteps;

  // variant must live on the model reference in V2
  if (entry.variant !== undefined) {
    if (typeof entry.model === 'string' && !entry.model.includes('#')) {
      entry.model = `${entry.model}#${entry.variant}`;
    }
    delete entry.variant;
  }

  // V2 agent schema rejects these legacy fields
  delete entry.name;
  delete entry.temperature;
  delete entry.top_p;
  delete entry.options;
  delete entry.version;
}

function normalizeAgentV1(entry) {
  if (!entry || typeof entry !== 'object') return;

  if (entry.system !== undefined && entry.prompt === undefined) entry.prompt = entry.system;
  delete entry.system;

  if (entry.disabled !== undefined && entry.disable === undefined) entry.disable = entry.disabled;
  delete entry.disabled;

  if (entry.permissions && !entry.permission) entry.permission = convertV2ToV1(entry.permissions);
  delete entry.permissions;

  delete entry.request;
  delete entry.version;

  if (typeof entry.model === 'string' && entry.model.includes('#')) {
    const [model, variant] = entry.model.split('#');
    entry.model = model;
    if (entry.variant === undefined) entry.variant = variant;
  }
}

function stripV2Keys(config) {
  if (!config || typeof config !== 'object') return;
  // Top-level V2 collections
  if (config.agents) delete config.agents;
  if (config.permissions) delete config.permissions;
  if (config.plugins) delete config.plugins;
  if (config.agent && typeof config.agent === 'object') {
    for (const name of Object.keys(config.agent)) {
      normalizeAgentV1(config.agent[name]);
    }
  }
  normalizeMcp(config, 'v1');
  // Global V2 aliases
  if (config.system) delete config.system;
  if (config.disabled !== undefined) delete config.disabled;
}

function stripV1Keys(config) {
  if (!config || typeof config !== 'object') return;
  if (config.agent) delete config.agent;
  if (config.permission) delete config.permission;
  if (config.plugin) delete config.plugin;
  if (config.agents && typeof config.agents === 'object') {
    for (const name of Object.keys(config.agents)) {
      normalizeAgentV2(config.agents[name]);
    }
  }
  normalizeMcp(config, 'v2');
  normalizePlugins(config, 'v2');
  if (config.prompt) delete config.prompt;
  if (config.disable !== undefined) delete config.disable;
}

function detectCompatMode(argv) {
  const args = argv || process.argv.slice(2);
  // Explicit flags (hidden, power-user) take precedence, but normal user never needs them
  if (args.includes('--v2') || args.includes('--compat=v2') || args.includes('--compat=v2-only')) return 'v2';
  if (args.includes('--dual') || args.includes('--compat=dual') || args.includes('--compat=v1+v2')) return 'dual';
  if (args.includes('--v1') || args.includes('--compat=v1') || args.includes('--compat=v1-only')) return 'v1';
  if (process.env.AIOX_COMPAT === 'v2') return 'v2';
  if (process.env.AIOX_COMPAT === 'dual') return 'dual';
  if (process.env.AIOX_COMPAT === 'v1') return 'v1';

  // Fully automatic: detect installed opencode version
  try {
    const { execSync } = require('child_process');
    // Try opencode first (most common)
    for (const cmd of ['opencode --version', 'opencode2 --version']) {
      try {
        const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe', timeout: 3000 }).trim();
        const m = out.match(/(\d+)\.(\d+)\.(\d+)/);
        if (m) {
          const major = parseInt(m[1], 10);
          if (major >= 2) return 'v2';
          if (major === 1) return 'v1';
        }
      } catch {}
    }
  } catch {}

  // Fallback: inspect existing config file to mirror what user already has
  try {
    const cfgPath = path.join(resolveOpencodeDir(), 'opencode.json');
    if (fs.existsSync(cfgPath)) {
      const raw = fs.readFileSync(cfgPath, 'utf8');
      const hasAgents = raw.includes('"agents"') && raw.includes('"permissions"');
      const hasAgent = raw.includes('"agent"') && raw.includes('"permission"');
      // If config is clearly V2-only, stay V2; if mixed/dual, prefer V1-safe
      if (hasAgents && !hasAgent) return 'v2';
    }
  } catch {}

  // Default to v1 (strict schema, safe for all OpenCode V1 installations)
  return 'v1';
}

module.exports = {
  V1_TO_V2_ACTION,
  V2_TO_V1_ACTION,
  convertV1ToV2,
  convertV2ToV1,
  convertMcpV1ToV2,
  convertMcpV2ToV1,
  normalizeMcp,
  convertPluginV1ToV2,
  convertPluginV2ToV1,
  normalizePlugins,
  normalizeAgentV2,
  normalizeAgentV1,
  dropRedundantAgentPermissions,
  resolveOpencodeDir,
  parsePermissionObject,
  parsePermissionsArray,
  dedupPermissionsArray,
  safeClone,
  stripV2Keys,
  stripV1Keys,
  detectCompatMode,
};
