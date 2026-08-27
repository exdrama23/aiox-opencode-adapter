# Changelog

Todas as mudancas notaveis neste projeto serao documentadas neste arquivo.

O formato e baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.4.0] - 2026-08-27

### Adicionado
- Compatibilidade DUAL OpenCode V1 (1.18.23) + V2 beta sem breaking change — `templates/opencode.json` agora gera `agent` + `agents` e `permission` + `permissions` simultaneamente
- Novo modulo `lib/opencodeCompat.js` com `convertV1ToV2`, `convertV2ToV1`, `resolveOpencodeDir` e parsers bidirecionais (`bash`↔`shell`, `task`↔`subagent`, `write`/`patch`→`edit`)
- `bin/aiox-global.js`: `parseAgentFrontmatter` agora lê tanto `permission:` quanto `permissions:` e normaliza automaticamente; `cmdConfig` com dual-write idempotente (deduplicação por `action:resource`)
- `bin/aiox-global.js`: `resolveOpencodeDir()` com suporte Windows Desktop (`%APPDATA%\opencode` > `~/.config/opencode` > `%LOCALAPPDATA%\opencode`) e `OPENCODE_CONFIG_DIR` / `XDG_CONFIG_HOME`
- `cmdDoctor` agora mostra `Config directory` resolvido dinamicamente e alerta de duplicação no Windows

### Melhorado
- `templates/opencode.json`: `aiox-master` com 13 `permissions` V2 + `cybersec` com 149 `permissions` V2 espelhadas (170+ regras bash convertidas para shell)
- `scripts/validate-agents.js`: validação dual V1/V2, aceita ambos os formatos, warn se divergem (sem error)
- Retrocompatibilidade total: `agents/*.md` legados continuam válidos sem edição; geração funciona em OpenCode 1.17, 1.18.23 e 2.0 beta sem warnings

### Corrigido
- Template não mais gera entradas fantasmas (ferramentas `*2` removidas)
- Parser de frontmatter agora suporta `\r\n` (Windows) e aliases `shell`/`subagent`/`system`/`disabled`

## [1.3.0] - 2026-08-15

### Adicionado
- Branch `atualizacao` para compatibilidade OpenCode 1.18.23 + Desktop Windows

## [1.2.0] - 2026-07-23

### Adicionado
- Shebang `#!/usr/bin/env node` no `bin/aiox-global.js` (compatibilidade Linux/macOS)
- Comando `aiox-global --version` / `-v` para exibir versao
- Agente `@aiox-master` (Orion) adicionado ao array AGENTS
- Agente `@cybersec` (Kira) alterado para `mode: primary` (aparece no Tab)
- 3 novos exemplos de workflow no aiox-master: Scrum/Agile, Product Owner, Squad Creation
- Secao TASK ROUTING com mapeamento de keywords para agentes
- Secao DECOMPOSITION RULES para quebrar tarefas complexas
- Secao COMPLETION VERIFICATION para validar resultados
- Secao ERROR HANDLING detalhado para tratamento de falhas

### Corrigido
- Nomes dos agentes na documentacao agora correspondem aos arquivos .md reais
- Cores dos agentes na documentacao agora correspondem aos arquivos .md reais
- `package.json`: homepage e bugs apontam para o repositorio correto
- `package.json`: engines atualizado para `>=18.0.0`
- Numero de agentes padronizado para 13 em toda documentacao

### Documentacao
- Guia dos Agentes (PT/EN) atualizado com nomes e cores corretos
- README.md e README.en.md atualizados

## [1.1.0] - 2026-07-22

### Adicionado
- Comando `aiox-global auto-setup` para configuracao completa automatica
- Comando `aiox-global customize` para personalizar agentes
- Comando `aiox-global preset` com presets: dev, pentest, fullstack, agile, minimal
- Sistema de overrides em `~/.config/opencode/custom/`
- Comando `aiox-global update` para atualizar automaticamente
- Campo `version` no frontmatter de cada agente
- Testes de integracao (109 testes total)
- Quick Start Guide (PT/EN)
- Documentacao atualizada com presets e customizacao

### Melhorado
- Cybersec agent funciona sem MCPs (fallback para CLI)
- Config: Docker tratado como opcional (try/catch)
- Compatibilidade com AIOX-core verificada
- Fluxo completo: install → config → use
- Documentacao do usuario completa
- Documentacao do desenvolvedor

## [1.0.2] - 2026-07-22

### Corrigido
- URLs de repositorio na documentacao (AIOX-Squads → exdrama23)

## [1.0.1] - 2026-07-22

### Corrigido
- Compatibilidade do Jest com Node.js 16.x (downgrade para Jest 29.x)

## [1.0.0] - 2026-07-21

### Adicionado
- 12 agentes de IA especializados
- CLI `aiox-global` com comandos: init, config, setup-hexstrike, setup-pentest, list, doctor, uninstall
- Auto-deteccao de HexStrike e Pentest MCP
- Template `opencode.json` portavel
- Documentacao completa em Portugues e Ingles
- Testes automatizados com Jest (86 testes)
- Script de validacao de agentes
- CI/CD com GitHub Actions
- Permissoes MCP para agente cybersec (hexstrike_*, pentest-mcp_*)

### Agentes
- @aiox-master (Orion) - Orquestrador Mestre
- @dev (Dex) - Desenvolvedor Full Stack
- @architect (Aria) - Arquiteta de Sistemas
- @sm (River) - Scrum Master
- @pm (Morgan) - Product Manager
- @po (Pax) - Product Owner
- @qa (Quinn) - Garantia de Qualidade
- @analyst (Atlas) - Analista de Negocios
- @devops (Gage) - Engenheiro DevOps
- @data-engineer (Dara) - Engenheira de Dados
- @ux-design-expert (Uma) - Design UX/UI
- @squad-creator (Craft) - Criador de Squads
- @cybersec (Kira) - Analista de Seguranca
