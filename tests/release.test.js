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
