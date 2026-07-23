# Quick Start Guide

**English** | [Portuguese](../pt/QUICKSTART.md)

---

## Quick Installation (2 minutes)

### 1. Install the Package

```bash
npm install -g aiox-opencode-adapter
```

### 2. Configure Everything Automatically

```bash
aiox-global auto-setup
```

### 3. Use in OpenCode

Open OpenCode and use the agents:

```
@dev Create a function in Python
@architect Define the system architecture
@cybersec Scan this target
@aiox-master Orchestrate a complete team
```

---

## Essential Commands

| Command | Description |
|---------|-------------|
| `aiox-global auto-setup` | Full automatic configuration |
| `aiox-global init` | Install agents |
| `aiox-global config` | Generate configuration |
| `aiox-global list` | List installed agents |
| `aiox-global doctor` | Verify installation |
| `aiox-global update` | Update to latest version |
| `aiox-global --version` | Show installed version |

---

## Presets

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

---

## Customization

```bash
# Copy agent for customization
aiox-global customize dev

# Edit the customized agent
# The file will be at: ~/.config/opencode/custom/dev.md
```

---

## Next Steps

1. [Detailed Installation Guide](INSTALLATION.md)
2. [Agent Guide](AGENTS.md)
3. [MCP Guide](MCP-GUIDE.md)
4. [Troubleshooting](TROUBLESHOOTING.md)
