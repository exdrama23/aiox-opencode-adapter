# Guia de Instalacao Detalhada

[English](../en/INSTALLATION.md) | **Portugues**

---

## Indice

1. [Pre-requisitos](#pre-requisitos)
2. [Instalacao do Node.js](#instalacao-do-nodejs)
3. [Instalacao do npm](#instalacao-do-npm)
4. [Instalacao do Git](#instalacao-do-git)
5. [Instalacao do Pacote](#instalacao-do-pacote)
6. [Configuracao Inicial](#configuracao-inicial)
7. [Verificacao da Instalacao](#verificacao-da-instalacao)

---

## Pre-requisitos

Antes de instalar o AIOX OpenCode Adapter, voce precisa ter os seguintes componentes instalados:

| Componente | Versao Minima | Obrigatorio | Para que serve |
|------------|---------------|-------------|----------------|
| Node.js | 18.0.0 | Sim | Runtime JavaScript |
| npm | 9.0.0 | Sim | Gerenciador de pacotes |
| Git | Qualquer | Sim | Controle de versao |
| Docker | Qualquer | Nao | Pentest MCP |
| Python | 3.8+ | Nao | HexStrike MCP |

### Diferencas por Plataforma

| Recurso | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Node.js | nvm-windows ou instalador | nvm ou homebrew | nvm ou gerenciador de pacotes |
| Git | Git for Windows | Xcode Command Line Tools | git (pacote padrao) |
| Docker | Docker Desktop (WLS2) | Docker Desktop | Docker Engine |
| Python | python.org ou Microsoft Store | homebrew ou python.org | gerenciador de pacotes |

---

## Instalacao do Node.js

### Windows

**Opcao 1: nvm-windows (recomendado)**

```bash
# Baixar o nvm-windows de:
# https://github.com/coreybutler/nvm-windows/releases

# Instalar o nvm-windows
# Executar nvm-setup.exe

# Depois da instalacao:
nvm install 20
nvm use 20

# Verificar
node --version
# Deve exibir: v20.x.x
```

**Opcao 2: Instalador direto**

```bash
# Baixar de: https://nodejs.org/
# Escolher a versao LTS
# Executar o instalador
# Reiniciar o terminal

# Verificar
node --version
```

### macOS

**Opcao 1: nvm (recomendado)**

```bash
# Instalar o nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reiniciar o terminal

# Instalar Node.js
nvm install 20
nvm use 20

# Verificar
node --version
```

**Opcao 2: Homebrew**

```bash
# Instalar o Homebrew (se nao tiver)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Node.js
brew install node@20

# Verificar
node --version
```

### Linux (Ubuntu/Debian)

**Opcao 1: nvm (recomendado)**

```bash
# Instalar o nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reiniciar o terminal

# Instalar Node.js
nvm install 20
nvm use 20

# Verificar
node --version
```

**Opcao 2: Gerenciador de pacotes**

```bash
# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar
node --version
```

---

## Instalacao do npm

O npm ja vem junto com o Node.js. Verifique a versao:

```bash
npm --version
# Deve exibir: 9.x.x ou superior
```

Se precisar atualizar:

```bash
npm install -g npm@latest
```

---

## Instalacao do Git

### Windows

```bash
# Baixar de: https://git-scm.com/download/win
# Executar o instalador
# Reiniciar o terminal

# Verificar
git --version
```

### macOS

```bash
# Instalar via Xcode Command Line Tools
xcode-select --install

# Ou via Homebrew
brew install git

# Verificar
git --version
```

### Linux

```bash
# Ubuntu/Debian
sudo apt-get install git

# Fedora
sudo dnf install git

# Verificar
git --version
```

---

## Instalacao do Pacote

### Instalacao Global (recomendado)

```bash
# Instalar o pacote globalmente
npm install -g aiox-opencode-adapter

# Verificar se foi instalado
aiox-global help
```

### Instalacao para Desenvolvimento

Se voce quiser modificar o codigo fonte:

```bash
# Clonar o repositorio
git clone https://github.com/AIOX-Squads/aiox-opencode-adapter.git
cd aiox-opencode-adapter

# Instalar dependencias
npm install

# Linkar localmente
npm link

# Agora voce pode usar
aiox-global help
```

### Erros Comuns de Instalacao

**Erro: EACCES (Linux/macOS)**

```bash
# Solucao 1: Usar nvm (recomendado)
# Nao precisa de sudo

# Solucao 2: Alterar permissoes do npm
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**Erro: ENOENT (Windows)**

```bash
# Solucao: Executar o PowerShell como Administrador
# Ou usar nvm-windows
```

---

## Configuracao Inicial

Apos instalar o pacote, execute os seguintes comandos:

### Passo 1: Instalar os Agentes

```bash
aiox-global init
```

Este comando:
- Cria o diretorio `~/.config/opencode/agents/` (se nao existir)
- Copia os 12 arquivos de agentes para la
- Verifica se a copia foi bem sucedida

Saida esperada:

```
[AIOX] Installing AIOX agents globally for OpenCode...

  ✓ dev.md -> C:\Users\seu-usuario\.config\opencode\agents\dev.md
  ✓ architect.md -> C:\Users\seu-usuario\.config\opencode\agents\architect.md
  ✓ sm.md -> C:\Users\seu-usuario\.config\opencode\agents\sm.md
  ✓ pm.md -> C:\Users\seu-usuario\.config\opencode\agents\pm.md
  ✓ po.md -> C:\Users\seu-usuario\.config\opencode\agents\po.md
  ✓ qa.md -> C:\Users\seu-usuario\.config\opencode\agents\qa.md
  ✓ analyst.md -> C:\Users\seu-usuario\.config\opencode\agents\analyst.md
  ✓ devops.md -> C:\Users\seu-usuario\.config\opencode\agents\devops.md
  ✓ data-engineer.md -> C:\Users\seu-usuario\.config\opencode\agents\data-engineer.md
  ✓ ux-design-expert.md -> C:\Users\seu-usuario\.config\opencode\agents\ux-design-expert.md
  ✓ squad-creator.md -> C:\Users\seu-usuario\.config\opencode\agents\squad-creator.md
  ✓ cybersec.md -> C:\Users\seu-usuario\.config\opencode\agents\cybersec.md

[AIOX] Installed 12/12 agents.
```

### Passo 2: Gerar a Configuracao

```bash
aiox-global config
```

Este comando:
- Le o template de configuracao
- Auto-detecta HexStrike (se instalado)
- Auto-detecta Pentest MCP (se Docker esta rodando)
- Gera o arquivo `~/.config/opencode/opencode.json`
- Faz backup da configuracao existente (se houver)

Saida esperada:

```
[AIOX] Generating OpenCode config...

  ✓ HexStrike MCP configured (C:\Users\seu-usuario\hexstrike-ai\hexstrike_mcp.py)
[AIOX WARN] Pentest MCP not found. Run "aiox-global setup-pentest" to install.
  → Backed up existing config to C:\Users\seu-usuario\.config\opencode\opencode.json.bak
  ✓ Config written to C:\Users\seu-usuario\.config\opencode\opencode.json
```

### Passo 3: Reiniciar o OpenCode

Feche e abra novamente o OpenCode. Os agentes estaram disponiveis.

---

## Verificacao da Instalacao

Execute o comando de diagnostico:

```bash
aiox-global doctor
```

Saida esperada:

```
[AIOX] Checking AIOX global installation...

  ✓ Node.js v20.10.0
  ✓ Config directory: C:\Users\seu-usuario\.config\opencode\agents
  ✓ All 12 AIOX agents installed
  ✓ OpenCode config found
  ✓ Default agent: aiox-master
  ✓ MCPs configured: hexstrike, pentest-mcp
  ✓ HexStrike AI installed
  ✓ Pentest MCP container found

Total agents in ~/.config/opencode/agents/: 12
```

Se algum item mostrar erro, consulte a secao de [Solucao de Problemas](TROUBLESHOOTING.md).

---

## Proximos Passos

Apos a instalacao bem sucedida:

1. [Configurar Docker](DOCKER-SETUP.md) (se quiser usar Pentest MCP)
2. [Configurar HexStrike](HEXSTRIKE-SETUP.md) (se quiser usar ferramentas de pentest)
3. [Conhecer os Agentes](AGENTS.md) (entender cada agente)
4. [Configurar MCPs](MCP-GUIDE.md) (entender como os MCPs funcionam)
