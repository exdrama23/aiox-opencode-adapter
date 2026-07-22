const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CLI_PATH = path.join(__dirname, '..', 'bin', 'aiox-global.js');
const OPENCODE_DIR = path.join(os.homedir(), '.config', 'opencode');
const OPENCODE_AGENTS_DIR = path.join(OPENCODE_DIR, 'agents');

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

describe('AIOX Global CLI', () => {
  describe('help command', () => {
    test('should display help when no command is provided', () => {
      const output = run();
      expect(output).toContain('aiox-global');
      expect(output).toContain('Commands:');
      expect(output).toContain('init');
      expect(output).toContain('config');
      expect(output).toContain('doctor');
      expect(output).toContain('list');
      expect(output).toContain('uninstall');
    });

    test('should display help for help command', () => {
      const output = run('help');
      expect(output).toContain('Commands:');
      expect(output).toContain('aiox-global init');
    });
  });

  describe('list command', () => {
    test('should list installed agents', () => {
      const output = run('list');
      // Should either list agents or show warning
      expect(output).toMatch(/@|No agents|agents installed/);
    });
  });

  describe('doctor command', () => {
    test('should check installation health', () => {
      const output = run('doctor');
      expect(output).toContain('Node.js');
      expect(output).toMatch(/Config directory|agents installed|not found/);
    });
  });

  describe('init command', () => {
    test('should install agents to opencode directory', () => {
      // Ensure agents directory exists
      if (!fs.existsSync(OPENCODE_AGENTS_DIR)) {
        fs.mkdirSync(OPENCODE_AGENTS_DIR, { recursive: true });
      }

      const output = run('init');
      expect(output).toContain('Installing AIOX agents');
      expect(output).toMatch(/✓|Installed/);
    });

    test('should have copied agent files', () => {
      const expectedAgents = [
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

      expectedAgents.forEach(agent => {
        const agentPath = path.join(OPENCODE_AGENTS_DIR, agent);
        expect(fs.existsSync(agentPath)).toBe(true);
      });
    });
  });

  describe('uninstall command', () => {
    test('should remove AIOX agents', () => {
      // Ensure agents are installed first
      run('init');
      const output = run('uninstall');
      expect(output).toContain('Removing AIOX agents');
      expect(output).toMatch(/✓|Removed/);
    });

    test('should have removed agent files', () => {
      const aioxAgents = [
        'dev.md',
        'architect.md',
        'cybersec.md',
      ];

      aioxAgents.forEach(agent => {
        const agentPath = path.join(OPENCODE_AGENTS_DIR, agent);
        expect(fs.existsSync(agentPath)).toBe(false);
      });
    });
  });

  describe('customize command', () => {
    test('should show usage when no agent specified', () => {
      const output = run('customize');
      expect(output).toContain('Usage:');
      expect(output).toContain('customize');
    });

    test('should show available agents when no agent specified', () => {
      const output = run('customize');
      expect(output).toContain('dev');
      expect(output).toContain('architect');
    });

    test('should copy agent to custom directory', () => {
      const customDir = path.join(OPENCODE_DIR, 'custom');
      if (!fs.existsSync(customDir)) {
        fs.mkdirSync(customDir, { recursive: true });
      }

      const output = run('customize dev');
      expect(output).toContain('ready for customization');
      expect(output).toContain('Custom file:');
    });
  });

  describe('preset command', () => {
    test('should list available presets when no preset specified', () => {
      const output = run('preset');
      expect(output).toContain('Available presets:');
      expect(output).toContain('dev');
      expect(output).toContain('pentest');
      expect(output).toContain('fullstack');
    });

    test('should apply preset and install agents', () => {
      const output = run('preset minimal');
      expect(output).toContain('Applying preset:');
      expect(output).toMatch(/✓|Installed/);
    });
  });

  describe('unknown command', () => {
    test('should display error for unknown command', () => {
      const output = run('unknown-command');
      expect(output).toMatch(/Unknown command|error/i);
    });
  });
});
