/**
 * Isolated HOME for CLI tests.
 *
 * The CLI installs agents, rewrites opencode.json and can uninstall agents.
 * Running that against the real `~/.config/opencode` (as `npm test` and
 * `prepublishOnly` did) destroys the developer's live setup, so every test
 * file gets its own temporary home and config directory.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'aiox-global.js');

function createSandbox(tag) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), `aiox-test-${tag}-`));
  const configDir = path.join(home, '.config', 'opencode');
  fs.mkdirSync(configDir, { recursive: true });

  const env = {
    ...process.env,
    USERPROFILE: home,
    HOME: home,
    XDG_CONFIG_HOME: path.join(home, '.config'),
    APPDATA: path.join(home, 'AppData', 'Roaming'),
    LOCALAPPDATA: path.join(home, 'AppData', 'Local'),
    OPENCODE_CONFIG_DIR: configDir,
    AIOX_DISABLE_UPDATE_CHECK: 'true',
  };

  return {
    home,
    configDir,
    agentsDir: path.join(configDir, 'agents'),
    configPath: path.join(configDir, 'opencode.json'),
    customDir: path.join(configDir, 'custom'),
    env,
    run(command = '', extraEnv = {}) {
      try {
        return execSync(`node "${CLI_PATH}" ${command}`, {
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 30000,
          env: { ...env, ...extraEnv },
        });
      } catch (error) {
        return error.stdout || error.message;
      }
    },
    /** Like run(), but also reports the exit code (null when it crashed). */
    runResult(command = '', extraEnv = {}) {
      try {
        const stdout = execSync(`node "${CLI_PATH}" ${command}`, {
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 30000,
          env: { ...env, ...extraEnv },
        });
        return { output: stdout, code: 0 };
      } catch (error) {
        return { output: error.stdout || error.message, code: typeof error.status === 'number' ? error.status : null };
      }
    },
  };
}

module.exports = { createSandbox, CLI_PATH };
