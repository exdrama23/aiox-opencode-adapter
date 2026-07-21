# Configuracao do HexStrike

[English](../en/HEXSTRIKE-SETUP.md) | **Portugues**

---

## Indice

1. [O que e HexStrike](#o-que-e-hexstrike)
2. [Pre-requisitos](#pre-requisitos)
3. [Instalacao Automatica](#instalacao-automatica)
4. [Instalacao Manual](#instalacao-manual)
5. [Configuracao](#configuracao)
6. [Verificacao](#verificacao)
7. [Ferramentas Disponiveis](#ferramentas-disponiveis)
8. [Problemas Comuns](#problemas-comuns)

---

## O que e HexStrike

HexStrike AI e um servidor MCP (Model Context Protocol) que fornece acesso a mais de 100 ferramentas de penetracao e seguranca. Ele e utilizado pelo agente `@cybersec` (Kira) para realizar testes de seguranca.

### Diferenca entre HexStrike e Pentest MCP

| Caracteristica | HexStrike | Pentest MCP |
|----------------|-----------|-------------|
| Tipo | Servidor Python MCP | Container Docker |
| Ferramentas | 100+ | Variadas |
| Requisitos | Python, pip, Git | Docker |
| Instalacao | aiox-global setup-hexstrike | aiox-global setup-pentest |
| Configuracao | Via opencode.json | Via opencode.json |
| Permissoes | hexstrike_* | pentest-mcp_* |
| Complexidade | Maior (requer Python) | Menor (requer Docker) |

### Quando usar cada um

- **HexStrike**: Quando voce quer acesso completo a ferramentas de pentest (nmap, nuclei, sqlmap, etc.)
- **Pentest MCP**: Quando voce quer uma solucao mais simples e isolada via Docker
- **Ambos**: Para cobertura maxima de ferramentas

---

## Pre-requisitos

| Componente | Versao Minima | Obrigatorio |
|------------|---------------|-------------|
| Python | 3.8+ | Sim |
| pip | 20.0+ | Sim |
| Git | Qualquer | Sim |
| Node.js | 18.0+ | Ja deve estar instalado |

### Verificando Python

```bash
# Windows
python --version
# Deve exibir: Python 3.8.x ou superior

# macOS/Linux
python3 --version
# Deve exibir: Python 3.8.x ou superior
```

### Verificando pip

```bash
# Windows
pip --version
# Deve exibir: pip 20.x.x ou superior

# macOS/Linux
pip3 --version
# Deve exibir: pip 20.x.x ou superior
```

### Instalando Python (se necessario)

**Windows:**
1. Baixe de: https://www.python.org/downloads/
2. Execute o instalador
3. Marque "Add Python to PATH"
4. Clique em "Install Now"

**macOS:**
```bash
# Via Homebrew
brew install python@3.11

# Ou baixe de: https://www.python.org/downloads/
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

## Instalacao Automatica

O comando mais simples para instalar o HexStrike:

```bash
aiox-global setup-hexstrike
```

### O que este comando faz

1. Verifica se o Git esta instalado
2. Clona o repositorio HexStrike AI para `~/hexstrike-ai/`
3. Cria um virtual environment Python em `~/hexstrike-ai/hexstrike-env/`
4. Instala todas as dependencias necessarias

### Saida esperada

```
[AIOX] Setting up HexStrike AI...

  ✓ Repository cloned
  ✓ Virtual environment created
  ✓ Dependencies installed

[AIOX] HexStrike AI installed successfully!
Run "aiox-global config" to add it to OpenCode.
```

### Tempo de instalacao

A instalacao pode levar de 2 a 10 minutos, dependendo da velocidade da internet e do computador.

---

## Instalacao Manual

Se a instalacao automatica falhar, voce pode instalar manualmente:

### Passo 1: Clonar o repositorio

```bash
# Navegue ate o diretorio home
cd ~

# Clone o repositorio
git clone https://github.com/AIOX-Squads/hexstrike-ai.git

# Navegue ate o diretorio
cd hexstrike-ai
```

### Passo 2: Criar virtual environment

```bash
# Windows
python -m venv hexstrike-env

# macOS/Linux
python3 -m venv hexstrike-env
```

### Passo 3: Ativar o virtual environment

```bash
# Windows (PowerShell)
.\hexstrike-env\Scripts\Activate.ps1

# Windows (CMD)
.\hexstrike-env\Scripts\activate.bat

# macOS/Linux
source hexstrike-env/bin/activate
```

### Passo 4: Instalar dependencias

```bash
# Dentro do virtual environment ativo
pip install -r requirements.txt
```

### Passo 5: Verificar

```bash
# O comando deve funcionar sem erros
python hexstrike_mcp.py --help
```

---

## Configuracao

Apos a instalacao, configure o HexStrike no OpenCode:

### Opcao 1: Configuracao Automatica

```bash
aiox-global config
```

Este comando auto-detecta o HexStrike e adiciona ao `opencode.json`.

### Opcao 2: Configuracao Manual

Edite o arquivo `~/.config/opencode/opencode.json` e adicione:

```json
{
  "mcp": {
    "hexstrike": {
      "type": "local",
      "command": [
        "C:\\Users\\seu-usuario\\hexstrike-ai\\hexstrike-env\\Scripts\\python.exe",
        "C:\\Users\\seu-usuario\\hexstrike-ai\\hexstrike_mcp.py",
        "--server",
        "http://localhost:8888"
      ],
      "enabled": true,
      "timeout": 300000
    }
  }
}
```

**Ajuste os caminhos para o seu sistema:**

| Sistema | Caminho do Python | Caminho do Script |
|---------|-------------------|-------------------|
| Windows | `C:\Users\...\hexstrike-env\Scripts\python.exe` | `C:\Users\...\hexstrike-ai\hexstrike_mcp.py` |
| macOS | `~/hexstrike-env/bin/python3` | `~/hexstrike-ai/hexstrike_mcp.py` |
| Linux | `~/hexstrike-env/bin/python3` | `~/hexstrike-ai/hexstrike_mcp.py` |

---

## Verificacao

### Verificar se o HexStrike esta instalado

```bash
aiox-global doctor
```

Deve exibir:

```
  ✓ HexStrike AI installed
```

### Verificar se o servidor esta rodando

```bash
# Verificar se a porta 8888 esta em uso
# Windows
netstat -an | findstr 8888

# macOS/Linux
lsof -i :8888
```

### Testar o servidor

```bash
# Iniciar o servidor manualmente (para teste)
cd ~/hexstrike-ai
.\hexstrike-env\Scripts\python.exe hexstrike_mcp.py --server http://localhost:8888

# Em outro terminal, testar a conexao
curl http://localhost:8888/health
```

---

## Ferramentas Disponiveis

O HexStrike fornece acesso a mais de 100 ferramentas, incluindo:

### Escaneamento de Rede

| Ferramenta | Descricao | Comando |
|------------|-----------|---------|
| nmap | Escaneamento de portas e servicos | hexstrike_nmap_scan |
| rustscan | Escaneamento ultrarapido de portas | hexstrike_rustscan_fast_scan |
| masscan | Escaneamento em escala da Internet | hexstrike_masscan_high_speed |
| arp-scan | Descoberta de rede via ARP | hexstrike_arp_scan_discovery |

### Descoberta de Subdominios

| Ferramenta | Descricao | Comando |
|------------|-----------|---------|
| subfinder | Enumeracao passiva de subdominios | hexstrike_subfinder_scan |
| amass | Enumeracao completa de subdominios | hexstrike_amass_scan |
| fierce | Reconhecimento DNS | hexstrike_fierce_scan |

### Escaneamento Web

| Ferramenta | Descricao | Comando |
|------------|-----------|---------|
| nuclei | Scanner de vulnerabilidades | hexstrike_nuclei_scan |
| nikto | Scanner de vulnerabilidades web | hexstrike_nikto_scan |
| whatweb | Deteccao de tecnologias | hexstrike_wafw00f_scan |
| wafw00f | Deteccao de WAF | hexstrike_wafw00f_scan |

### Descoberta de Diretorios

| Ferramenta | Descricao | Comando |
|------------|-----------|---------|
| gobuster | Brute force de diretorios | hexstrike_gobuster_scan |
| ffuf | Fuzzing web | hexstrike_ffuf_scan |
| dirsearch | Descoberta avancada | hexstrike_dirsearch_scan |
| feroxbuster | Descoberta recursiva | hexstrike_feroxbuster_scan |

### Injecao

| Ferramenta | Descricao | Comando |
|------------|-----------|---------|
| sqlmap | Injecao SQL | hexstrike_sqlmap_scan |
| dalfox | XSS | hexstrike_dalfox_xss_scan |
| commix | Injecao de comandos | hexstrike_metasploit_run |

### Forca Bruta

| Ferramenta | Descricao | Comando |
|------------|-----------|---------|
| hydra | Forca bruta de senhas | hexstrike_hydra_attack |
| john | Crackeamento de senhas | hexstrike_john_crack |
| hashcat | Crackeamento avancado | hexstrike_hashcat_crack |

### Exploracao

| Ferramenta | Descricao | Comando |
|------------|-----------|---------|
| metasploit | Framework de exploracao | hexstrike_metasploit_run |
| msfvenom | Geracao de payloads | hexstrike_msfvenom_generate |

---

## Problemas Comuns

### Python nao encontrado

**Erro:**
```
'python' is not recognized as an internal or external command
```

**Solucao:**
```bash
# Verificar se Python esta instalado
python --version

# Se nao estiver, instale:
# Windows: https://www.python.org/downloads/
# macOS: brew install python@3.11
# Linux: sudo apt-get install python3
```

### pip falha ao instalar dependencias

**Erro:**
```
ERROR: Could not find a version that satisfies the requirement
```

**Solucao:**
```bash
# Atualizar o pip
python -m pip install --upgrade pip

# Tentar novamente
pip install -r requirements.txt
```

### Virtual environment corrompido

**Erro:**
```
Error: [Errno 2] No such file or directory
```

**Solucao:**
```bash
# Remover o virtual environment antigo
rm -rf ~/hexstrike-ai/hexstrike-env

# Criar novamente
cd ~/hexstrike-ai
python -m venv hexstrike-env

# Ativar e instalar
.\hexstrike-env\Scripts\activate
pip install -r requirements.txt
```

### Porta 8888 em uso

**Erro:**
```
OSError: [Errno 98] Address already in use
```

**Solucao:**
```bash
# Encontrar o processo que usa a porta
# Windows
netstat -ano | findstr :8888

# macOS/Linux
lsof -i :8888

# Matar o processo (substitua PID pelo numero do processo)
kill PID

# Ou usar outra porta
python hexstrike_mcp.py --server http://localhost:8889
```

### Repositorio nao clona

**Erro:**
```
fatal: unable to access 'https://github.com/...'
```

**Solucao:**
```bash
# Verificar conexao com a internet
ping github.com

# Verificar se o Git esta configurado
git config --global user.name
git config --global user.email

# Tentar novamente
git clone https://github.com/AIOX-Squads/hexstrike-ai.git
```

---

## Proximos Passos

Apos configurar o HexStrike:

1. [Configurar MCPs](MCP-GUIDE.md)
2. [Conhecer os Agentes](AGENTS.md)
3. [Solucao de Problemas](TROUBLESHOOTING.md)
