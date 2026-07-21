# HexStrike Setup Guide

**English** | [Portuguese](../pt/HEXSTRIKE-SETUP.md)

---

## Table of Contents

1. [What is HexStrike](#what-is-hexstrike)
2. [Prerequisites](#prerequisites)
3. [Automatic Installation](#automatic-installation)
4. [Manual Installation](#manual-installation)
5. [Configuration](#configuration)
6. [Verification](#verification)
7. [Available Tools](#available-tools)
8. [Common Issues](#common-issues)

---

## What is HexStrike

HexStrike AI is an MCP (Model Context Protocol) server that provides access to over 100 penetration testing and security tools. It is used by the `@cybersec` (Kira) agent to perform security tests.

### HexStrike vs Pentest MCP

| Characteristic | HexStrike | Pentest MCP |
|----------------|-----------|-------------|
| Type | Python MCP server | Docker container |
| Tools | 100+ | Various |
| Requirements | Python, pip, Git | Docker |
| Installation | aiox-global setup-hexstrike | aiox-global setup-pentest |
| Configuration | Via opencode.json | Via opencode.json |
| Permissions | hexstrike_* | pentest-mcp_* |
| Complexity | Higher (requires Python) | Lower (requires Docker) |

### When to use each

- **HexStrike**: When you want complete access to pentesting tools (nmap, nuclei, sqlmap, etc.)
- **Pentest MCP**: When you want a simpler, Docker-isolated solution
- **Both**: For maximum tool coverage

---

## Prerequisites

| Component | Minimum Version | Required |
|-----------|-----------------|----------|
| Python | 3.8+ | Yes |
| pip | 20.0+ | Yes |
| Git | Any | Yes |
| Node.js | 18.0+ | Should already be installed |

### Checking Python

```bash
# Windows
python --version
# Should display: Python 3.8.x or higher

# macOS/Linux
python3 --version
# Should display: Python 3.8.x or higher
```

### Checking pip

```bash
# Windows
pip --version
# Should display: pip 20.x.x or higher

# macOS/Linux
pip3 --version
# Should display: pip 20.x.x or higher
```

### Installing Python (if needed)

**Windows:**
1. Download from: https://www.python.org/downloads/
2. Run the installer
3. Check "Add Python to PATH"
4. Click "Install Now"

**macOS:**
```bash
# Via Homebrew
brew install python@3.11

# Or download from: https://www.python.org/downloads/
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install python3 python3-pip python3-venv

# Fedora
sudo dnf install python3 python3-pip
```

---

## Automatic Installation

The simplest command to install HexStrike:

```bash
aiox-global setup-hexstrike
```

### What this command does

1. Checks if Git is installed
2. Clones the HexStrike AI repository to `~/hexstrike-ai/`
3. Creates a Python virtual environment in `~/hexstrike-ai/hexstrike-env/`
4. Installs all necessary dependencies

### Expected output

```
[AIOX] Setting up HexStrike AI...

  ✓ Repository cloned
  ✓ Virtual environment created
  ✓ Dependencies installed

[AIOX] HexStrike AI installed successfully!
Run "aiox-global config" to add it to OpenCode.
```

### Installation time

Installation may take 2 to 10 minutes, depending on internet speed and computer.

---

## Manual Installation

If automatic installation fails, you can install manually:

### Step 1: Clone the repository

```bash
# Navigate to home directory
cd ~

# Clone the repository
git clone https://github.com/AIOX-Squads/hexstrike-ai.git

# Navigate to the directory
cd hexstrike-ai
```

### Step 2: Create virtual environment

```bash
# Windows
python -m venv hexstrike-env

# macOS/Linux
python3 -m venv hexstrike-env
```

### Step 3: Activate the virtual environment

```bash
# Windows (PowerShell)
.\hexstrike-env\Scripts\Activate.ps1

# Windows (CMD)
.\hexstrike-env\Scripts\activate.bat

# macOS/Linux
source hexstrike-env/bin/activate
```

### Step 4: Install dependencies

```bash
# Inside the active virtual environment
pip install -r requirements.txt
```

### Step 5: Verify

```bash
# The command should work without errors
python hexstrike_mcp.py --help
```

---

## Configuration

After installation, configure HexStrike in OpenCode:

### Option 1: Automatic Configuration

```bash
aiox-global config
```

This command auto-detects HexStrike and adds it to `opencode.json`.

### Option 2: Manual Configuration

Edit `~/.config/opencode/opencode.json` and add:

```json
{
  "mcp": {
    "hexstrike": {
      "type": "local",
      "command": [
        "/home/your-user/hexstrike-ai/hexstrike-env/bin/python3",
        "/home/your-user/hexstrike-ai/hexstrike_mcp.py",
        "--server",
        "http://localhost:8888"
      ],
      "enabled": true,
      "timeout": 300000
    }
  }
}
```

**Adjust paths for your system:**

| System | Python Path | Script Path |
|--------|-------------|-------------|
| Windows | `C:\Users\...\hexstrike-env\Scripts\python.exe` | `C:\Users\...\hexstrike-ai\hexstrike_mcp.py` |
| macOS | `~/hexstrike-env/bin/python3` | `~/hexstrike-ai/hexstrike_mcp.py` |
| Linux | `~/hexstrike-env/bin/python3` | `~/hexstrike-ai/hexstrike_mcp.py` |

---

## Verification

### Check if HexStrike is installed

```bash
aiox-global doctor
```

Should display:

```
  ✓ HexStrike AI installed
```

### Check if server is running

```bash
# Check if port 8888 is in use
# Windows
netstat -an | findstr 8888

# macOS/Linux
lsof -i :8888
```

### Test the server

```bash
# Start server manually (for testing)
cd ~/hexstrike-ai
.\hexstrike-env\Scripts\python.exe hexstrike_mcp.py --server http://localhost:8888

# In another terminal, test connection
curl http://localhost:8888/health
```

---

## Available Tools

HexStrike provides access to over 100 tools, including:

### Network Scanning

| Tool | Description | Command |
|------|-------------|---------|
| nmap | Port and service scanning | hexstrike_nmap_scan |
| rustscan | Ultra-fast port scanning | hexstrike_rustscan_fast_scan |
| masscan | Internet-scale scanning | hexstrike_masscan_high_speed |
| arp-scan | ARP network discovery | hexstrike_arp_scan_discovery |

### Subdomain Discovery

| Tool | Description | Command |
|------|-------------|---------|
| subfinder | Passive subdomain enumeration | hexstrike_subfinder_scan |
| amass | Complete subdomain enumeration | hexstrike_amass_scan |
| fierce | DNS reconnaissance | hexstrike_fierce_scan |

### Web Scanning

| Tool | Description | Command |
|------|-------------|---------|
| nuclei | Vulnerability scanner | hexstrike_nuclei_scan |
| nikto | Web vulnerability scanner | hexstrike_nikto_scan |
| whatweb | Technology detection | hexstrike_wafw00f_scan |
| wafw00f | WAF detection | hexstrike_wafw00f_scan |

### Directory Discovery

| Tool | Description | Command |
|------|-------------|---------|
| gobuster | Directory brute force | hexstrike_gobuster_scan |
| ffuf | Web fuzzing | hexstrike_ffuf_scan |
| dirsearch | Advanced discovery | hexstrike_dirsearch_scan |
| feroxbuster | Recursive discovery | hexstrike_feroxbuster_scan |

### Injection

| Tool | Description | Command |
|------|-------------|---------|
| sqlmap | SQL injection | hexstrike_sqlmap_scan |
| dalfox | XSS | hexstrike_dalfox_xss_scan |
| commix | Command injection | hexstrike_metasploit_run |

### Brute Force

| Tool | Description | Command |
|------|-------------|---------|
| hydra | Password brute force | hexstrike_hydra_attack |
| john | Password cracking | hexstrike_john_crack |
| hashcat | Advanced cracking | hexstrike_hashcat_crack |

### Exploitation

| Tool | Description | Command |
|------|-------------|---------|
| metasploit | Exploitation framework | hexstrike_metasploit_run |
| msfvenom | Payload generation | hexstrike_msfvenom_generate |

---

## Common Issues

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
# Windows: https://www.python.org/downloads/
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

### Port 8888 in use

**Error:**
```
OSError: [Errno 98] Address already in use
```

**Solution:**
```bash
# Find process using the port
# Windows
netstat -ano | findstr :8888

# macOS/Linux
lsof -i :8888

# Kill process (replace PID with process number)
kill PID

# Or use different port
python hexstrike_mcp.py --server http://localhost:8889
```

### Repository doesn't clone

**Error:**
```
fatal: unable to access 'https://github.com/...'
```

**Solution:**
```bash
# Check internet connection
ping github.com

# Check if Git is configured
git config --global user.name
git config --global user.email

# Try again
git clone https://github.com/AIOX-Squads/hexstrike-ai.git
```

---

## Next Steps

After configuring HexStrike:

1. [Configure MCPs](MCP-GUIDE.md)
2. [Learn about Agents](AGENTS.md)
3. [Troubleshooting](TROUBLESHOOTING.md)
