# Agent Guide

**English** | [Portuguese](../pt/AGENTS.md)

---

## Table of Contents

1. [Overview](#overview)
2. [How to Invoke Agents](#how-to-invoke-agents)
3. [Primary Agents](#primary-agents)
4. [Subagents](#subagents)
5. [Orchestration](#orchestration)
6. [Usage Examples](#usage-examples)

---

## Overview

The AIOX OpenCode Adapter includes 13 specialized AI agents. Each agent has a specific function and works together to complete complex tasks.

### Agent Table

| Agent | Name | Role | Mode | Color |
|-------|------|------|------|-------|
| `@aiox-master` | Orion | Master Orchestrator | primary | #9C27B0 |
| `@dev` | Dex | Full Stack Developer | subagent | #4CAF50 |
| `@architect` | Aria | System Architect | subagent | #2196F3 |
| `@sm` | River | Scrum Master | subagent | #00BCD4 |
| `@pm` | Morgan | Product Manager | subagent | #FF9800 |
| `@po` | Pax | Product Owner | subagent | #FF5722 |
| `@qa` | Quinn | Quality Assurance | subagent | #E91E63 |
| `@analyst` | Atlas | Business Analyst | subagent | #607D8B |
| `@devops` | Gage | DevOps Engineer | subagent | #795548 |
| `@data-engineer` | Dara | Data Engineer | subagent | #3F51B5 |
| `@ux-design-expert` | Uma | UX/UI Designer | subagent | #FF4081 |
| `@squad-creator` | Craft | Squad Creator | subagent | #009688 |
| `@cybersec` | Kira | Security Analyst | subagent | #ff0000 |

---

## How to Invoke Agents

### Via Tab (Primary Agents)

Press `Tab` to switch between primary agents:
- `build` - Build mode (OpenCode default)
- `plan` - Planning mode
- `aiox-master` - AIOX orchestrator

### Via @ (Any Agent)

Type `@` followed by the agent name to invoke directly:

```
@dev Create a function in Python
@architect Design the system architecture
@qa Review this code
@cybersec Scan this target
```

### Via task (Orchestration)

The `@aiox-master` can invoke other agents automatically via the `task` tool:

```
aiox-master: "Create a complete REST API"
→ Orchestrates: @analyst → @architect → @pm → @sm → @dev → @qa → @devops
```

---

## Primary Agents

### @aiox-master (Orion)

**Description:** AIOX Master Orchestrator. Coordinates all other agents to complete complex tasks.

**Function:**
- Analyzes the received task
- Breaks it into subtasks
- Invokes appropriate agents
- Coordinates the workflow
- Consolidates results

**Permissions:**
- edit: allow
- bash: ask (with exceptions for git, node, npm)
- read: allow
- glob: allow
- grep: allow
- skill: allow
- task: allow (can invoke other agents)
- webfetch: allow
- websearch: allow

**Usage example:**

```
User: "Create a complete e-commerce site with shopping cart"

Orion orchestrates:
1. @analyst - Analyzes business requirements
2. @architect - Defines technical architecture
3. @pm - Creates user stories
4. @sm - Plans sprints
5. @dev - Implements code
6. @qa - Tests and reviews
7. @devops - Deploys
```

---

## Subagents

### @dev (Dex)

**Description:** Full Stack Developer. Implements code, debugs, refactors, and runs tests.

**Tools:**
- File editing
- Command execution (git, npm, node)
- File reading
- Code search

**Use cases:**
- Creating new functions and components
- Implementing APIs
- Fixing bugs
- Refactoring code
- Writing tests

**Example:**

```
@dev Create a Python function that validates Brazilian CPF
```

**Expected response:**
Dex will:
1. Create the function with complete validation
2. Handle exceptions
3. Add docstrings
4. Suggest unit tests

---

### @architect (Aria)

**Description:** System Architect. Defines architecture, selects tech stack, designs APIs, and creates diagrams.

**Tools:**
- Reading existing files
- Project structure analysis
- Documentation

**Use cases:**
- Defining microservices architecture
- Selecting tech stack
- Designing API endpoints
- Creating architecture diagrams
- Reviewing technical decisions

**Example:**

```
@architect Define the architecture for a real-time chat system
```

**Expected response:**
Aria will:
1. Analyze requirements
2. Suggest WebSocket or Server-Sent Events
3. Define folder structure
4. Create architecture diagram
5. Document technical decisions

---

### @sm (River)

**Description:** Scrum Master. Manages sprints and creates detailed user stories.

**Tools:**
- File reading
- Story writing
- Backlog management

**Use cases:**
- Creating user stories
- Planning sprints
- Managing backlog
- Facilitating daily standups
- Removing impediments

**Example:**

```
@sm Create user stories for the authentication module
```

**Expected response:**
River will:
1. Break down the module into features
2. Create stories with acceptance criteria
3. Estimate effort
4. Define dependencies
5. Suggest implementation order

---

### @pm (Morgan)

**Description:** Product Manager. Creates PRDs, manages epics, and defines product strategy.

**Tools:**
- Market analysis
- Roadmap definition
- Feature prioritization

**Use cases:**
- Creating PRD (Product Requirements Document)
- Defining product roadmap
- Prioritizing features
- Analyzing competition
- Defining success metrics

**Example:**

```
@pm Create a PRD for a food delivery app
```

**Expected response:**
Morgan will:
1. Define target audience
2. List main features
3. Define priorities (MVP vs future)
4. Create roadmap
5. Define KPIs

---

### @po (Pax)

**Description:** Product Owner. Manages backlog and applies Definition of Done.

**Tools:**
- Backlog management
- Story refinement
- Acceptance criteria definition

**Use cases:**
- Managing product backlog
- Refining user stories
- Applying Definition of Done
- Prioritizing tasks
- Validating deliveries

**Example:**

```
@po Refine the current sprint's user stories
```

**Expected response:**
Pax will:
1. Review existing stories
2. Add acceptance criteria
3. Verify estimates
4. Identify dependencies
5. Suggest execution order

---

### @qa (Quinn)

**Description:** Quality Assurance. Reviews code, applies quality gates, and runs tests.

**Tools:**
- Code review
- Test execution
- Coverage analysis

**Use cases:**
- Reviewing code
- Writing unit tests
- Writing integration tests
- Checking test coverage
- Validating code quality

**Example:**

```
@qa Review the payments module code
```

**Expected response:**
Quinn will:
1. Analyze code line by line
2. Identify security issues
3. Check code patterns
4. Suggest improvements
5. Create tests for critical scenarios

---

### @analyst (Atlas)

**Description:** Business Analyst. Does market research, analyzes competition, and gathers requirements.

**Tools:**
- Web search
- Data analysis
- Documentation

**Use cases:**
- Market research
- Competition analysis
- Requirements gathering
- Brainstorming
- Persona definition

**Example:**

```
@analyst Research the main features of streaming apps
```

**Expected response:**
Atlas will:
1. List main apps (Netflix, Spotify, etc.)
2. Analyze features
3. Identify differentiators
4. Suggest features for your project
5. Create comparison

---

### @devops (Gage)

**Description:** DevOps Engineer. Manages git push, PR creation, CI/CD, and deployment. The ONLY agent that can push to remote.

**Tools:**
- Git (push, commit, PR)
- CI/CD
- Deployment
- Infrastructure

**Use cases:**
- Creating pull requests
- Configuring CI/CD pipelines
- Deploying
- Managing infrastructure
- Configuring environments

**Example:**

```
@devops Create a PR with the authentication module changes
```

**Expected response:**
Gage will:
1. Check git changes
2. Create branch with descriptive name
3. Commit with clear message
4. Create PR with detailed description
5. Suggest reviewers

---

### @data-engineer (Dara)

**Description:** Data Engineer. Designs database schemas, migrations, and optimizes queries.

**Tools:**
- Data modeling
- SQL
- Migrations
- Query optimization

**Use cases:**
- Designing database schemas
- Creating migrations
- Optimizing queries
- Defining RLS policies
- Modeling data

**Example:**

```
@data-engineer Design the database schema for an e-commerce system
```

**Expected response:**
Dara will:
1. List main entities (users, products, orders)
2. Define tables and columns
3. Create relationships (FK)
4. Suggest indexes
5. Create SQL migrations

---

### @ux-design-expert (Uma)

**Description:** UX/UI Designer. Creates design systems, wireframes, and ensures accessibility.

**Tools:**
- Usability analysis
- Design patterns
- Accessibility

**Use cases:**
- Creating design systems
- Designing wireframes
- Reviewing usability
- Ensuring accessibility (WCAG)
- Defining design tokens

**Example:**

```
@ux-design-expert Create a design system for the app
```

**Expected response:**
Uma will:
1. Define color palette
2. Create typography
3. Define spacing
4. Create reusable components
5. Document patterns

---

### @squad-creator (Craft)

**Description:** Squad Creator. Creates, validates, and publishes agent squads for automated workflows.

**Tools:**
- Agent creation
- Workflow validation
- Squad publishing

**Use cases:**
- Creating custom squads
- Validating workflows
- Publishing squads
- Managing existing squads

**Example:**

```
@squad-creator Create a squad for mobile development
```

**Expected response:**
Craft will:
1. Define necessary agents
2. Configure permissions
3. Create workflows
4. Validate the squad
5. Publish

---

### @cybersec (Kira)

**Description:** Security Analyst. Does pentesting, vulnerability scanning, security auditing, and threat analysis.

> **Complete Documentation:** [Complete Kira Guide](CYBERSEC.md)

**MCP Tools:**
- hexstrike_* (100+ pentesting tools)
- pentest-mcp_* (additional tools)

**Bash tools:**
- nmap, nuclei, subfinder, gau, httpx
- katana, ffuf, whatweb, wafw00f
- nikto, sqlmap, dalfox, commix
- git, grep, curl

**Use cases:**
- Complete pentesting
- Vulnerability scanning
- Security auditing
- Threat analysis
- Penetration testing

**Example:**

```
@cybersec Do a complete pentest on example.com
```

**Expected response:**
Kira will:
1. Confirm authorization
2. Do passive reconnaissance
3. Scan ports and services
4. Identify vulnerabilities
5. Generate report with CVSS

**Detailed flow:**

```
1. Reconnaissance
   → hexstrike_subfinder_scan (subdomains)
   → hexstrike_gau_discovery (historical URLs)

2. Scanning
   → hexstrike_nmap_scan (ports)
   → hexstrike_nuclei_scan (vulnerabilities)

3. Enumeration
   → hexstrike_dirsearch_scan (directories)
   → hexstrike_wafw00f_scan (WAF)

4. Exploitation (with authorization)
   → hexstrike_sqlmap_scan (SQL injection)
   → hexstrike_dalfox_xss_scan (XSS)

5. Report
   → Generate report with findings
   → Classify by CVSS severity
   → Suggest remediation
```

---

## Orchestration

### How aiox-master coordinates

The `@aiox-master` (Orion) is the orchestrator agent. When you give it a complex task, it:

1. **Analyzes** the task and identifies necessary agents
2. **Plans** the execution order
3. **Invokes** each agent via `task` tool
4. **Coordinates** the workflow
5. **Consolidates** results

### Complete Workflow Example

```
User: "Create a blog with authentication and post system"

Orion executes:

Phase 1: Planning
  → @analyst: "Analyze requirements for blog"
  → @architect: "Define architecture for blog with auth"
  → @pm: "Create user stories"

Phase 2: Implementation
  → @sm: "Plan implementation sprint"
  → @dev: "Implement authentication module"
  → @dev: "Implement posts module"
  → @data-engineer: "Design database schema"

Phase 3: Quality
  → @qa: "Review all code"
  → @qa: "Write unit tests"

Phase 4: Deployment
  → @devops: "Configure CI/CD"
  → @devops: "Deploy"
```

### Agent Commands

Each agent may have specific commands. Examples:

| Agent | Command | Description |
|-------|---------|-------------|
| @sm | *create-story | Creates a user story |
| @dev | *execute-subtask | Executes a subtask |
| @qa | *review-build | Reviews a build |
| @devops | *create-worktree | Creates a git worktree |
| @pm | *gather-requirements | Gathers requirements |

---

## Usage Examples

### Example 1: Create REST API

```
User: @aiox-master Create a REST API for task management with Node.js

Orion orchestrates:
1. @architect: "Define API architecture"
   → Result: Express.js, SQLite, JWT auth

2. @data-engineer: "Design schema"
   → Result: users, tasks, categories tables

3. @dev: "Implement API"
   → Result: Complete CRUD routes

4. @qa: "Review and test"
   → Result: 95% coverage, no vulnerabilities

5. @devops: "Deploy"
   → Result: API running in production
```

### Example 2: Pentest

```
User: @cybersec Do a pentest on example.com

Kira executes:
1. Confirms authorization
2. Passive reconnaissance
   → subfinder, gau, httpx
3. Active scanning
   → nmap, nuclei, nikto
4. Enumeration
   → dirsearch, ffuf
5. Injection tests
   → sqlmap, dalfox
6. Final report
   → 15 vulnerabilities found
   → 3 critical, 5 high, 7 medium
```

### Example 3: Code Review

```
User: @qa Review the code in src/auth.js

Quinn executes:
1. Static analysis
   → Checks code patterns
2. Security analysis
   → Checks for vulnerabilities
3. Performance analysis
   → Identifies bottlenecks
4. Suggestions
   → 12 improvements suggested
5. Tests
   → Creates 8 unit tests
```

---

## Next Steps

1. [Troubleshooting](TROUBLESHOOTING.md)
2. [MCP Guide](MCP-GUIDE.md)
