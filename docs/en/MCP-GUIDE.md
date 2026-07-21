# MCP Server Guide

**English** | [Portuguese](../pt/MCP-GUIDE.md)

---

## Table of Contents

1. [What is MCP](#what-is-mcp)
2. [Included MCPs](#included-mcps)
3. [Configuration](#configuration)
4. [Permissions](#permissions)
5. [Differences Between MCPs](#differences-between-mcps)
6. [Troubleshooting](#troubleshooting)

---

## What is MCP

MCP (Model Context Protocol) is a protocol that allows OpenCode to communicate with external tools. Think of it as a "bridge" between the AI agent and real security tools.

### How it works

```
+------------------+     MCP     +------------------+
|  AI Agent        | <--------> |  External Tool   |
|  (OpenCode)      |             |                  |
+------------------+             +------------------+
       |                                |
       v                                v
  Prompt/Response              Real execution
```

### Request flow

1. The AI agent decides to use a tool
2. OpenCode sends the request via MCP
3. The MCP server executes the tool
4. The result is returned to the agent
5. The agent processes and presents the result

---

## Included MCPs

The AIOX OpenCode Adapter includes configuration for two security MCPs:

### HexStrike AI

| Property | Value |
|----------|-------|
| Name | hexstrike |
| Type | Python server |
| Tools | 100+ |
| Port | 8888 |
| Requirements | Python, pip, Git |
| Installation command | aiox-global setup-hexstrike |

### Pentest MCP

| Property | Value |
|----------|-------|
| Name | pentest-mcp |
| Type | Docker container |
| Tools | Various |
| Port | 8888 |
| Requirements | Docker |
| Installation command | aiox-global setup-pentest |

---

## Configuration

### Automatic Configuration

```bash
aiox-global config
```

This command:
1. Reads the configuration template
2. Auto-detects HexStrike (checks if file exists)
3. Auto-detects Pentest MCP (checks if container is running)
4. Generates `~/.config/opencode/opencode.json`
5. Backs up existing configuration

### Manual Configuration

Edit `~/.config/opencode/opencode.json`:

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
    },
    "pentest-mcp": {
      "type": "local",
      "command": [
        "docker",
        "exec",
        "-i",
        "pentest-mcp",
        "python3",
        "/app/server.py"
      ],
      "enabled": true,
      "timeout": 300000
    }
  }
}
```

### Configuration File Structure

| Field | Description | Values |
|-------|-------------|--------|
| type | Connection type | "local" |
| command | Command to start MCP | Array of strings |
| enabled | Enabled or not | true/false |
| timeout | Timeout in milliseconds | 300000 (5 minutes) |

---

## Permissions

### How MCP permissions work

MCP tools follow the naming pattern `<server>_<tool>`. To allow access to all tools of an MCP, use the wildcard `*`.

### Permissions for HexStrike

```yaml
permission:
  hexstrike_*: allow
```

This allows all 100+ HexStrike tools, including:
- hexstrike_nmap_scan
- hexstrike_nuclei_scan
- hexstrike_sqlmap_scan
- hexstrike_hydra_attack
- hexstrike_metasploit_run
- And many others...

### Permissions for Pentest MCP

```yaml
permission:
  pentest-mcp_*: allow
```

This allows all Pentest MCP tools.

### Where to configure permissions

Permissions can be configured at two levels:

**Global level** (opencode.json):

```json
{
  "permission": {
    "hexstrike_*": "allow",
    "pentest-mcp_*": "allow"
  }
}
```

**Agent level** (agent .md file):

```yaml
permission:
  hexstrike_*: allow
  pentest-mcp_*: allow
```

### Level differences

| Level | Scope | Where to configure |
|-------|--------|-------------------|
| Global | All agents | opencode.json |
| Agent | Only one agent | agents/*.md |

---

## Differences Between MCPs

### Comparison Table

| Aspect | HexStrike | Pentest MCP |
|--------|-----------|-------------|
| **Type** | Python MCP server | Docker container |
| **Isolation** | Runs on user system | Runs isolated in container |
| **Installation** | Requires Python + pip | Requires Docker |
| **Update** | git pull + pip install | docker pull |
| **Removal** | Delete directory | docker rm |
| **Resources** | Uses system RAM/CPU | Configurable via Docker |
| **Ports** | Configurable | Configurable |
| **Logs** | Log file | docker logs |
| **Dependencies** | Managed by pip | Bundled in container |

### When to use each

**Use HexStrike when:**
- You want complete access to 100+ tools
- You already have Python installed
- You prefer to manage dependencies manually
- You need flexibility to customize

**Use Pentest MCP when:**
- You want a simpler solution
- You already have Docker installed
- You prefer complete isolation
- You don't want to worry about dependencies

**Use both when:**
- You want maximum tool coverage
- You need redundancy
- You'll use different agents for different tasks

### Combined Usage Example

```bash
# Configure both
aiox-global setup-hexstrike
aiox-global setup-pentest
aiox-global config

# The @cybersec agent can use either
# Via HexStrike: hexstrike_nmap_scan
# Via Pentest MCP: pentest-mcp_nmap_scan
```

---

## Troubleshooting

### MCP doesn't connect

**Check if server is running:**

```bash
# HexStrike
ps aux | grep hexstrike_mcp

# Pentest MCP
docker ps | grep pentest-mcp
```

**Check the port:**

```bash
# Windows
netstat -an | findstr 8888

# macOS/Linux
lsof -i :8888
```

### Request timeout

Increase the timeout in configuration:

```json
{
  "mcp": {
    "hexstrike": {
      "timeout": 600000
    }
  }
}
```

### Tool not found

Check if the tool is enabled in the MCP:

```bash
# List available tools
# (varies by MCP)
```

### Permission error

Check permissions in `opencode.json` or agent file:

```json
{
  "permission": {
    "hexstrike_*": "allow"
  }
}
```

---

## Next Steps

After configuring MCPs:

1. [Learn about Agents](AGENTS.md)
2. [Troubleshooting](TROUBLESHOOTING.md)
