const fs = require('fs');
const path = require('path');

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

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentObject = null;

  for (const line of lines) {
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

    const body = content.replace(/^---\n[\s\S]*?\n---/, '').trim();
    if (body.length < 50) {
      console.warn(`  Warning: Agent content is very short (${body.length} chars)`);
      warnings++;
    }

    if (!frontmatter.permission) {
      console.warn(`  Warning: No permission section defined`);
      warnings++;
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
