const fs = require('fs');
const path = require('path');

let compat = null;
try {
  compat = require('../lib/opencodeCompat');
} catch {
  // fallback if lib not available
  compat = {
    convertV1ToV2: () => [],
    convertV2ToV1: () => ({}),
    parsePermissionObject: () => null,
    parsePermissionsArray: () => null,
    dedupPermissionsArray: (a) => a,
    V1_TO_V2_ACTION: {},
  };
}

const { convertV1ToV2, parsePermissionObject, parsePermissionsArray, dedupPermissionsArray } = compat;

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const REQUIRED_FIELDS = ['description', 'mode'];
const VALID_MODES = ['primary', 'subagent'];

// Agent name mapping (filename -> expected name in description)
const AGENT_NAMES = {
  'aiox-master.md': 'Orion',
  'dev.md': 'Dex',
  'architect.md': 'Aria',
  'sm.md': 'River',
  'pm.md': 'Morgan',
  'po.md': 'Pax',
  'qa.md': 'Quinn',
  'analyst.md': 'Atlas',
  'devops.md': 'Gage',
  'data-engineer.md': 'Dara',
  'ux-design-expert.md': 'Uma',
  'squad-creator.md': 'Craft',
  'cybersec.md': 'Kira'
};

// Expected modes for agents
const AGENT_MODES = {
  'aiox-master.md': 'primary',
  'cybersec.md': 'primary'
};

// Expected colors for agents
const AGENT_COLORS = {
  'aiox-master.md': '#9C27B0',
  'dev.md': '#4CAF50',
  'architect.md': '#2196F3',
  'sm.md': '#00BCD4',
  'pm.md': '#FF9800',
  'po.md': '#FF5722',
  'qa.md': '#E91E63',
  'analyst.md': '#607D8B',
  'devops.md': '#795548',
  'data-engineer.md': '#3F51B5',
  'ux-design-expert.md': '#FF4081',
  'squad-creator.md': '#009688',
  'cybersec.md': '#ff0000'
};

const VALID_V2_ACTIONS = ['shell', 'subagent', 'edit', 'read', 'glob', 'grep', 'skill', 'webfetch', 'websearch', 'hexstrike_*', 'pentest-mcp_*'];

function isValidV2Action(action) {
  if (VALID_V2_ACTIONS.includes(action)) return true;
  if (action.startsWith('hexstrike_')) return true;
  if (action.startsWith('pentest-mcp_')) return true;
  return false;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yaml = match[1];
  const frontmatter = {};
  const lines = yaml.split(/\r?\n/);
  let currentKey = null;
  let currentObject = null;

  for (const line of lines) {
    // Skip permissions array lines if inside permissions block - we handle permissions separately via compat parser
    // Detect if we are inside permissions block to avoid mixing
    // But for generic frontmatter, we still want to capture simple keys like description, mode, color, etc.
    const trimmed = line.trim();
    if (trimmed.startsWith('- action:')) {
      // This is part of permissions array, skip generic parsing
      continue;
    }
    if (trimmed.startsWith('resource:') || trimmed.startsWith('effect:')) {
      continue;
    }

    const nestedMatch = line.match(/^  (\w+):\s*(.*)/);
    if (nestedMatch && currentKey) {
      const nestedKey = nestedMatch[1];
      let nestedValue = nestedMatch[2].trim();

      if ((nestedValue.startsWith('"') && nestedValue.endsWith('"')) ||
          (nestedValue.startsWith("'") && nestedValue.endsWith("'"))) {
        nestedValue = nestedValue.slice(1, -1);
      }

      if (!currentObject) {
        currentObject = {};
      }
      currentObject[nestedKey] = nestedValue;
      frontmatter[currentKey] = currentObject;
      continue;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Skip empty permission/permissions keys - they will be filled via compat parsers
      if ((key === 'permission' || key === 'permissions') && value === '') {
        currentKey = key;
        currentObject = null;
        // Initialize placeholder; actual detailed parsing will overwrite
        frontmatter[key] = '';
        continue;
      }

      if (value === '') {
        currentKey = key;
        currentObject = null;
      } else {
        currentKey = null;
        currentObject = null;
      }

      frontmatter[key] = value;
    }
  }

  // Now use compat parsers for detailed permission/permissions
  let permV1 = null;
  let permsV2 = null;
  try {
    permV1 = parsePermissionObject(yaml);
  } catch {}
  try {
    permsV2 = parsePermissionsArray(yaml);
  } catch {}

  // Normalize aliases for V1 if shell/subagent found outside perm block? already handled
  if (permV1) frontmatter.permission = permV1;
  if (permsV2) frontmatter.permissions = permsV2;

  // If only one exists, generate the other for validation purposes? But keep original detection for divergence check
  // We keep both if present, otherwise generate virtual for divergence warning?
  // For agents that only have V1, we still want frontmatter.permissions to be available for later checks, but not as explicit
  // So if one is missing, generate via conversion for internal consistency check but track explicitness
  frontmatter._explicitPermission = !!permV1;
  frontmatter._explicitPermissions = !!permsV2;

  if (permV1 && !permsV2) {
    try {
      frontmatter.permissions = convertV1ToV2(permV1);
    } catch {}
  } else if (!permV1 && permsV2) {
    // keep permissions as is, permission will be derived but not considered explicit
  }

  return frontmatter;
}

function validateAgents() {
  console.log('Validating AIOX agents...\n');

  if (!fs.existsSync(AGENTS_DIR)) {
    console.error('Error: Agents directory not found:', AGENTS_DIR);
    process.exit(1);
  }

  const agentFiles = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));

  if (agentFiles.length === 0) {
    console.error('Error: No agent files found');
    process.exit(1);
  }

  let errors = 0;
  let warnings = 0;
  let valid = 0;

  for (const agentFile of agentFiles) {
    const agentPath = path.join(AGENTS_DIR, agentFile);
    const content = fs.readFileSync(agentPath, 'utf8');
    const frontmatter = parseFrontmatter(content);

    console.log(`Checking: ${agentFile}`);

    if (!frontmatter) {
      console.error(`  Error: No valid frontmatter found`);
      errors++;
      continue;
    }

    for (const field of REQUIRED_FIELDS) {
      if (!frontmatter[field]) {
        console.error(`  Error: Missing required field: ${field}`);
        errors++;
      }
    }

    if (frontmatter.mode && !VALID_MODES.includes(frontmatter.mode)) {
      console.error(`  Error: Invalid mode: ${frontmatter.mode}. Must be: ${VALID_MODES.join(', ')}`);
      errors++;
    }

    // Check agent name
    const expectedName = AGENT_NAMES[agentFile];
    if (expectedName && frontmatter.description) {
      if (!frontmatter.description.includes(expectedName)) {
        console.warn(`  Warning: Agent name "${expectedName}" not found in description`);
        warnings++;
      }
    }

    // Check expected mode
    const expectedMode = AGENT_MODES[agentFile];
    if (expectedMode && frontmatter.mode !== expectedMode) {
      console.error(`  Error: Expected mode "${expectedMode}" but found "${frontmatter.mode}"`);
      errors++;
    }

    // Check color
    const expectedColor = AGENT_COLORS[agentFile];
    if (expectedColor && frontmatter.color) {
      if (frontmatter.color.toLowerCase() !== expectedColor.toLowerCase()) {
        console.warn(`  Warning: Expected color "${expectedColor}" but found "${frontmatter.color}"`);
        warnings++;
      }
    }

    if (frontmatter.description && frontmatter.description.length < 10) {
      console.warn(`  Warning: Description is too short (${frontmatter.description.length} chars)`);
      warnings++;
    }

    const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').trim();
    if (body.length < 50) {
      console.warn(`  Warning: Agent content is very short (${body.length} chars)`);
      warnings++;
    }

    const hasPermission = !!frontmatter.permission && frontmatter._explicitPermission;
    const hasPermissions = !!frontmatter.permissions && frontmatter._explicitPermissions;

    // Check if neither permission nor permissions defined
    if (!frontmatter.permission && !frontmatter.permissions) {
      console.warn(`  Warning: No permission section defined`);
      warnings++;
    } else {
      // Validate V1 permission if explicit
      if (hasPermission) {
        // Basic V1 validation: ensure it's an object
        if (typeof frontmatter.permission !== 'object' || Array.isArray(frontmatter.permission)) {
          console.error(`  Error: permission should be an object`);
          errors++;
        }
      }
      // Validate V2 permissions if explicit
      if (hasPermissions) {
        const perms = frontmatter.permissions;
        if (!Array.isArray(perms)) {
          console.error(`  Error: permissions should be an array`);
          errors++;
        } else {
          for (const p of perms) {
            if (!p.action || !p.resource || !p.effect) {
              console.error(`  Error: Invalid permission entry missing action/resource/effect: ${JSON.stringify(p)}`);
              errors++;
              continue;
            }
            if (!isValidV2Action(p.action)) {
              console.error(`  Error: Invalid V2 action "${p.action}". Valid: ${VALID_V2_ACTIONS.join(', ')}, hexstrike_*, pentest-mcp_*`);
              errors++;
            }
            if (!['allow', 'deny', 'ask'].includes(p.effect)) {
              console.warn(`  Warning: Unexpected effect "${p.effect}" (expected allow/deny/ask)`);
              warnings++;
            }
          }
          // Check deduplication
          const seen = new Set();
          for (const p of perms) {
            const key = `${p.action}:${p.resource}`;
            if (seen.has(key)) {
              console.warn(`  Warning: Duplicate permission entry for ${key}`);
              warnings++;
            }
            seen.add(key);
          }
        }
      }

      // Validate divergence if both explicit
      if (hasPermission && hasPermissions) {
        try {
          const expectedV2 = convertV1ToV2(frontmatter.permission);
          const actualV2 = dedupPermissionsArray ? dedupPermissionsArray(frontmatter.permissions) : frontmatter.permissions;
          const expectedSet = new Set(expectedV2.map(p => `${p.action}:${p.resource}:${p.effect}`));
          const actualSet = new Set(actualV2.map(p => `${p.action}:${p.resource}:${p.effect}`));
          let diverge = false;
          if (expectedSet.size !== actualSet.size) diverge = true;
          else {
            for (const k of expectedSet) {
              if (!actualSet.has(k)) { diverge = true; break; }
            }
          }
          if (diverge) {
            console.warn(`  Warning: permission and permissions diverge (V2 wins). Consider synchronizing.`);
            warnings++;
          }
        } catch (e) {
          // ignore conversion errors
        }
      }

      // Also validate V2 actions for generated permissions even if not explicit? ensure they are valid
      if (frontmatter.permissions && !hasPermissions) {
        // This is generated from V1, validate its actions
        for (const p of frontmatter.permissions) {
          if (!isValidV2Action(p.action)) {
            console.error(`  Error: Generated V2 action invalid "${p.action}"`);
            errors++;
          }
        }
      }
    }

    console.log(`  OK`);
    valid++;
  }

  console.log('\n--- Validation Summary ---');
  console.log(`Valid agents: ${valid}/${agentFiles.length}`);
  console.log(`Errors: ${errors}`);
  console.log(`Warnings: ${warnings}`);

  if (errors > 0) {
    console.error('\nValidation failed with errors!');
    process.exit(1);
  } else {
    console.log('\nValidation passed!');
    process.exit(0);
  }
}

if (require.main === module) {
  validateAgents();
}

module.exports = { validateAgents, parseFrontmatter };
