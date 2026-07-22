const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CLI_PATH = path.join(__dirname, '..', 'bin', 'aiox-global.js');
const OPENCODE_DIR = path.join(os.homedir(), '.config', 'opencode');
const OPENCODE_AGENTS_DIR = path.join(OPENCODE_DIR, 'agents');
const OPENCODE_CONFIG = path.join(OPENCODE_DIR, 'opencode.json');
const CUSTOM_DIR = path.join(OPENCODE_DIR, 'custom');

// Helper to run CLI commands
function run(command = '') {
  try {
    return execSync(`node "${CLI_PATH}" ${command}`, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 10000,
    });
  } catch (error) {
    return error.stdout || error.message;
  }
}

// Helper to clean up all AIOX agents
function cleanup() {
  const AGENTS = [
    'dev.md', 'architect.md', 'sm.md', 'pm.md', 'po.md', 'qa.md',
    'analyst.md', 'devops.md', 'data-engineer.md', 'ux-design-expert.md',
    'squad-creator.md', 'cybersec.md',
  ];
  AGENTS.forEach(agent => {
    const agentPath = path.join(OPENCODE_AGENTS_DIR, agent);
    if (fs.existsSync(agentPath)) {
      fs.unlinkSync(agentPath);
    }
  });

  // Remove custom directory
  if (fs.existsSync(CUSTOM_DIR)) {
    fs.rmSync(CUSTOM_DIR, { recursive: true, force: true });
  }
}

describe('AIOX Integration Tests', () => {
  beforeAll(() => {
    // Ensure directories exist
    if (!fs.existsSync(OPENCODE_AGENTS_DIR)) {
      fs.mkdirSync(OPENCODE_AGENTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(CUSTOM_DIR)) {
      fs.mkdirSync(CUSTOM_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    cleanup();
  });

  describe('Full Installation Flow', () => {
    test('should complete full installation without errors', () => {
      // Step 1: Init
      const initOutput = run('init');
      expect(initOutput).toContain('Installing AIOX agents');
      expect(initOutput).toMatch(/✓|Installed/);

      // Step 2: Config
      const configOutput = run('config');
      expect(configOutput).toContain('Generating OpenCode config');
      expect(configOutput).toMatch(/✓|Config written/);

      // Step 3: List
      const listOutput = run('list');
      expect(listOutput).toContain('Installed AIOX agents');
    });

    test('should have all required files after installation', () => {
      // Ensure agents are installed first
      run('init');
      
      const requiredFiles = [
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

      requiredFiles.forEach(file => {
        const agentPath = path.join(OPENCODE_AGENTS_DIR, file);
        expect(fs.existsSync(agentPath)).toBe(true);
      });
    });
  });

  describe('Preset System', () => {
    beforeEach(() => {
      cleanup();
    });

    test('should apply dev preset correctly', () => {
      const output = run('preset dev');
      expect(output).toContain('Applying preset:');
      expect(output).toContain('Developer');
      expect(output).toMatch(/✓|Installed/);

      // Verify preset agents are installed
      const presetAgents = ['dev.md', 'architect.md', 'qa.md', 'devops.md'];
      presetAgents.forEach(agent => {
        const agentPath = path.join(OPENCODE_AGENTS_DIR, agent);
        expect(fs.existsSync(agentPath)).toBe(true);
      });
    });

    test('should apply pentest preset correctly', () => {
      const output = run('preset pentest');
      expect(output).toContain('Applying preset:');
      expect(output).toContain('Pentester');

      // Verify preset agents are installed
      const presetAgents = ['cybersec.md', 'dev.md', 'devops.md'];
      presetAgents.forEach(agent => {
        const agentPath = path.join(OPENCODE_AGENTS_DIR, agent);
        expect(fs.existsSync(agentPath)).toBe(true);
      });
    });

    test('should apply minimal preset correctly', () => {
      const output = run('preset minimal');
      expect(output).toContain('Applying preset:');
      expect(output).toContain('Minimal');

      // Verify preset agents are installed
      const presetAgents = ['dev.md', 'qa.md'];
      presetAgents.forEach(agent => {
        const agentPath = path.join(OPENCODE_AGENTS_DIR, agent);
        expect(fs.existsSync(agentPath)).toBe(true);
      });
    });
  });

  describe('Customize System', () => {
    test('should copy agent to custom directory', () => {
      const output = run('customize dev');
      expect(output).toContain('ready for customization');
      expect(output).toContain('Custom file:');

      // Verify custom agent exists
      const customAgentPath = path.join(CUSTOM_DIR, 'dev.md');
      expect(fs.existsSync(customAgentPath)).toBe(true);
    });

    test('should preserve custom agents during update', () => {
      // Create a custom agent
      const customAgentContent = `---
description: "Custom Test Agent"
mode: subagent
---

This is a custom test agent.
`;
      const customAgentPath = path.join(CUSTOM_DIR, 'custom-test.md');
      fs.writeFileSync(customAgentPath, customAgentContent);

      // Run init (simulates update)
      const output = run('init');
      expect(output).toContain('Installing AIOX agents');

      // Verify custom agent still exists
      expect(fs.existsSync(customAgentPath)).toBe(true);
    });
  });

  describe('Agent Validation', () => {
    test('should validate all installed agents', () => {
      const output = run('validate');
      expect(output).toMatch(/Validating|valid|passed|agents/);
    });

    test('should have correct frontmatter in all agents', () => {
      // Only check the known AIOX agents
      const aioxAgents = [
        'dev.md', 'architect.md', 'sm.md', 'pm.md', 'po.md', 'qa.md',
        'analyst.md', 'devops.md', 'data-engineer.md', 'ux-design-expert.md',
        'squad-creator.md', 'cybersec.md',
      ];

      aioxAgents.forEach(agent => {
        const agentPath = path.join(OPENCODE_AGENTS_DIR, agent);
        if (!fs.existsSync(agentPath)) return;

        const content = fs.readFileSync(agentPath, 'utf8');

        // Check for frontmatter
        expect(content).toMatch(/^---\n/);
        expect(content).toContain('description:');
        expect(content).toContain('mode:');
        expect(content).toContain('permission:');
      });
    });
  });

  describe('Doctor Command', () => {
    test('should detect installation status correctly', () => {
      const output = run('doctor');
      expect(output).toContain('Checking AIOX global installation');
      expect(output).toContain('Node.js');
      expect(output).toMatch(/Config directory|agents installed/);
    });

    test('should detect MCP status', () => {
      const output = run('doctor');
      // Should mention MCP status (either found or not found)
      expect(output).toMatch(/HexStrike|Pentest MCP/);
    });
  });

  describe('Update Flow', () => {
    test('should handle update gracefully', () => {
      const output = run('update');
      // Should either update or say already on latest
      expect(output).toMatch(/Checking for updates|already on the latest/);
    });
  });

  describe('Uninstall Flow', () => {
    test('should uninstall all AIOX agents', () => {
      const output = run('uninstall');
      expect(output).toContain('Removing AIOX agents');
      expect(output).toMatch(/✓|Removed/);

      // Verify AIOX agents are removed
      const aioxAgents = ['dev.md', 'architect.md', 'cybersec.md'];
      aioxAgents.forEach(agent => {
        const agentPath = path.join(OPENCODE_AGENTS_DIR, agent);
        expect(fs.existsSync(agentPath)).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle missing agent gracefully', () => {
      const output = run('customize nonexistent');
      expect(output).toContain('Agent not found');
      expect(output).toContain('Available agents');
    });

    test('should handle missing preset gracefully', () => {
      const output = run('preset nonexistent');
      expect(output).toContain('Preset not found');
      expect(output).toContain('Available presets');
    });

    test('should handle unknown command gracefully', () => {
      const output = run('unknown-command');
      expect(output).toMatch(/Unknown command|error/i);
    });
  });

  describe('Auto-Setup Command', () => {
    test('should complete full auto-setup without errors', () => {
      const output = run('auto-setup');
      expect(output).toContain('AIOX Auto-Setup');
      expect(output).toContain('Step 1/3');
      expect(output).toContain('Step 2/3');
      expect(output).toContain('Step 3/3');
      expect(output).toContain('Auto-setup complete');
    });

    test('should install agents during auto-setup', () => {
      run('auto-setup');
      
      // Verify agents are installed
      const agents = fs.readdirSync(OPENCODE_AGENTS_DIR).filter(f => f.endsWith('.md'));
      expect(agents.length).toBeGreaterThan(0);
    });
  });
});
