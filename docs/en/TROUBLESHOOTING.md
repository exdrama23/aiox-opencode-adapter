# Troubleshooting

**English** | [Portuguese](../pt/TROUBLESHOOTING.md)

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Agent Issues](#agent-issues)
3. [MCP Issues](#mcp-issues)
4. [Docker Issues](#docker-issues)
5. [Python Issues](#python-issues)
6. [OpenCode Issues](#opencode-issues)
7. [Useful Commands](#useful-commands)

---

## Installation Issues

### npm install fails

**Error:**
```
npm ERR! code EACCES
npm ERR! permission denied
```

**Cause:** Insufficient permissions to write to the global npm directory.

**Solution (Windows):**
```bash
# Run PowerShell as Administrator
npm install -g aiox-opencode-adapter
```

**Solution (macOS/Linux):**
```bash
# Option 1: Use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
npm install -g aiox-opencode-adapter

# Option 2: Change npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g aiox-opencode-adapter
```

### Node.js not found

**Error:**
```
'node' is not recognized as an internal or external command
```

**Cause:** Node.js is not installed or not in PATH.

**Solution:**
```bash
# Check if Node.js is installed
node --version

# If not installed:
# Windows: https://nodejs.org/
# macOS: brew install node@20
# Linux: sudo apt-get install nodejs
```

### npm not found

**Error:**
```
'npm' is not recognized as an internal or external command
```

**Cause:** npm is not installed or not in PATH.

**Solution:**
```bash
# Check npm version
npm --version

# If not installed, reinstall Node.js (npm comes with it)
```

### Git not found

**Error:**
```
'git' is not recognized as an internal or external command
```

**Cause:** Git is not installed.

**Solution:**
```bash
# Windows: https://git-scm.com/download/win
# macOS: xcode-select --install
# Linux: sudo apt-get install git
```

---

## Agent Issues

### Agent doesn't appear in Tab

**Problem:** The `@aiox-master` agent doesn't appear when pressing Tab.

**Cause:** The agent is defined as `mode: primary` in `opencode.json`, but there's a `.md` file with `mode: subagent` in the agents directory.

**Solution:**
```bash
# Check for conflicts
ls ~/.config/opencode/agents/

# If aiox-master.md exists, remove it
rm ~/.config/opencode/agents/aiox-master.md
```

**Explanation:** In OpenCode, agents defined in `.md` files override agents defined in JSON. If `aiox-master.md` exists as a subagent, it replaces the primary definition.

### Agent doesn't respond

**Problem:** The agent returns an error or doesn't respond.

**Cause:** Insufficient permissions or incorrect configuration.

**Solution:**
```bash
# Check permissions in opencode.json
cat ~/.config/opencode/opencode.json | grep -A 20 "permission"

# Ensure permissions are correct
```

### Agent doesn't execute commands

**Problem:** The agent doesn't execute bash commands.

**Cause:** Bash permissions are configured as "deny" or "ask".

**Solution:** Check the agent's `.md` file and ensure permissions are correct:

```yaml
permission:
  bash:
    "*": allow
```

### Task tool doesn't work

**Problem:** `@aiox-master` can't invoke other agents.

**Cause:** The `task` permission is not enabled.

**Solution:** Check `opencode.json`:

```json
{
  "agent": {
    "aiox-master": {
      "permission": {
        "task": { "*": "allow" }
      }
    }
  }
}
```

---

## MCP Issues

### HexStrike doesn't connect

**Error:**
```
MCP server hexstrike failed to connect
```

**Possible causes:**
1. Server not running
2. Port 8888 in use
3. Incorrect paths in opencode.json

**Solution:**
```bash
# Check if server is running
ps aux | grep hexstrike_mcp

# Check if port is in use
netstat -an | findstr 8888

# Restart server
cd ~/hexstrike-ai
.\hexstrike-env\Scripts\python.exe hexstrike_mcp.py --server http://localhost:8888
```

### Pentest MCP container doesn't start

**Error:**
```
Error: No such container: pentest-mcp
```

**Cause:** Container wasn't created or was removed.

**Solution:**
```bash
# Check if container exists
docker ps -a | grep pentest-mcp

# If not exists, create again
docker run -d --name pentest-mcp -p 8888:8888 pentest-mcp/pentest-mcp:latest

# If exists but stopped
docker start pentest-mcp
```

### Request timeout in MCP

**Error:**
```
Request timeout after 300000ms
```

**Cause:** Request took longer than configured timeout.

**Solution:** Increase timeout in `opencode.json`:

```json
{
  "mcp": {
    "hexstrike": {
      "timeout": 600000
    }
  }
}
```

### MCP tool not found

**Error:**
```
Unknown tool: hexstrike_nmap_scan
```

**Cause:** Tool doesn't exist in MCP or isn't enabled.

**Solution:**
```bash
# Check available tools in HexStrike
cd ~/hexstrike-ai
python hexstrike_mcp.py --list-tools

# Check permissions in opencode.json
```

---

## Docker Issues

### Docker doesn't start (Windows)

**Error:**
```
Cannot connect to the Docker daemon
```

**Solution:**
1. Open Docker Desktop
2. Wait for full initialization
3. Check if WSL2 is installed: `wsl --status`
4. Restart Docker Desktop

### Docker doesn't start (Linux)

**Solution:**
```bash
# Check service status
sudo systemctl status docker

# Start service
sudo systemctl start docker

# Enable on boot
sudo systemctl enable docker
```

### Permission denied (Linux)

**Error:**
```
permission denied while trying to connect to the Docker daemon socket
```

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Activate changes
newgrp docker

# Verify
docker ps
```

### Insufficient disk space

**Error:**
```
no space left on device
```

**Solution:**
```bash
# Clean stopped containers
docker container prune

# Clean unused images
docker image prune -a

# Clean everything
docker system prune -a

# Check space
docker system df
```

### Container won't stop

**Solution:**
```bash
# Force stop
docker stop -t 0 pentest-mcp

# Remove
docker rm -f pentest-mcp
```

### Port 8888 in use

**Solution:**
```bash
# Find process
# Windows
netstat -ano | findstr :8888

# macOS/Linux
lsof -i :8888

# Kill process (replace PID)
kill PID

# Or use different port
docker run -d --name pentest-mcp -p 8889:8888 pentest-mcp/pentest-mcp:latest
```

---

## Python Issues

### Python not found

**Error:**
```
'python' is not recognized as an internal or external command
```

**Solution:**
```bash
# Check if Python is installed
python --version

# If not installed:
# Windows: https://www.python.org/downloads/ (check "Add to PATH")
# macOS: brew install python@3.11
# Linux: sudo apt-get install python3
```

### pip fails to install dependencies

**Error:**
```
ERROR: Could not find a version that satisfies the requirement
```

**Solution:**
```bash
# Update pip
python -m pip install --upgrade pip

# Try again
pip install -r requirements.txt
```

### Virtual environment corrupted

**Error:**
```
Error: [Errno 2] No such file or directory
```

**Solution:**
```bash
# Remove old virtual environment
rm -rf ~/hexstrike-ai/hexstrike-env

# Create again
cd ~/hexstrike-ai
python -m venv hexstrike-env

# Activate and install
.\hexstrike-env\Scripts\activate
pip install -r requirements.txt
```

---

## OpenCode Issues

### OpenCode doesn't start

**Solution:**
```bash
# Check if OpenCode is installed
opencode --version

# Reinstall if needed
npm install -g opencode
```

### Configuration not recognized

**Solution:**
```bash
# Check if file exists
ls ~/.config/opencode/opencode.json

# Check if valid JSON
cat ~/.config/opencode/opencode.json | python -m json.tool
```

### Agents don't appear

**Solution:**
```bash
# Check if agents are installed
aiox-global list

# Reinstall if needed
aiox-global init
```

---

## Useful Commands

### Health Check

```bash
# Complete check
aiox-global doctor

# List agents
aiox-global list

# Check Docker
docker ps

# Check Python
python --version

# Check Node.js
node --version
```

### Cleanup

```bash
# Remove AIOX agents
aiox-global uninstall

# Remove Docker container
docker rm -f pentest-mcp

# Remove HexStrike
rm -rf ~/hexstrike-ai

# Clean Docker
docker system prune -a
```

### Restart

```bash
# Restart Docker (Linux)
sudo systemctl restart docker

# Restart OpenCode
# Close and reopen
```

---

## Support

If none of the above solutions resolve your problem:

1. Run `aiox-global doctor` and paste the output
2. Check Docker logs: `docker logs pentest-mcp`
3. Check OpenCode logs
4. Open an issue on the repository
