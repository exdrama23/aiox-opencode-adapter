# Guia dos Servidores MCP

[English](../en/MCP-GUIDE.md) | **Portugues**

---

## Indice

1. [O que e MCP](#o-que-e-mcp)
2. [MCPs Incluidos](#mcps-incluidos)
3. [Configuracao](#configuracao)
4. [Permissoes](#permissoes)
5. [Diferencas entre MCPs](#diferencas-entre-mcps)
6. [Solucao de Problemas](#solucao-de-problemas)

---

## O que e MCP

MCP (Model Context Protocol) e um protocolo que permite ao OpenCode se comunicar com ferramentas externas. Pense nele como uma "ponte" entre o agente de IA e ferramentas reais de seguranca.

### Como funciona

```
+------------------+     MCP     +------------------+
|  Agente de IA    | <--------> |  Ferramenta      |
|  (OpenCode)      |             |  Externa         |
+------------------+             +------------------+
       |                                |
       v                                v
  Prompt/Resposta              Execucao real
```

### Fluxo de uma requisicao

1. O agente de IA decide usar uma ferramenta
2. O OpenCode envia a requisicao via MCP
3. O servidor MCP executa a ferramenta
4. O resultado e retornado ao agente
5. O agente processa e apresenta o resultado

---

## MCPs Incluidos

O AIOX OpenCode Adapter inclui configuracao para dois MCPs de seguranca:

### HexStrike AI

| Propriedade | Valor |
|-------------|-------|
| Nome | hexstrike |
| Tipo | Servidor Python |
| Ferramentas | 100+ |
| Porta | 8888 |
| Requisitos | Python, pip, Git |
| Comando de instalacao | aiox-global setup-hexstrike |

### Pentest MCP

| Propriedade | Valor |
|-------------|-------|
| Nome | pentest-mcp |
| Tipo | Container Docker |
| Ferramentas | Variadas |
| Porta | 8888 |
| Requisitos | Docker |
| Comando de instalacao | aiox-global setup-pentest |

---

## Configuracao

### Configuracao Automatica

```bash
aiox-global config
```

Este comando:
1. Le o template de configuracao
2. Auto-detecta HexStrike (verifica se o arquivo existe)
3. Auto-detecta Pentest MCP (verifica se o container esta rodando)
4. Gera o arquivo `~/.config/opencode/opencode.json`
5. Faz backup da configuracao existente

### Configuracao Manual

Edite o arquivo `~/.config/opencode/opencode.json`:

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

### Estrutura do Arquivo de Configuracao

| Campo | Descricao | Valores |
|-------|-----------|---------|
| type | Tipo de conexao | "local" |
| command | Comando para iniciar o MCP | Array de strings |
| enabled | Habilitado ou nao | true/false |
| timeout | Timeout em milissegundos | 300000 (5 minutos) |

---

## Permissoes

### Como funcionam as permissoes MCP

As ferramentas MCP seguem o padrao de nomenclatura `<server>_<tool>`. Para permitir acesso a todas as ferramentas de um MCP, use o curinga `*`.

### Permissoes para HexStrike

```yaml
permission:
  hexstrike_*: allow
```

Isso permite todas as 100+ ferramentas do HexStrike, incluindo:
- hexstrike_nmap_scan
- hexstrike_nuclei_scan
- hexstrike_sqlmap_scan
- hexstrike_hydra_attack
- hexstrike_metasploit_run
- E muitas outras...

### Permissoes para Pentest MCP

```yaml
permission:
  pentest-mcp_*: allow
```

Isso permite todas as ferramentas do Pentest MCP.

### Onde configurar as permissoes

As permissoes podem ser configuradas em dois niveis:

**Nivel global** (opencode.json):

```json
{
  "permission": {
    "hexstrike_*": "allow",
    "pentest-mcp_*": "allow"
  }
}
```

**Nivel de agente** (arquivo .md do agente):

```yaml
permission:
  hexstrike_*: allow
  pentest-mcp_*: allow
```

### Diferenca entre niveis

| Nivel | Escopo | Onde configurar |
|-------|--------|-----------------|
| Global | Todos os agentes | opencode.json |
| Agente | Apenas um agente | agents/*.md |

---

## Diferencas entre MCPs

### Tabela Comparativa

| Aspecto | HexStrike | Pentest MCP |
|---------|-----------|-------------|
| **Tipo** | Servidor Python MCP | Container Docker |
| **Isolamento** | Roda no sistema do usuario | Roda isolado no container |
| **Instalacao** | Requer Python + pip | Requer Docker |
| **Atualizacao** | git pull + pip install | docker pull |
| **Remocao** | Deletar diretorio | docker rm |
| **Recursos** | Usa RAM/CPU do sistema | Limite configuravel via Docker |
| **Portas** | Configuravel | Configuravel |
| **Logs** | Arquivo de log | docker logs |
| **Dependencias** | Gerenciadas pelo pip | Embutidas no container |

### Quando usar cada um

**Use HexStrike quando:**
- Voce quer acesso completo a 100+ ferramentas
- Ja tem Python instalado
- Prefere gerenciar dependencias manualmente
- Precisa de flexibilidade para personalizar

**Use Pentest MCP quando:**
- Quer uma solucao mais simples
- Ja tem Docker instalado
- Prefere isolamento total
- Nao quer se preocupar com dependencias

**Use ambos quando:**
- Quer cobertura maxima de ferramentas
- Precisa de redundancia
- Vai usar diferentes agentes para diferentes tarefas

### Exemplo de Uso Combinado

```bash
# Configurar ambos
aiox-global setup-hexstrike
aiox-global setup-pentest
aiox-global config

# O agente @cybersec pode usar qualquer um
# Via HexStrike: hexstrike_nmap_scan
# Via Pentest MCP: pentest-mcp_nmap_scan
```

---

## Solucao de Problemas

### MCP nao conecta

**Verificar se o servidor esta rodando:**

```bash
# HexStrike
ps aux | grep hexstrike_mcp

# Pentest MCP
docker ps | grep pentest-mcp
```

**Verificar a porta:**

```bash
# Windows
netstat -an | findstr 8888

# macOS/Linux
lsof -i :8888
```

### Timeout nas requisicoes

Aumente o timeout na configuracao:

```json
{
  "mcp": {
    "hexstrike": {
      "timeout": 600000
    }
  }
}
```

### Ferramenta nao encontrada

Verifique se a ferramenta esta habilitada no MCP:

```bash
# Listar ferramentas disponiveis
# (varia de acordo com o MCP)
```

### Erro de permissao

Verifique as permissoes no `opencode.json` ou no arquivo do agente:

```json
{
  "permission": {
    "hexstrike_*": "allow"
  }
}
```

---

## Proximos Passos

Apos configurar os MCPs:

1. [Conhecer os Agentes](AGENTS.md)
2. [Solucao de Problemas](TROUBLESHOOTING.md)
