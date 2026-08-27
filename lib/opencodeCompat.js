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
function resolveOpencodeDir() {
  const candidates = [];

  if (process.env.OPENCODE_CONFIG_DIR) {
    candidates.push(path.resolve(process.env.OPENCODE_CONFIG_DIR));
  }

  if (process.env.XDG_CONFIG_HOME) {
    candidates.push(path.join(process.env.XDG_CONFIG_HOME, 'opencode'));
  }

  if (os.platform() === 'win32') {
    if (process.env.APPDATA) {
      candidates.push(path.join(process.env.APPDATA, 'opencode'));
    }
    candidates.push(path.join(os.homedir(), '.config', 'opencode'));
    if (process.env.LOCALAPPDATA) {
      candidates.push(path.join(process.env.LOCALAPPDATA, 'opencode'));
    }
  } else {
    candidates.push(path.join(os.homedir(), '.config', 'opencode'));
  }

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }

  return candidates[0] || path.join(os.homedir(), '.config', 'opencode');
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

module.exports = {
  V1_TO_V2_ACTION,
  V2_TO_V1_ACTION,
  convertV1ToV2,
  convertV2ToV1,
  resolveOpencodeDir,
  parsePermissionObject,
  parsePermissionsArray,
  dedupPermissionsArray,
};
