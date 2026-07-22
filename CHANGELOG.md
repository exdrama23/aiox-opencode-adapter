# Changelog

Todas as mudancas notaveis neste projeto serao documentadas neste arquivo.

O formato e baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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
- @sm (Sage) - Scrum Master
- @pm (Pulse) - Product Manager
- @po (Pixel) - Product Owner
- @qa (Quartz) - Garantia de Qualidade
- @analyst (Apex) - Analista de Negocios
- @devops (Flux) - Engenheiro DevOps
- @data-engineer (Schema) - Engenheira de Dados
- @ux-design-expert (Vista) - Design UX/UI
- @squad-creator (Nexus) - Criador de Squads
- @cybersec (Kira) - Analista de Seguranca
