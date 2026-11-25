const {
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
} = require('../lib/opencodeCompat');

describe('permission conversion', () => {
  test('converts V1 actions to V2 actions', () => {
    const v2 = convertV1ToV2({
      edit: 'allow',
      bash: { '*': 'ask', 'git status*': 'allow' },
      task: { '*': 'deny' },
    });

    expect(v2).toEqual(
      expect.arrayContaining([
        { action: 'edit', resource: '*', effect: 'allow' },
        { action: 'shell', resource: '*', effect: 'ask' },
        { action: 'shell', resource: 'git status*', effect: 'allow' },
        { action: 'subagent', resource: '*', effect: 'deny' },
      ])
    );
  });

  test('converts V2 back to the V1 object shape', () => {
    const v1 = convertV2ToV1([
      { action: 'shell', resource: '*', effect: 'ask' },
      { action: 'edit', resource: '*', effect: 'allow' },
    ]);

    expect(v1).toEqual({
      bash: { '*': 'ask' },
      edit: 'allow',
    });
  });
});

describe('MCP conversion', () => {
  test('converts the V1 flat map to native V2 servers', () => {
    const v2 = convertMcpV1ToV2({
      playwright: { type: 'local', command: ['npx', 'playwright'], enabled: true, timeout: 30000 },
      remote: { type: 'remote', url: 'https://example.com', enabled: false },
    });

    expect(v2).toEqual({
      servers: {
        playwright: {
          type: 'local',
          command: ['npx', 'playwright'],
          disabled: false,
          timeout: { catalog: 30000, execution: 30000 },
        },
        remote: { type: 'remote', url: 'https://example.com', disabled: true },
      },
    });
  });

  test('converts native V2 servers back to the V1 flat map', () => {
    const v1 = convertMcpV2ToV1({
      servers: {
        playwright: {
          type: 'local',
          command: ['npx', 'playwright'],
          disabled: false,
          timeout: { catalog: 10000, execution: 30000 },
        },
      },
    });

    expect(v1).toEqual({
      playwright: {
        type: 'local',
        command: ['npx', 'playwright'],
        enabled: true,
        timeout: 30000,
      },
    });
  });

  test('normalizeMcp applies the requested mode in place', () => {
    const config = { mcp: { docs: { type: 'remote', url: 'https://x', enabled: true } } };
    normalizeMcp(config, 'v2');
    expect(config.mcp.servers.docs.disabled).toBe(false);
    expect(config.mcp.docs).toBeUndefined();

    normalizeMcp(config, 'v1');
    expect(config.mcp.docs.enabled).toBe(true);
  });
});

describe('plugin config conversion', () => {
  test('converts V1 plugin tuples to V2 plugin entries', () => {
    expect(convertPluginV1ToV2(['pkg', ['./local', { enabled: true }]])).toEqual([
      'pkg',
      { package: './local', options: { enabled: true } },
    ]);
  });

  test('converts V2 plugin entries back to V1 tuples', () => {
    expect(convertPluginV2ToV1(['pkg', { package: './local', options: { enabled: true } }])).toEqual([
      'pkg',
      ['./local', { enabled: true }],
    ]);
  });

  test('normalizePlugins honors the mode', () => {
    const config = { plugin: ['./local', { package: 'pkg', options: { strict: true } }] };
    normalizePlugins(config, 'v2');
    expect(config.plugins).toEqual(['./local', { package: 'pkg', options: { strict: true } }]);
    expect(config.plugin).toBeUndefined();
  });
});

describe('agent normalization', () => {
  test('normalizes V1 agent fields to V2', () => {
    const agent = {
      name: 'reviewer',
      prompt: 'Review only.',
      disable: false,
      variant: 'high',
      model: 'anthropic/claude-sonnet-5-5',
      maxSteps: 8,
      permission: { edit: 'deny' },
      tools: { websearch: false },
    };

    normalizeAgentV2(agent);

    expect(agent.system).toBe('Review only.');
    expect(agent.disabled).toBe(false);
    expect(agent.steps).toBe(8);
    expect(agent.model).toBe('anthropic/claude-sonnet-5-5#high');
    expect(agent.permissions).toEqual(
      expect.arrayContaining([
        { action: 'edit', resource: '*', effect: 'deny' },
        { action: 'websearch', resource: '*', effect: 'deny' },
      ])
    );
    expect(agent.prompt).toBeUndefined();
    expect(agent.permission).toBeUndefined();
    expect(agent.tools).toBeUndefined();
    expect(agent.name).toBeUndefined();
  });

  test('normalizes V2 agent fields back to V1', () => {
    const agent = {
      system: 'Review only.',
      disabled: true,
      model: 'anthropic/claude-sonnet-5-5#high',
      permissions: [{ action: 'edit', resource: '*', effect: 'deny' }],
    };

    normalizeAgentV1(agent);

    expect(agent.prompt).toBe('Review only.');
    expect(agent.disable).toBe(true);
    expect(agent.variant).toBe('high');
    expect(agent.permission).toEqual({ edit: 'deny' });
    expect(agent.system).toBeUndefined();
    expect(agent.permissions).toBeUndefined();
  });
});

describe('redundant agent permissions', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { dropRedundantAgentPermissions } = require('../lib/opencodeCompat');

  test('drops config permissions for agents that have an installed .md', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiox-agents-'));
    fs.writeFileSync(path.join(dir, 'master.md'), '---\ndescription: x\n---\n');
    fs.writeFileSync(path.join(dir, 'other.md'), '---\ndescription: y\n---\n');

    const config = {
      agents: {
        master: {
          description: 'x',
          permissions: [{ action: 'subagent', resource: '*', effect: 'allow' }],
        },
        external: {
          description: 'no md here',
          permissions: [{ action: 'edit', resource: '*', effect: 'allow' }],
        },
      },
      agent: {
        master: { description: 'x', permission: { subagent: { '*': 'allow' } } },
      },
    };

    const dropped = dropRedundantAgentPermissions(config, dir);

    expect(dropped).toBe(2);
    expect(config.agents.master.permissions).toBeUndefined();
    expect(config.agent.master.permission).toBeUndefined();
    expect(config.agents.external.permissions).toEqual([
      { action: 'edit', resource: '*', effect: 'allow' },
    ]);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('is a no-op when the agents directory is missing', () => {
    const config = { agents: { master: { permissions: [] } } };
    expect(dropRedundantAgentPermissions(config, path.join(os.tmpdir(), 'aiox-missing-dir-xyz'))).toBe(0);
    expect(config.agents.master.permissions).toEqual([]);
  });
});
