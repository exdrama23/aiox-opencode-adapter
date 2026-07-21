const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const REQUIRED_FIELDS = ['description', 'mode'];
const VALID_MODES = ['primary', 'subagent'];
const VALID_PERMISSIONS = ['edit', 'bash', 'read', 'glob', 'grep', 'skill', 'webfetch', 'websearch'];

// Parse YAML frontmatter (simple parser)
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Parse nested objects (simple)
      if (value === '' || value === 'true' || value === 'false') {
        frontmatter[key] = value === 'true' ? true : value === 'false' ? false : '';
      } else {
        frontmatter[key] = value;
      }
    }
  }

  return frontmatter;
}

describe('Agent Validation', () => {
  const agentFiles = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));

  test('should have at least one agent file', () => {
    expect(agentFiles.length).toBeGreaterThan(0);
  });

  agentFiles.forEach(agentFile => {
    describe(`Agent: ${agentFile}`, () => {
      let content;
      let frontmatter;

      beforeAll(() => {
        content = fs.readFileSync(path.join(AGENTS_DIR, agentFile), 'utf8');
        frontmatter = parseFrontmatter(content);
      });

      test('should have valid YAML frontmatter', () => {
        expect(frontmatter).not.toBeNull();
      });

      test('should have required fields', () => {
        REQUIRED_FIELDS.forEach(field => {
          expect(frontmatter).toHaveProperty(field);
        });
      });

      test('should have valid description', () => {
        expect(frontmatter.description).toBeDefined();
        expect(typeof frontmatter.description).toBe('string');
        expect(frontmatter.description.length).toBeGreaterThan(0);
      });

      test('should have valid mode', () => {
        expect(frontmatter.mode).toBeDefined();
        expect(VALID_MODES).toContain(frontmatter.mode);
      });

      test('should have permission section', () => {
        expect(frontmatter).toHaveProperty('permission');
      });

      test('should have content after frontmatter', () => {
        const body = content.replace(/^---\n[\s\S]*?\n---/, '').trim();
        expect(body.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Agent File Naming', () => {
    test('all agent files should have .md extension', () => {
      agentFiles.forEach(file => {
        expect(file.endsWith('.md')).toBe(true);
      });
    });

    test('should not have spaces in filenames', () => {
      agentFiles.forEach(file => {
        expect(file).not.toMatch(/\s/);
      });
    });

    test('should not have uppercase letters in filenames', () => {
      agentFiles.forEach(file => {
        expect(file).toBe(file.toLowerCase());
      });
    });
  });

  describe('Agent Count', () => {
    test('should have exactly 12 agents', () => {
      expect(agentFiles.length).toBe(12);
    });
  });
});
