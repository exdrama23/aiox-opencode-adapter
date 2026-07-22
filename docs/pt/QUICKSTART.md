# Quick Start Guide

[English](../en/QUICKSTART.md) | **Portugues**

---

## Instalacao Rapida (2 minutos)

### 1. Instalar o Pacote

```bash
npm install -g aiox-opencode-adapter
```

### 2. Configurar Tudo Automaticamente

```bash
aiox-global auto-setup
```

### 3. Usar no OpenCode

Abra o OpenCode e use os agentes:

```
@dev Crie uma funcao em Python
@architect Defina a arquitetura do sistema
@cybersec Escaneie este alvo
@aiox-master Orquestre um time completo
```

---

## Comandos Essenciais

| Comando | Descricao |
|---------|-----------|
| `aiox-global auto-setup` | Configuracao completa automatica |
| `aiox-global init` | Instalar agentes |
| `aiox-global config` | Gerar configuracao |
| `aiox-global list` | Listar agentes instalados |
| `aiox-global doctor` | Verificar instalacao |
| `aiox-global update` | Atualizar para versao mais recente |

---

## Presets

```bash
# Time de desenvolvimento
aiox-global preset dev

# Pentest e seguranca
aiox-global preset pentest

# Time completo
aiox-global preset fullstack

# Gestao de projetos
aiox-global preset agile

# Apenas o basico
aiox-global preset minimal
```

---

## Personalizacao

```bash
# Copiar agente para personalizacao
aiox-global customize dev

# Editar o agente personalizado
# O arquivo estara em: ~/.config/opencode/custom/dev.md
```

---

## Proximos Passos

1. [Guia de Instalacao Detalhada](INSTALLATION.md)
2. [Guia dos Agentes](AGENTS.md)
3. [Guia dos MCPs](MCP-GUIDE.md)
4. [Solucao de Problemas](TROUBLESHOOTING.md)
