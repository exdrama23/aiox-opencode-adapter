# Detailed Installation Guide

**English** | [Portuguese](../pt/INSTALLATION.md)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installing Node.js](#installing-nodejs)
3. [Installing npm](#installing-npm)
4. [Installing Git](#installing-git)
5. [Installing the Package](#installing-the-package)
6. [Initial Configuration](#initial-configuration)
7. [Verifying the Installation](#verifying-the-installation)

---

## Prerequisites

Before installing the AIOX OpenCode Adapter, you need the following components:

| Component | Minimum Version | Required |
|-----------|-----------------|----------|
| Node.js | 18.0.0 | Yes |
| npm | 9.0.0 | Yes |
| Git | Any | Yes |
| Docker | Any | Only for Pentest MCP |
| Python | 3.8+ | Only for HexStrike |

### Platform Differences

| Resource | Windows | macOS | Linux |
|----------|---------|-------|-------|
| Node.js | nvm-windows or installer | nvm or homebrew | nvm or package manager |
| Git | Git for Windows | Xcode Command Line Tools | git (default package) |
| Docker | Docker Desktop (WSL2) | Docker Desktop | Docker Engine |
| Python | python.org or Microsoft Store | homebrew or python.org | package manager |

---

## Installing Node.js

### Windows

**Option 1: nvm-windows (recommended)**

```bash
# Download nvm-windows from:
# https://github.com/coreybutler/nvm-windows/releases

# Install nvm-windows
# Run nvm-setup.exe

# After installation:
nvm install 20
nvm use 20

# Verify
node --version
# Should display: v20.x.x
```

**Option 2: Direct installer**

```bash
# Download from: https://nodejs.org/
# Choose the LTS version
# Run the installer
# Restart the terminal

# Verify
node --version
```

### macOS

**Option 1: nvm (recommended)**

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart the terminal

# Install Node.js
nvm install 20
nvm use 20

# Verify
node --version
```

**Option 2: Homebrew**

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Verify
node --version
```

### Linux (Ubuntu/Debian)

**Option 1: nvm (recommended)**

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart the terminal

# Install Node.js
nvm install 20
nvm use 20

# Verify
node --version
```

**Option 2: Package manager**

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
```

---

## Installing npm

npm comes bundled with Node.js. Verify the version:

```bash
npm --version
# Should display: 9.x.x or higher
```

If you need to update:

```bash
npm install -g npm@latest
```

---

## Installing Git

### Windows

```bash
# Download from: https://git-scm.com/download/win
# Run the installer
# Restart the terminal

# Verify
git --version
```

### macOS

```bash
# Install via Xcode Command Line Tools
xcode-select --install

# Or via Homebrew
brew install git

# Verify
git --version
```

### Linux

```bash
# Ubuntu/Debian
sudo apt-get install git

# Fedora
sudo dnf install git

# Verify
git --version
```

---

## Installing the Package

### Global Installation (recommended)

```bash
# Install the package globally
npm install -g aiox-opencode-adapter

# Verify installation
aiox-global help
```

### Development Installation

If you want to modify the source code:

```bash
# Clone the repository
git clone https://github.com/exdrama23/aiox-opencode-adapter.git
cd aiox-opencode-adapter

# Install dependencies
npm install

# Link locally
npm link

# Now you can use
aiox-global help
```

### Common Installation Errors

**Error: EACCES (Linux/macOS)**

```bash
# Solution 1: Use nvm (recommended)
# No sudo needed

# Solution 2: Change npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**Error: ENOENT (Windows)**

```bash
# Solution: Run PowerShell as Administrator
# Or use nvm-windows
```

---

## Initial Configuration

After installing the package, run the following commands:

### Option 1: Automatic Configuration (Recommended)

```bash
aiox-global auto-setup
```

This command:
- Installs all 12 agents
- Auto-detects and configures MCPs
- Generates the configuration file
- Verifies the installation

Expected output:

```
[AIOX] AIOX Auto-Setup: Configuring everything automatically...

[AIOX] Step 1/3: Installing agents...
[AIOX] Installing AIOX agents globally for OpenCode...
  ✓ dev.md -> /home/your-user/.config/opencode/agents/dev.md
  ✓ architect.md -> /home/your-user/.config/opencode/agents/architect.md
  ...
[AIOX] Installed 12/12 agents.

[AIOX] Step 2/3: Generating configuration...
[AIOX] Generating OpenCode config...
  ✓ HexStrike MCP configured
  ✓ Config written to /home/your-user/.config/opencode/opencode.json

[AIOX] Step 3/3: Verifying installation...
[AIOX] Checking AIOX global installation...
  ✓ Node.js v20.10.0
  ✓ Config directory: /home/your-user/.config/opencode/agents
  ✓ All 12 AIOX agents installed

[AIOX] Auto-setup complete!
```

### Option 2: Manual Configuration

If you prefer to configure step by step:

### Step 1: Install Agents

```bash
aiox-global init
```

This command:
- Creates the `~/.config/opencode/agents/` directory (if it doesn't exist)
- Copies the 12 agent files there
- Verifies the copy was successful

Expected output:

```
[AIOX] Installing AIOX agents globally for OpenCode...

  ✓ dev.md -> /home/your-user/.config/opencode/agents/dev.md
  ✓ architect.md -> /home/your-user/.config/opencode/agents/architect.md
  ✓ sm.md -> /home/your-user/.config/opencode/agents/sm.md
  ✓ pm.md -> /home/your-user/.config/opencode/agents/pm.md
  ✓ po.md -> /home/your-user/.config/opencode/agents/po.md
  ✓ qa.md -> /home/your-user/.config/opencode/agents/qa.md
  ✓ analyst.md -> /home/your-user/.config/opencode/agents/analyst.md
  ✓ devops.md -> /home/your-user/.config/opencode/agents/devops.md
  ✓ data-engineer.md -> /home/your-user/.config/opencode/agents/data-engineer.md
  ✓ ux-design-expert.md -> /home/your-user/.config/opencode/agents/ux-design-expert.md
  ✓ squad-creator.md -> /home/your-user/.config/opencode/agents/squad-creator.md
  ✓ cybersec.md -> /home/your-user/.config/opencode/agents/cybersec.md

[AIOX] Installed 12/12 agents.
```

### Step 2: Generate Configuration

```bash
aiox-global config
```

This command:
- Reads the configuration template
- Auto-detects HexStrike (if installed)
- Auto-detects Pentest MCP (if Docker is running)
- Generates `~/.config/opencode/opencode.json`
- Backs up existing configuration (if any)

Expected output:

```
[AIOX] Generating OpenCode config...

  ✓ HexStrike MCP configured (/home/your-user/hexstrike-ai/hexstrike_mcp.py)
[AIOX WARN] Pentest MCP not found. Run "aiox-global setup-pentest" to install.
  → Backed up existing config to /home/your-user/.config/opencode/opencode.json.bak
  ✓ Config written to /home/your-user/.config/opencode/opencode.json
```

### Step 3: Restart OpenCode

Close and reopen OpenCode. The agents will be available.

---

## Customization

### Presets

Use presets to install only the agents you need:

```bash
# Development team
aiox-global preset dev

# Pentest and security
aiox-global preset pentest

# Complete team
aiox-global preset fullstack

# Project management
aiox-global preset agile

# Just the basics
aiox-global preset minimal
```

### Customizing Agents

To customize an agent:

```bash
# Copy agent to customization directory
aiox-global customize dev

# Edit the customized agent
# The file will be at: ~/.config/opencode/custom/dev.md
```

Custom agents are preserved during updates.

---

## Verifying the Installation

Run the diagnostic command:

```bash
aiox-global doctor
```

Expected output:

```
[AIOX] Checking AIOX global installation...

  ✓ Node.js v20.10.0
  ✓ Config directory: /home/your-user/.config/opencode/agents
  ✓ All 12 AIOX agents installed
  ✓ OpenCode config found
  ✓ Default agent: aiox-master
  ✓ MCPs configured: hexstrike, pentest-mcp
  ✓ HexStrike AI installed
  ✓ Pentest MCP container found

Total agents in ~/.config/opencode/agents/: 12
```

If any item shows an error, see the [Troubleshooting](TROUBLESHOOTING.md) section.

---

## Next Steps

After successful installation:

1. [Configure Docker](DOCKER-SETUP.md) (if you want to use Pentest MCP)
2. [Configure HexStrike](HEXSTRIKE-SETUP.md) (if you want to use pentesting tools)
3. [Learn about Agents](AGENTS.md) (understand each agent)
4. [Configure MCPs](MCP-GUIDE.md) (understand how MCPs work)
