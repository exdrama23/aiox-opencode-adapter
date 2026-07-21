#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const REQUIRED_FIELDS = ['description', 'mode'];
const VALID_MODES = ['primary', 'subagent'];

// Parse YAML frontmatter (improved to handle nested objects)
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentObject = null;

  for (const line of lines) {
    // Check if it's a nested property (starts with spaces)
    const nestedMatch = line.match(/^  (\w+):\s*(.*)/);
    if (nestedMatch && currentKey) {
      const nestedKey = nestedMatch[1];
      let nestedValue = nestedMatch[2].trim();

      // Remove quotes
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

    // Regular key-value pair
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // If value is empty, it might be a nested object
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

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!frontmatter[field]) {
        console.error(`  Error: Missing required field: ${field}`);
        errors++;
      }
    }

    // Check mode
    if (frontmatter.mode && !VALID_MODES.includes(frontmatter.mode)) {
      console.error(`  Error: Invalid mode: ${frontmatter.mode}. Must be: ${VALID_MODES.join(', ')}`);
      errors++;
    }

    // Check description length
    if (frontmatter.description && frontmatter.description.length < 10) {
      console.warn(`  Warning: Description is too short (${frontmatter.description.length} chars)`);
      warnings++;
    }

    // Check body content
    const body = content.replace(/^---\n[\s\S]*?\n---/, '').trim();
    if (body.length < 50) {
      console.warn(`  Warning: Agent content is very short (${body.length} chars)`);
      warnings++;
    }

    // Check for permissions
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

// Run if called directly
if (require.main === module) {
  validateAgents();
}

module.exports = { validateAgents, parseFrontmatter };
