# Configuracao do Docker

[English](../en/DOCKER-SETUP.md) | **Portugues**

---

## Indice

1. [O que e Docker](#o-que-e-docker)
2. [Por que e necessario](#por-que-e-necessario)
3. [Instalacao do Docker](#instalacao-do-docker)
4. [Verificacao](#verificacao)
5. [Configuracao de Permissoes](#configuracao-de-permissoes)
6. [Gerenciamento de Container](#gerenciamento-de-container)
7. [Problemas Comuns](#problemas-comuns)

---

## O que e Docker

Docker e uma plataforma de containerizacao que permite executar aplicacoes isoladas do sistema operacional. Cada container e como uma maquina virtual leve que roda sua propria aplicacao com todas as dependencias necessarias.

### Diferenca entre VM e Container

| Caracteristica | VM (Maquina Virtual) | Container Docker |
|----------------|---------------------|------------------|
| Tamanho | Gigabytes | Megabytes |
| Tempo de inicializacao | Minutos | Segundos |
| Isolamento | Completo (sistema operacional) | Processo (nucleo compartilhado) |
| Recursos | Alto consumo | Baixo consumo |
| Portabilidade | Limitada | Alta |

### Como funciona

```
+------------------+
|  Sua Aplicacao   |
+------------------+
|  Container Docker|
+------------------+
|  Docker Engine   |
+------------------+
|  Nucleo Linux    |
+------------------+
```

O container roda em cima do Docker Engine, que por sua vez usa o nucleo do sistema operacional. Isso torna os containers muito mais eficientes que VMs.

---

## Por que e necessario

O Pentest MCP roda como um container Docker. Isso permite:

1. **Isolamento** - As ferramentas de pentest nao afetam seu sistema
2. **Portabilidade** - O mesmo container funciona em qualquer sistema operacional
3. **Seguranca** - Se algo der errado, o container e destruido sem danos
4. **Consistencia** - Todas as dependencias estao embutidas no container

### O que roda dentro do container

O container Pentest MCP inclui:
- Servidor MCP para comunicacao com o OpenCode
- Ferramentas de seguranca (nmap, nikto, etc.)
- Dependencias Python
- Configuracoes padrao

---

## Instalacao do Docker

### Windows

**Requisitos:**
- Windows 10/11 (64-bit)
- WSL2 (Windows Subsystem for Linux)
- 4GB de RAM disponivel

**Passo a passo:**

1. Baixe o Docker Desktop em: https://www.docker.com/products/docker-desktop/
2. Execute o instalador `Docker Desktop Installer.exe`
3. Marque a opcao "Use WSL 2 instead of Hyper-V"
4. Clique em "Ok" e aguarde a instalacao
5. Reinicie o computador
6. Abra o Docker Desktop e aguarde inicializar

**Verificacao:**

```bash
# Abra o PowerShell
docker --version
# Deve exibir: Docker version 24.x.x

docker ps
# Deve exibir uma tabela vazia (nenhum container rodando)
```

**Configuracao do WSL2 (se necessario):**

```bash
# No PowerShell como Administrador
wsl --install
# Reinicie o computador
wsl --set-default-version 2
```

### macOS

**Requisitos:**
- macOS 12.0 ou superior
- Chip Intel ou Apple Silicon

**Passo a passo:**

1. Baixe o Docker Desktop em: https://www.docker.com/products/docker-desktop/
   - Para Intel: `Docker Desktop for Mac - Intel Chip`
   - Para Apple Silicon: `Docker Desktop for Mac - Apple Chip`
2. Abra o arquivo `.dmg` baixado
3. Arraste o Docker para a pasta Applications
4. Abra o Docker
5. Aguarde a inicializacao

**Verificacao:**

```bash
# Abra o Terminal
docker --version
docker ps
```

### Linux (Ubuntu/Debian)

**Passo a passo:**

```bash
# Atualizar o indice de pacotes
sudo apt-get update

# Instalar dependencias
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Adicionar a chave GPG oficial do Docker
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Adicionar o repositorio
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar o Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verificar
docker --version
```

**Para Linux (Fedora):**

```bash
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
```

---

## Verificacao

Apos a instalacao, execute estes comandos para verificar se tudo esta funcionando:

```bash
# Verificar versao do Docker
docker --version
# Saida esperada: Docker version 24.x.x ou superior

# Verificar se o daemon esta rodando
docker info | head -5
# Deve exibir informacoes do sistema

# Executar container de teste
docker run hello-world
# Deve exibir: "Hello from Docker!"
```

### Verificacao Completa

```bash
# Listar containers (deve estar vazio)
docker ps

# Listar todos os containers (incluindo parados)
docker ps -a

# Listar imagens baixadas
docker images
```

---

## Configuracao de Permissoes

### Linux

No Linux, voce pode precisar adicionar seu usuario ao grupo docker para usar o Docker sem sudo:

```bash
# Adicionar usuario ao grupo docker
sudo usermod -aG docker $USER

# Ativar as mudancas (faça logout e login novamente)
newgrp docker

# Verificar
docker ps
# Agora deve funcionar sem sudo
```

### Windows/macOS

No Docker Desktop, va em Settings > Resources e verifique:
- CPU: pelo menos 2 nucleos
- Memory: pelo menos 2GB
- Disk image size: pelo menos 20GB

---

## Gerenciamento de Container

### Iniciar o Pentest MCP

```bash
# Baixar a imagem
docker pull pentest-mcp/pentest-mcp:latest

# Criar e iniciar o container
docker run -d --name pentest-mcp -p 8888:8888 pentest-mcp/pentest-mcp:latest

# Verificar se esta rodando
docker ps | grep pentest-mcp
```

### Parar o Container

```bash
# Parar o container
docker stop pentest-mcp

# Iniciar novamente
docker start pentest-mcp
```

### Remover o Container

```bash
# Parar e remover
docker stop pentest-mcp
docker rm pentest-mcp

# Ou em um unico comando
docker rm -f pentest-mcp
```

### Verificar Logs

```bash
# Ver logs em tempo real
docker logs -f pentest-mcp

# Ver ultimas 100 linhas
docker logs --tail 100 pentest-mcp
```

### Acessar o Container

```bash
# Abrir shell dentro do container
docker exec -it pentest-mcp /bin/bash

# Executar comando especifico
docker exec pentest-mcp ls /app
```

---

## Problemas Comuns

### Docker nao inicia

**Windows:**
1. Verifique se o WSL2 esta instalado: `wsl --status`
2. Reinicie o Docker Desktop
3. Verifique se o Hyper-V esta desabilitado (se usando WSL2)

**macOS:**
1. Abra o Docker Desktop
2. Va em Docker menu > Troubleshoot
3. Clique em "Reset to factory defaults"

**Linux:**
```bash
# Reiniciar o servico do Docker
sudo systemctl restart docker

# Verificar status
sudo systemctl status docker
```

### Permissoes negadas (Linux)

```bash
# Adicionar usuario ao grupo docker
sudo usermod -aG docker $USER

# Fazer logout e login novamente
```

### Espaco em disco insuficiente

```bash
# Limpar containers parados
docker container prune

# Limpar imagens nao utilizadas
docker image prune -a

# Verificar espaco
docker system df
```

### Container nao inicia

```bash
# Verificar logs
docker logs pentest-mcp

# Verificar se a porta ja esta em uso
netstat -an | grep 8888

# Tentar com outra porta
docker run -d --name pentest-mcp -p 8889:8888 pentest-mcp/pentest-mcp:latest
```

### Erro "Cannot connect to the Docker daemon"

```bash
# Windows/macOS: Abra o Docker Desktop

# Linux:
sudo systemctl start docker
sudo systemctl enable docker
```

---

## Proximos Passos

Apos configurar o Docker:

1. [Configurar HexStrike](HEXSTRIKE-SETUP.md)
2. [Configurar MCPs](MCP-GUIDE.md)
3. [Conhecer os Agentes](AGENTS.md)
