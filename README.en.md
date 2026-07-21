# AIOX OpenCode Adapter

**English** | [Portugues](README.md)

Use [AIOX](https://github.com/SynkraAI/aiox-core) agents globally in [OpenCode](https://opencode.ai) across any project.

> Based on the [AIOX Framework](https://github.com/SynkraAI/aiox-core) by [SynkraAI](https://github.com/SynkraAI) (MIT License).

---

## What's Included

13 specialized AI agents:

| Agent | Name | Role | Mode |
|-------|------|------|------|
| `@aiox-master` | Orion | Master Orchestrator | primary |
| `@dev` | Dex | Full Stack Developer | subagent |
| `@architect` | Aria | System Architect | subagent |
| `@sm` | Sage | Scrum Master | subagent |
| `@pm` | Pulse | Product Manager | subagent |
| `@po` | Pixel | Product Owner | subagent |
| `@qa` | Quartz | Quality Assurance | subagent |
| `@analyst` | Apex | Business Analyst | subagent |
| `@devops` | Flux | DevOps Engineer | subagent |
| `@data-engineer` | Schema | Data Engineer | subagent |
| `@ux-design-expert` | Vista | UX/UI Designer | subagent |
| `@squad-creator` | Nexus | Squad Creator | subagent |
| `@cybersec` | Kira | Security Analyst | subagent |

## Prerequisites

| Component | Minimum Version | Required |
|-----------|-----------------|----------|
| Node.js | 18.0.0 | Yes |
| npm | 9.0.0 | Yes |
| Git | Any | Yes |
| Docker | Any | Only for Pentest MCP |
| Python | 3.8+ | Only for HexStrike |

## Quick Start

```bash
# 1. Install the package globally
npm install -g aiox-opencode-adapter

# 2. Install agents to OpenCode
aiox-global init

# 3. Generate configuration
aiox-global config

# 4. Restart OpenCode
```

## Available Commands

```bash
aiox-global init              # Install agents to ~/.config/opencode/agents/
aiox-global config            # Generate opencode.json with auto-detected MCPs
aiox-global setup-hexstrike   # Install HexStrike AI MCP server
aiox-global setup-pentest     # Install Pentest MCP server (Docker)
aiox-global list              # List installed agents
aiox-global doctor            # Check installation health
aiox-global uninstall         # Remove AIOX agents
aiox-global help              # Show help
```

## MCP Configuration (Optional)

For the security agent to work with all tools, install the security MCPs:

```bash
# HexStrike AI (100+ pentesting tools)
aiox-global setup-hexstrike

# Pentest MCP (Docker-based)
aiox-global setup-pentest
```

See full documentation:
- [Detailed Installation](docs/en/INSTALLATION.md)
- [Docker Setup](docs/en/DOCKER-SETUP.md)
- [HexStrike Setup](docs/en/HEXSTRIKE-SETUP.md)
- [MCP Guide](docs/en/MCP-GUIDE.md)
- [Agent Descriptions](docs/en/AGENTS.md)
- [Troubleshooting](docs/en/TROUBLESHOOTING.md)

## Usage

After installation, restart OpenCode. You will have:

- **Tab** to switch between `build`, `plan`, and `aiox-master`
- **@agent-name** to invoke any subagent (e.g., `@dev`, `@cybersec`)
- **aiox-master** orchestrates all agents automatically

## Example Workflow

```
User: "Create a REST API for task management"

aiox-master (Orion) orchestrates:
  1. @analyst (Apex) - Analyzes requirements
  2. @architect (Aria) - Defines architecture
  3. @pm (Pulse) - Creates user stories
  4. @sm (Sage) - Plans sprints
  5. @dev (Dex) - Implements code
  6. @qa (Quartz) - Tests and reviews
  7. @devops (Flux) - Deploys
```

## Attribution

This package is based on the [AIOX Framework](https://github.com/SynkraAI/aiox-core) by [SynkraAI](https://github.com/SynkraAI), licensed under the [MIT License](LICENSE).

## License

MIT - See [LICENSE](LICENSE) for details.
