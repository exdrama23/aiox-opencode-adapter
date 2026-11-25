/**
 * Release guard tests.
 *
 * These exist because two real bugs reached a release candidate with a green
 * suite: `files` in package.json omitting plugins/ and scripts/ (so the
 * published tarball shipped without the update notifier), and the `update`
 * command spawning `npm view` (9s of network inside prepublishOnly).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const pkg = require('../package.json');
const updateChecker = require('../bin/update-checker');

describe('package.json files whitelist', () => {
  const required = ['bin/', 'lib/', 'agents/', 'plugins/', 'scripts/', 'templates/'];

  test.each(required)('files covers %s', (entry) => {
    expect(pkg.files).toContain(entry);
  });

  test('every required directory listed in files exists', () => {
    const missing = required.filter((entry) => !fs.existsSync(path.join(ROOT, entry)));
    expect(missing).toEqual([]);
  });
});

describe('package identity', () => {
  const OLD_NAME = 'aiox-opencode' + '-adapter';
  const NEW_NAME = 'aiox-universal';

  test('package is published as aiox-universal', () => {
    expect(pkg.name).toBe(NEW_NAME);
  });

  test('bin exposes aiox-global and aiox-universal on the same entrypoint', () => {
    expect(pkg.bin['aiox-global']).toBe('bin/aiox-global.js');
    expect(pkg.bin[NEW_NAME]).toBe('bin/aiox-global.js');
    expect(pkg.bin['aiox-global']).toBe(pkg.bin[NEW_NAME]);
  });

  test('update checker registry URL follows the package name', () => {
    const previous = process.env.AIOX_REGISTRY_URL;
    delete process.env.AIOX_REGISTRY_URL;
    try {
      const url = updateChecker.getRegistryUrl();
      expect(url).toBe(`https://registry.npmjs.org/${pkg.name}/latest`);
      expect(url).toContain(pkg.name);
    } finally {
      if (previous !== undefined) process.env.AIOX_REGISTRY_URL = previous;
    }
  });

  test('update checker has no hardcoded package path', () => {
    const source = fs.readFileSync(path.join(ROOT, 'bin', 'update-checker.js'), 'utf8');
    expect(source).not.toMatch(/npmjs\.org\/aiox-/);
    expect(source).toContain("require('../package.json')");
    expect(source).toContain('${pkg.name}');
  });

  test('AIOX_REGISTRY_URL still overrides the registry', () => {
    const previous = process.env.AIOX_REGISTRY_URL;
    process.env.AIOX_REGISTRY_URL = 'https://example.test/aiox/latest';
    try {
      expect(updateChecker.getRegistryUrl()).toBe('https://example.test/aiox/latest');
    } finally {
      if (previous === undefined) delete process.env.AIOX_REGISTRY_URL;
      else process.env.AIOX_REGISTRY_URL = previous;
    }
  });

  test('the cache is not reused across a package rename', () => {
    // Redirect the cache: the previous version of this test wrote into the
    // real ~/.aiox/cache, which is exactly the kind of state leakage the
    // sandbox helper was introduced to stop.
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiox-cache-'));
    const cacheFile = path.join(tempDir, 'update.json');
    const previousDir = process.env.AIOX_CACHE_DIR;
    process.env.AIOX_CACHE_DIR = tempDir;

    try {
      fs.writeFileSync(cacheFile, JSON.stringify({
        name: OLD_NAME,
        checkedAt: Date.now(),
        latestVersion: '9.9.9',
      }));
      expect(updateChecker.readCache()).toBeNull();

      updateChecker.writeCache('1.5.2');
      const written = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      expect(written.name).toBe(pkg.name);
      expect(updateChecker.readCache()).not.toBeNull();
    } finally {
      if (previousDir === undefined) delete process.env.AIOX_CACHE_DIR;
      else process.env.AIOX_CACHE_DIR = previousDir;
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('the cache path is overridable so it never has to touch the real home', () => {
    const source = fs.readFileSync(path.join(ROOT, 'bin', 'update-checker.js'), 'utf8');
    expect(source).toContain('AIOX_CACHE_DIR');
  });

  test('no source, test or package file still references the old name', () => {
    const roots = ['bin', 'lib', 'plugins', 'tests'];
    const files = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else files.push(full);
      }
    };
    for (const root of roots) {
      const full = path.join(ROOT, root);
      if (fs.existsSync(full)) walk(full);
    }
    files.push(path.join(ROOT, 'package.json'));

    const offenders = files
      .filter((file) => fs.readFileSync(file, 'utf8').includes(OLD_NAME))
      .map((file) => path.relative(ROOT, file).replace(/\\/g, '/'));

    expect(offenders).toEqual([]);
  });
});

describe('license', () => {
  const license = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8').trim();

  test('is plain MIT so GitHub classifies it as MIT and not "Other"', () => {
    // GitHub's license detector only recognises the standard MIT body. Custom
    // text appended after the warranty paragraph made it report "Other", so the
    // repo showed no MIT badge even though package.json said MIT.
    expect(license.startsWith('MIT License')).toBe(true);
    expect(license).toContain('Permission is hereby granted, free of charge');
    expect(license.endsWith('SOFTWARE.')).toBe(true);
    expect(license).not.toContain('---');
  });

  test('keeps the upstream attribution required by the AIOX Framework', () => {
    expect(license).toContain('SynkraAI');
    expect(license).toContain('AIOX Universal Contributors');
  });

  test('the license ships in the tarball', () => {
    expect(pkg.files).toContain('LICENSE');
  });
});

describe('npm pack contents', () => {
  let packedFiles;

  beforeAll(() => {
    // npm is a .cmd shim on Windows, so go through the shell.
    const out = execSync('npm pack --dry-run --json', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 120000,
    });
    const parsed = JSON.parse(out);
    packedFiles = parsed[0].files.map((f) => f.path.replace(/\\/g, '/'));
  }, 120000);

  const mustShip = [
    'bin/aiox-global.js',
    'bin/update-checker.js',
    'lib/opencodeCompat.js',
    'lib/installedState.js',
    'lib/opencodeRuntime.js',
    'scripts/validate-agents.js',
    'templates/opencode.json',
    'plugins/aiox-update/index.js',
    'plugins/aiox-update/tui.js',
    'plugins/aiox-update/package.json',
  ];

  test.each(mustShip)('tarball includes %s', (file) => {
    expect(packedFiles).toContain(file);
  });

  test('tarball includes every agent file', () => {
    const agents = fs.readdirSync(path.join(ROOT, 'agents')).filter((f) => f.endsWith('.md'));
    expect(agents.length).toBeGreaterThanOrEqual(13);
    const missing = agents.filter((f) => !packedFiles.includes(`agents/${f}`));
    expect(missing).toEqual([]);
  });
});

describe('update checker', () => {
  test('parseVersion accepts a leading v and rejects junk', () => {
    expect(updateChecker.parseVersion('v1.4.2')).toEqual([1, 4, 2]);
    expect(updateChecker.parseVersion('1.4.2')).toEqual([1, 4, 2]);
    expect(updateChecker.parseVersion('nope')).toBeNull();
    expect(updateChecker.parseVersion(undefined)).toBeNull();
  });

  test('isNewer compares numerically, not lexically', () => {
    expect(updateChecker.isNewer('1.10.0', '1.9.9')).toBe(true);
    expect(updateChecker.isNewer('1.4.2', '1.4.2')).toBe(false);
    expect(updateChecker.isNewer('1.4.1', '1.4.2')).toBe(false);
  });

  test('a failed lookup resolves null instead of rejecting', async () => {
    // Nothing listens on port 1, so this fails fast and offline.
    const previous = process.env.AIOX_REGISTRY_URL;
    process.env.AIOX_REGISTRY_URL = 'https://127.0.0.1:1/latest';
    try {
      const started = Date.now();
      const latest = await updateChecker.fetchLatestVersion(2000);
      expect(latest).toBeNull();
      expect(Date.now() - started).toBeLessThan(5000);
    } finally {
      if (previous === undefined) delete process.env.AIOX_REGISTRY_URL;
      else process.env.AIOX_REGISTRY_URL = previous;
    }
  });

  test('the cache never stores an empty lookup', () => {
    const cacheDir = path.join(os.homedir(), '.aiox', 'cache');
    const cacheFile = path.join(cacheDir, 'update.json');
    const before = fs.existsSync(cacheFile) ? fs.readFileSync(cacheFile, 'utf8') : null;

    updateChecker.writeCache(null);
    updateChecker.writeCache(undefined);
    updateChecker.writeCache('');

    const after = fs.existsSync(cacheFile) ? fs.readFileSync(cacheFile, 'utf8') : null;
    expect(after).toBe(before);
  });
});
