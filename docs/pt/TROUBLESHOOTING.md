# Solucao de Problemas

[English](../en/TROUBLESHOOTING.md) | **Portugues**

---

## Indice

1. [Problemas de Instalacao](#problemas-de-instalacao)
2. [Problemas com Agentes](#problemas-com-agentes)
3. [Problemas com MCPs](#problemas-com-mcps)
4. [Problemas com Docker](#problemas-com-docker)
5. [Problemas com Python](#problemas-com-python)
6. [Problemas com OpenCode](#problemas-com-opencode)
7. [Comandos Uteis](#comandos-uteis)

---

## Problemas de Instalacao

### npm install falha

**Erro:**
```
npm ERR! code EACCES
npm ERR! permission denied
```

**Causa:** Permissoes insuficientes para escrever no diretorio global do npm.

**Solucao (Windows):**
```bash
# Execute o PowerShell como Administrador
npm install -g aiox-opencode-adapter
```

**Solucao (macOS/Linux):**
```bash
# Opcao 1: Usar nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
npm install -g aiox-opencode-adapter

# Opcao 2: Alterar permissoes do npm
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g aiox-opencode-adapter
```

### Node.js nao encontrado

**Erro:**
```
'node' is not recognized as an internal or external command
```

**Causa:** Node.js nao esta instalado ou nao esta no PATH.

**Solucao:**
```bash
# Verificar se Node.js esta instalado
node --version

# Se nao estiver, instale:
# Windows: https://nodejs.org/
# macOS: brew install node@20
# Linux: sudo apt-get install nodejs
```

### npm nao encontrado

**Erro:**
```
'npm' is not recognized as an internal or external command
```

**Causa:** npm nao esta instalado ou nao esta no PATH.

**Solucao:**
```bash
# Verificar versao do npm
npm --version

# Se nao estiver, reinstale Node.js (npm vem junto)
```

### Git nao encontrado

**Erro:**
```
'git' is not recognized as an internal or external command
```

**Causa:** Git nao esta instalado.

**Solucao:**
```bash
# Windows: https://git-scm.com/download/win
# macOS: xcode-select --install
# Linux: sudo apt-get install git
```

---

## Problemas com Agentes

### Agente nao aparece no Tab

**Problema:** O agente `@aiox-master` nao aparece ao pressionar Tab.

**Causa:** O agente esta definido como `mode: primary` no `opencode.json`, mas existe um arquivo `.md` com `mode: subagent` no diretorio de agentes.

**Solucao:**
```bash
# Verificar se existe conflito
ls ~/.config/opencode/agents/

# Se existir aiox-master.md, remova-o
rm ~/.config/opencode/agents/aiox-master.md
```

**Explicacao:** No OpenCode, agentes definidos em `.md` sobrescrevem agentes definidos em JSON. Se `aiox-master.md` existe como subagent, ele substitui a definicao primary.

### Agente nao responde

**Problema:** O agente retorna erro ou nao responde.

**Causa:** Permissoes insuficientes ou configuracao incorreta.

**Solucao:**
```bash
# Verificar permissoes no opencode.json
cat ~/.config/opencode/opencode.json | grep -A 20 "permission"

# Garantir que as permissoes estejam corretas
```

### Agente nao executa comandos

**Problema:** O agente nao executa comandos bash.

**Causa:** As permissoes de bash estao configuradas como "deny" ou "ask".

**Solucao:** Verifique o arquivo `.md` do agente e garanta que as permissoes estejam corretas:

```yaml
permission:
  bash:
    "*": allow
```

### Task tool nao funciona

**Problema:** O `@aiox-master` nao consegue invocar outros agentes.

**Causa:** A permisso `task` nao esta habilitada.

**Solucao:** Verifique o `opencode.json`:

```json
{
  "agent": {
    "aiox-master": {
      "permission": {
        "task": { "*": "allow" }
      }
    }
  }
}
```

---

## Problemas com MCPs

### HexStrike nao conecta

**Erro:**
```
MCP server hexstrike failed to connect
```

**Causas possiveis:**
1. Servidor nao esta rodando
2. Porta 8888 em uso
3. Caminhos incorretos no opencode.json

**Solucao:**
```bash
# Verificar se o servidor esta rodando
ps aux | grep hexstrike_mcp

# Verificar se a porta esta em uso
netstat -an | findstr 8888

# Reiniciar o servidor
cd ~/hexstrike-ai
.\hexstrike-env\Scripts\python.exe hexstrike_mcp.py --server http://localhost:8888
```

### Pentest MCP container nao inicia

**Erro:**
```
Error: No such container: pentest-mcp
```

**Causa:** O container nao foi criado ou foi removido.

**Solucao:**
```bash
# Verificar se o container existe
docker ps -a | grep pentest-mcp

# Se nao existir, criar novamente
docker run -d --name pentest-mcp -p 8888:8888 pentest-mcp/pentest-mcp:latest

# Se existir mas estiver parado
docker start pentest-mcp
```

### Timeout nas requisicoes MCP

**Erro:**
```
Request timeout after 300000ms
```

**Causa:** A requisicao demorou mais que o timeout configurado.

**Solucao:** Aumente o timeout no `opencode.json`:

```json
{
  "mcp": {
    "hexstrike": {
      "timeout": 600000
    }
  }
}
```

### Ferramenta MCP nao encontrada

**Erro:**
```
Unknown tool: hexstrike_nmap_scan
```

**Causa:** A ferramenta nao existe no MCP ou nao esta habilitada.

**Solucao:**
```bash
# Verificar ferramentas disponiveis no HexStrike
cd ~/hexstrike-ai
python hexstrike_mcp.py --list-tools

# Verificar permissoes no opencode.json
```

---

## Problemas com Docker

### Docker nao inicia (Windows)

**Erro:**
```
Cannot connect to the Docker daemon
```

**Solucao:**
1. Abra o Docker Desktop
2. Aguarde a inicializacao completa
3. Verifique se o WSL2 esta instalado: `wsl --status`
4. Reinicie o Docker Desktop

### Docker nao inicia (Linux)

**Solucao:**
```bash
# Verificar status do servico
sudo systemctl status docker

# Iniciar o servico
sudo systemctl start docker

# Habilitar na inicializacao
sudo systemctl enable docker
```

### Permissoes negadas (Linux)

**Erro:**
```
permission denied while trying to connect to the Docker daemon socket
```

**Solucao:**
```bash
# Adicionar usuario ao grupo docker
sudo usermod -aG docker $USER

# Ativar as mudancas
newgrp docker

# Verificar
docker ps
```

### Espaco em disco insuficiente

**Erro:**
```
no space left on device
```

**Solucao:**
```bash
# Limpar containers parados
docker container prune

# Limpar imagens nao utilizadas
docker image prune -a

# Limpar tudo
docker system prune -a

# Verificar espaco
docker system df
```

### Container nao para

**Solucao:**
```bash
# Forcar parada
docker stop -t 0 pentest-mcp

# Remover
docker rm -f pentest-mcp
```

### Porta 8888 em uso

**Solucao:**
```bash
# Encontrar o processo
# Windows
netstat -ano | findstr :8888

# macOS/Linux
lsof -i :8888

# Matar o processo (substitua PID)
kill PID

# Ou usar outra porta
docker run -d --name pentest-mcp -p 8889:8888 pentest-mcp/pentest-mcp:latest
```

---

## Problemas com Python

### Python nao encontrado

**Erro:**
```
'python' is not recognized as an internal or external command
```

**Solucao:**
```bash
# Verificar se Python esta instalado
python --version

# Se nao estiver:
# Windows: https://www.python.org/downloads/ (marque "Add to PATH")
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
# Atualizar pip
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

---

## Problemas com OpenCode

### OpenCode nao inicia

**Solucao:**
```bash
# Verificar se o OpenCode esta instalado
opencode --version

# Reinstalar se necessario
npm install -g opencode
```

### Configuracao nao e reconhecida

**Solucao:**
```bash
# Verificar se o arquivo existe
ls ~/.config/opencode/opencode.json

# Verificar se e JSON valido
cat ~/.config/opencode/opencode.json | python -m json.tool
```

### Agentes nao aparecem

**Solucao:**
```bash
# Verificar se os agentes estao instalados
aiox-global list

# Reinstalar se necessario
aiox-global init
```

---

## Comandos Uteis

### Verificacao de Saude

```bash
# Verificacao completa
aiox-global doctor

# Listar agentes
aiox-global list

# Verificar Docker
docker ps

# Verificar Python
python --version

# Verificar Node.js
node --version
```

### Limpeza

```bash
# Remover agentes AIOX
aiox-global uninstall

# Remover container Docker
docker rm -f pentest-mcp

# Remover HexStrike
rm -rf ~/hexstrike-ai

# Limpar Docker
docker system prune -a
```

### Reinicializacao

```bash
# Reiniciar Docker (Linux)
sudo systemctl restart docker

# Reiniciar OpenCode
# Feche e abra novamente
```

---

## Suporte

Se nenhum das solucoes acima resolver seu problema:

1. Execute `aiox-global doctor` e cole a saida
2. Verifique os logs do Docker: `docker logs pentest-mcp`
3. Verifique os logs do OpenCode
4. Abra uma issue no repositorio
