# Changelog

Todas as mudancas notaveis neste projeto serao documentadas neste arquivo.

O formato e baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.4.3] - 2026-11-25

### Corrigido
- `aiox-global update`: consulta o registry por HTTPS direto em vez de spawnar `npm view`; o comando caiu de ~9 s para ~0,6 s e o `prepublishOnly` deixou de depender de um subprocesso npm
- `update` comparava versoes por igualdade de string; agora usa comparacao semver numerica (`1.10.0` > `1.9.9`)
- `bin/update-checker.js`: uma consulta que falhava gravava `latestVersion: undefined` no cache de 24 h e escondia o aviso de atualizacao; agora falhas nao sao cacheadas
- `bin/update-checker.js`: timeout de 3 s na consulta (antes podia segurar o boot do CLI indefinidamente)
- `package.json`: `repository.url` normalizado para `git+https://...git` (eliminava o warning `npm auto-corrected some errors` em todo publish)

### Adicionado
- `tests/release.test.js`: guard do campo `files` e verificacao do conteudo real do tarball (`npm pack --dry-run --json`), garantindo que `plugins/`, `scripts/`, `lib/`, `templates/` e os 13 agentes sempre sejam publicados
- Teste de `update` offline: registry inalcancavel deve falhar rapido e com mensagem clara
- `AIOX_REGISTRY_URL` para apontar a consulta de versao a um mirror ou a um registry de teste

## [1.4.2] - 2026-11-25

### Adicionado
- Suporte nativo ao OpenCode 2.4.1: `mcp` convertido para o formato V2 `mcp.servers` (`disabled` + `timeout.catalog/execution`)
- `lib/opencodeCompat.js`: `convertMcpV1ToV2`, `convertMcpV2ToV1`, `normalizeMcp`, `convertPluginV1ToV2`, `convertPluginV2ToV1`, `normalizePlugins`, `normalizeAgentV1/V2` e `dropRedundantAgentPermissions`
- Plugin `aiox-update` portado para a API de plugins V2 (`{ id, setup }`) mantendo o entrypoint legado `server()` para OpenCode 1.18.29+
- Parte TUI do plugin (`plugins/aiox-update/tui.js`) para exibir o toast de nova versao no OpenCode 2
- `scripts/validate-agents.js`: deteccao de chaves YAML duplicadas (agentes com frontmatter invalido eram ignorados silenciosamente)
- Testes de conversao V1/V2 para permissoes, MCP, plugins e agentes (`tests/opencodeCompat.test.js`)

### Corrigido
- **Pacote npm incompleto (bloqueador de release)**: `files` nao incluia `plugins/` nem `scripts/`, entao o tarball publicado vinha sem `plugins/aiox-update` e `aiox-global init` instalava os agentes mas pulava o notificador silenciosamente
- **Testes destruiam a instalacao real**: `tests/cli.test.js` e `tests/integration.test.js` rodavam `init`, `uninstall`, `preset` e `config` contra o `~/.config/opencode` do usuario; como `prepublishOnly` executa `npm test`, publicar reescrevia a config do mantenedor. Agora cada arquivo de teste usa um HOME temporario (`tests/helpers/sandbox.js`)
- `agents/cybersec.md`: chave YAML duplicada `"tcpdump *"` fazia o OpenCode 2 pular o agente com `agent file skipped`
- Plugin `aiox-update` falhava no OpenCode 2 com `Plugin must export a default definition with an id and an effect or setup function`
- Plugin passa a ser instalado como diretorio (`plugins/aiox-update/index.js` + `tui.js` + `package.json` + `version.json`), com migracao automatica do arquivo unico legado
- `aiox-global config`: MCPs eram gravados no formato V1 dentro de `mcp.servers`; agora sao normalizados antes de escrever a config
- `aiox-global doctor` e `uninstall` reconhecem o plugin novo e o formato `mcp.servers`
- `agents/aiox-master.md` referenciava a ferramenta `task` (52 ocorrencias), inexistente no OpenCode 2 — o orquestrador podia tentar uma chamada invalida. Agora usa `subagent(agent, description, prompt)`
- `agents/aiox-master.md`: prompt reduzido de ~13.3k para ~3.8k caracteres (~3.3k → ~830 tokens por requisicao), removendo 9 blocos de exemplo repetidos e mantendo roteamento, dependencias e paralelismo; adicionada secao de disciplina de tokens
- Permissoes de agente duplicadas: o `.md` e a config declaravam as mesmas regras (43 entradas para `aiox-master`, 13 redundantes). As permissoes da config sao removidas para todo agente com `.md` instalado; OpenCode continua mesclando as do arquivo
- Removido o campo invalido `version` do frontmatter dos 13 agentes
- `.gitignore` passa a ignorar `*.tgz` (artefatos de `npm pack`)

### Limites conhecidos
- O notificador `aiox-update` é carregado como diretório (`plugins/aiox-update/`), formato do OpenCode 2. No OpenCode 1.x, que descobre apenas arquivos em `plugins/*.js`, ele não é carregado — os agentes e a config V1 continuam funcionando.
- O toast do notificador depende da API TUI do OpenCode 2 e só pode ser verificado com a interface aberta; falhas são capturadas e não derrubam a TUI.
- `OPENCODE_CONFIG_DIR` é usado apenas pelo `aiox-global`; o OpenCode 2.4.1 resolve a config por `$HOME/.config/opencode` e ignora a variável. O `doctor` avisa quando ela está definida.

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
