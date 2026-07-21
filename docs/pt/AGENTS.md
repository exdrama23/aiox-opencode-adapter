# Guia dos Agentes

[English](../en/AGENTS.md) | **Portugues**

---

## Indice

1. [Visao Geral](#visao-geral)
2. [Como Invocar Agentes](#como-invocar-agentes)
3. [Agentes Primarios](#agentes-primarios)
4. [Subagentes](#subagentes)
5. [Orquestracao](#orquestracao)
6. [Exemplos de Uso](#exemplos-de-uso)

---

## Visao Geral

O AIOX OpenCode Adapter inclui 13 agentes de IA especializados. Cada agente tem uma funcao especifica e trabalha em conjunto para completar tarefas complexas.

### Tabela de Agentes

| Agente | Nome | Papel | Modo | Cor |
|--------|------|-------|------|-----|
| `@aiox-master` | Orion | Orquestrador Mestre | primary | #9C27B0 |
| `@dev` | Dex | Desenvolvedor Full Stack | subagent | #2196F3 |
| `@architect` | Aria | Arquiteta de Sistemas | subagent | #9C27B0 |
| `@sm` | Sage | Scrum Master | subagent | #4CAF50 |
| `@pm` | Pulse | Product Manager | subagent | #FF9800 |
| `@po` | Pixel | Product Owner | subagent | #E91E63 |
| `@qa` | Quartz | Garantia de Qualidade | subagent | #F44336 |
| `@analyst` | Apex | Analista de Negocios | subagent | #00BCD4 |
| `@devops` | Flux | Engenheiro DevOps | subagent | #607D8B |
| `@data-engineer` | Schema | Engenheira de Dados | subagent | #795548 |
| `@ux-design-expert` | Vista | Design UX/UI | subagent | #E91E63 |
| `@squad-creator` | Nexus | Criador de Squads | subagent | #673AB7 |
| `@cybersec` | Kira | Analista de Seguranca | subagent | #F44336 |

---

## Como Invocar Agentes

### Via Tab (Agentes Primarios)

Pressione `Tab` para alternar entre os agentes primarios:
- `build` - Modo de construcao (padrao do OpenCode)
- `plan` - Modo de planejamento
- `aiox-master` - Orquestrador AIOX

### Via @ (Qualquer Agente)

Digite `@` seguido do nome do agente para invoca-lo diretamente:

```
@dev Crie uma funcao em Python
@architect Desenhe a arquitetura do sistema
@qa Revise este codigo
@cybersec Escaneie este alvo
```

### Via task (Orquestracao)

O `@aiox-master` pode invocar outros agentes automaticamente via a ferramenta `task`:

```
aiox-master: "Crie uma API REST completa"
→ Orquestra: @analyst → @architect → @pm → @sm → @dev → @qa → @devops
```

---

## Agentes Primarios

### @aiox-master (Orion)

**Descricao:** Orquestrador Mestre do AIOX. Coordena todos os outros agentes para completar tarefas complexas.

**Funcao:**
- Analisa a tarefa recebida
- Divide em sub-tarefas
- Invoca os agentes adequados
- Coordena o fluxo de trabalho
- Consolida resultados

**Permissoes:**
- edit: allow
- bash: ask (com excecoes para git, node, npm)
- read: allow
- glob: allow
- grep: allow
- skill: allow
- task: allow (pode invocar outros agentes)
- webfetch: allow
- websearch: allow

**Exemplo de uso:**

```
Usuario: "Crie um site completo de e-commerce com carrinho de compras"

Orion orquestra:
1. @analyst - Analisa requisitos de negocio
2. @architect - Define arquitetura tecnica
3. @pm - Cria historias de usuario
4. @sm - Planeja sprints
5. @dev - Implementa o codigo
6. @qa - Testa e revisa
7. @devops - Faz deploy
```

---

## Subagentes

### @dev (Dex)

**Descricao:** Desenvolvedor Full Stack. Implementa codigo, depura, refatora e roda testes.

**Ferramentas:**
- Edicao de arquivos
- Execucao de comandos (git, npm, node)
- Leitura de arquivos
- Busca em codigo

**Cenarios de uso:**
- Criar novas funcoes e componentes
- Implementar APIs
- Corrigir bugs
- Refatorar codigo
- Escrever testes

**Exemplo:**

```
@dev Crie uma funcao em Python que valida CPF brasileiro
```

**Resposta esperada:**
Dex vai:
1. Criar a funcao com validacao completa
2. Tratar excecoes
3. Adicionar docstrings
4. Sugerir testes unitarios

---

### @architect (Aria)

**Descricao:** Arquiteta de Sistemas. Define arquitetura, seleciona stack tecnico, projeta APIs e cria diagramas.

**Ferramentas:**
- Leitura de arquivos existentes
- Analise de estrutura do projeto
- Documentacao

**Cenarios de uso:**
- Definir arquitetura de microservicos
- Selecionar stack tecnico
- Projetar endpoints de API
- Criar diagramas de arquitetura
- Revisar decisoes tecnicas

**Exemplo:**

```
@architect Defina a arquitetura para um sistema de chat em tempo real
```

**Resposta esperada:**
Aria vai:
1. Analisar os requisitos
2. Sugerir WebSocket ou Server-Sent Events
3. Definir a estrutura de pastas
4. Criar diagrama de arquitetura
5. Documentar decisoes tecnicas

---

### @sm (Sage)

**Descricao:** Scrum Master. Gerencia sprints e cria historias de usuario detalhadas.

**Ferramentas:**
- Leitura de arquivos
- Escrita de historias
- Gerenciamento de backlog

**Cenarios de uso:**
- Criar historias de usuario
- Planejar sprints
- Gerenciar backlog
- Facilitar daily standups
- Remover impedimentos

**Exemplo:**

```
@sm Crie historias de usuario para o modulo de autenticacao
```

**Resposta esperada:**
Sage vai:
1. Decompor o modulo em funcionalidades
2. Criar historias com criterios de aceite
3. Estimar esforco
4. Definir dependencias
5. Sugerir ordem de implementacao

---

### @pm (Pulse)

**Descricao:** Product Manager. Cria PRD, gerencia epics e define estrategia de produto.

**Ferramentas:**
- Analise de mercado
- Definicao de roadmap
- Priorizacao de funcionalidades

**Cenarios de uso:**
- Criar PRD (Product Requirements Document)
- Definir roadmap do produto
- Priorizar funcionalidades
- Analisar concorrencia
- Definir metricas de sucesso

**Exemplo:**

```
@pm Crie um PRD para um aplicativo de delivery de comida
```

**Resposta esperada:**
Pulse vai:
1. Definir publico-alvo
2. Listar funcionalidades principais
3. Definir prioridades (MVP vs futuro)
4. Criar roadmap
5. Definir KPIs

---

### @po (Pixel)

**Descricao:** Product Owner. Gerencia backlog e aplica Definition of Done.

**Ferramentas:**
- Gerenciamento de backlog
- Refinamento de historias
- Definicao de criterios de aceite

**Cenarios de uso:**
- Gerenciar product backlog
- Refinar historias de usuario
- Aplicar Definition of Done
- Priorizar tarefas
- Validar entregas

**Exemplo:**

```
@po Refine as historias de usuario do sprint atual
```

**Resposta esperada:**
Pixel vai:
1. Revisar historias existentes
2. Adicionar criterios de aceite
3. Verificar estimativas
4. Identificar dependencias
5. Sugerir ordem de execucao

---

### @qa (Quartz)

**Descricao:** Garantia de Qualidade. Revisa codigo, aplica gates de qualidade e executa testes.

**Ferramentas:**
- Revisao de codigo
- Execucao de testes
- Analise de cobertura

**Cenarios de uso:**
- Revisar codigo
- Escrever testes unitarios
- Escrever testes de integracao
- Verificar cobertura de testes
- Validar qualidade do codigo

**Exemplo:**

```
@qa Revise o codigo do modulo de pagamentos
```

**Resposta esperada:**
Quartz vai:
1. Analisar o codigo linha por linha
2. Identificar problemas de seguranca
3. Verificar padroes de codigo
4. Sugerir melhorias
5. Criar testes para cenarios criticos

---

### @analyst (Apex)

**Descricao:** Analista de Negocios. Faz pesquisa de mercado, analisa concorrencia e levanta requisitos.

**Ferramentas:**
- Web search
- Analise de dados
- Documentacao

**Cenarios de uso:**
- Pesquisa de mercado
- Analise de concorrencia
- Levantamento de requisitos
- Brainstorming
- Definicao de personas

**Exemplo:**

```
@analyst Pesquise as funcionalidades principais de aplicativos de streaming
```

**Resposta esperada:**
Apex vai:
1. Listar aplicativos principais (Netflix, Spotify, etc.)
2. Analisar funcionalidades
3. Identificar diferencias
4. Sugerir funcionalidades para o seu projeto
5. Criar comparativo

---

### @devops (Flux)

**Descricao:** Engenheiro DevOps. Gerencia git push, criacao de PRs, CI/CD e deploy. E o UNICO agente que pode fazer push para o remoto.

**Ferramentas:**
- Git (push, commit, PR)
- CI/CD
- Deploy
- Infraestrutura

**Cenarios de uso:**
- Criar pull requests
- Configurar pipelines de CI/CD
- Fazer deploy
- Gerenciar infraestrutura
- Configurar ambientes

**Exemplo:**

```
@devops Crie um PR com as alteracoes do modulo de autenticacao
```

**Resposta esperada:**
Flux vai:
1. Verificar alteracoes no git
2. Criar branch com nome descritivo
3. Commitar com mensagem clara
4. Criar PR com descricao detalhada
5. Sugerir revisores

---

### @data-engineer (Schema)

**Descricao:** Engenheira de Dados. Projeta schemas de banco de dados, migracoes e otimiza queries.

**Ferramentas:**
- Modelagem de dados
- SQL
- Migracoes
- Otimizacao de queries

**Cenarios de uso:**
- Projetar schemas de banco de dados
- Criar migracoes
- Otimizar queries
- Definir politicas RLS
- Modelar dados

**Exemplo:**

```
@data-engineer Projete o schema do banco de dados para um sistema de e-commerce
```

**Resposta esperada:**
Schema vai:
1. Listar entidades principais (usuarios, produtos, pedidos)
2. Definir tabelas e colunas
3. Criar relacoes (FK)
4. Sugerir indexes
5. Criar migracoes SQL

---

### @ux-design-expert (Vista)

**Descricao:** Design UX/UI. Cria design systems, wireframes e garante acessibilidade.

**Ferramentas:**
- Analise de usabilidade
- Design patterns
- Acessibilidade

**Cenarios de uso:**
- Criar design systems
- Projetar wireframes
- Revisar usabilidade
- Garantir acessibilidade (WCAG)
- Definir design tokens

**Exemplo:**

```
@ux-design-expert Crie um design system para o aplicativo
```

**Resposta esperada:**
Vista vai:
1. Definir paleta de cores
2. Criar tipografia
3. Definir espacamento
4. Criar componentes reutilizaveis
5. Documentar padroes

---

### @squad-creator (Nexus)

**Descricao:** Criador de Squads. Cria, valida e publica squads de agentes para workflows automatizados.

**Ferramentas:**
- Criacao de agentes
- Validacao de workflows
- Publicacao de squads

**Cenarios de uso:**
- Criar squads personalizados
- Validar workflows
- Publicar squads
- Gerenciar squads existentes

**Exemplo:**

```
@squad-creator Crie um squad para desenvolvimento mobile
```

**Resposta esperada:**
Nexus vai:
1. Definir agentes necessarios
2. Configurar permissoes
3. Criar workflows
4. Validar o squad
5. Publicar

---

### @cybersec (Kira)

**Descricao:** Analista de Seguranca. Faz pentesting, escaneamento de vulnerabilidades, auditoria de seguranca e analise de ameacas.

**Ferramentas MCP:**
- hexstrike_* (100+ ferramentas de pentest)
- pentest-mcp_* (ferramentas adicionais)

**Ferramentas bash:**
- nmap, nuclei, subfinder, gau, httpx
- katana, ffuf, whatweb, wafw00f
- nikto, sqlmap, dalfox, commix
- git, grep, curl

**Cenarios de uso:**
- Pentesting completo
- Escaneamento de vulnerabilidades
- Auditoria de seguranca
- Analise de ameacas
- Testes de penetracao

**Exemplo:**

```
@cybersec Faca um pentest completo no site exemplo.com
```

**Resposta esperada:**
Kira vai:
1. Confirmar autorizacao
2. Fazer reconhecimento passivo
3. Escanear portas e servicos
4. Identificar vulnerabilidades
5. Gerar relatorio com CVSS

**Fluxo detalhado:**

```
1. Reconhecimento
   → hexstrike_subfinder_scan (subdominios)
   → hexstrike_gau_discovery (URLs historicas)

2. Escaneamento
   → hexstrike_nmap_scan (portas)
   → hexstrike_nuclei_scan (vulnerabilidades)

3. Enumeracao
   → hexstrike_dirsearch_scan (diretorios)
   → hexstrike_wafw00f_scan (WAF)

4. Exploracao (com autorizacao)
   → hexstrike_sqlmap_scan (SQL injection)
   → hexstrike_dalfox_xss_scan (XSS)

5. Relatorio
   → Gerar relatorio com achados
   → Classificar por severidade CVSS
   → Sugerir remediacao
```

---

## Orquestracao

### Como o aiox-master coordena

O `@aiox-master` (Orion) e o agente orquestrador. Quando voce lhe da uma tarefa complexa, ele:

1. **Analisa** a tarefa e identifica os agentes necessarios
2. **Planeja** a ordem de execucao
3. **Invoca** cada agente via ferramenta `task`
4. **Coordena** o fluxo de trabalho
5. **Consolida** os resultados

### Exemplo de Fluxo Completo

```
Usuario: "Crie um blog com autenticacao e sistema de posts"

Orion executa:

Fase 1: Planejamento
  → @analyst: "Analise requisitos para blog"
  → @architect: "Defina arquitetura para blog com auth"
  → @pm: "Crie historias de usuario"

Fase 2: Implementacao
  → @sm: "Planeje sprint de implementacao"
  → @dev: "Implemente modulo de autenticacao"
  → @dev: "Implemente modulo de posts"
  → @data-engineer: "Projete schema do banco"

Fase 3: Qualidade
  → @qa: "Revise todo o codigo"
  → @qa: "Escreva testes unitarios"

Fase 4: Deploy
  → @devops: "Configure CI/CD"
  → @devops: "Faca deploy"
```

### Comandos dos Agentes

Cada agente pode ter comandos especificos. Exemplos:

| Agente | Comando | Descricao |
|--------|---------|-----------|
| @sm | *create-story | Cria uma historia de usuario |
| @dev | *execute-subtask | Executa uma sub-tarefa |
| @qa | *review-build | Revisa uma construcao |
| @devops | *create-worktree | Cria um worktree git |
| @pm | *gather-requirements | Coleta requisitos |

---

## Exemplos de Uso

### Exemplo 1: Criar API REST

```
Usuario: @aiox-master Crie uma API REST para gerenciamento de tarefas com Node.js

Orion orquestra:
1. @architect: "Defina a arquitetura da API"
   → Resultado: Express.js, SQLite, JWT auth

2. @data-engineer: "Projete o schema"
   → Resultado: tabelas users, tasks, categories

3. @dev: "Implemente a API"
   → Resultado: rotas CRUD completas

4. @qa: "Revise e teste"
   → Resultado: 95% cobertura, sem vulnerabilidades

5. @devops: "Faca deploy"
   → Resultado: API rodando em producao
```

### Exemplo 2: Pentest

```
Usuario: @cybersec Faca um pentest no site exemplo.com

Kira executa:
1. Confirma autorizacao
2. Reconhecimento passivo
   → subfinder, gau, httpx
3. Escaneamento ativo
   → nmap, nuclei, nikto
4. Enumeracao
   → dirsearch, ffuf
5. Testes de injecao
   → sqlmap, dalfox
6. Relatorio final
   → 15 vulnerabilidades encontradas
   → 3 criticas, 5 altas, 7 medias
```

### Exemplo 3: Revisao de Codigo

```
Usuario: @qa Revise o codigo do src/auth.js

Quartz executa:
1. Analise estatica
   → Verifica padroes de codigo
2. Analise de seguranca
   → Verifica vulnerabilidades
3. Analise de performance
   → Identifica gargalos
4. Sugestoes
   → 12 melhorias sugeridas
5. Testes
   → Cria 8 testes unitarios
```

---

## Proximos Passos

1. [Solucao de Problemas](TROUBLESHOOTING.md)
2. [Guia dos MCPs](MCP-GUIDE.md)
