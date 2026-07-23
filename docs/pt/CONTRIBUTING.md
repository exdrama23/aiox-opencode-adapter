# Contribuindo

[English](../../CONTRIBUTING.md) | **Portugues**

---

## Como Contribuir

Recebemos contribuicoes para o projeto AIOX OpenCode Adapter.

### Reportando Bugs

1. Verifique se o bug ja existe nas [Issues](https://github.com/exdrama23/aiox-opencode-adapter/issues)
2. Se nao existir, abra uma nova issue com:
   - Descricao clara do problema
   - Passos para reproduzir
   - Comportamento esperado vs real
   - Informacoes do sistema (SO, versao do Node.js, versao do npm)

### Sugerindo Features

1. Abra uma issue com o label "feature request"
2. Descreva a feature e seu caso de uso
3. Explique por que seria util

### Pull Requests

1. Faca fork do repositorio
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Faca suas alteracoes
4. Teste: `aiox-global doctor`
5. Faca commit: `git commit -m "feat: adicionar minha feature"`
6. Faca push: `git push origin feature/minha-feature`
7. Abra um Pull Request

### Padroes de Codigo

- Use formatacao consistente
- Adicione comentarios para logica complexa
- Siga padroes existentes
- Teste suas alteracoes

### Estrutura do Projeto

```
aiox-opencode-adapter/
  agents/           # Arquivos markdown dos agentes
  bin/              # Scripts CLI
  docs/             # Documentacao
    pt/             # Portugues
    en/             # Ingles
  templates/        # Templates de configuracao
  LICENSE           # Licenca MIT
  README.md         # README em Portugues
  README.en.md      # README em Ingles
  CONTRIBUTING.md   # Este arquivo
  package.json      # Pacote npm
```

### Adicionando um Novo Agente

1. Crie `agents/seu-agente.md` com frontmatter:
   ```yaml
   ---
   description: "Nome - Papel. Descricao."
   mode: subagent
   color: "#CORHEX"
   permission:
     edit: deny
     bash:
       "*": allow
     read: allow
   ---
   ```
2. Adicione ao array `AGENTS` em `bin/aiox-global.js`
3. Adicione o mapeamento do nome do agente em `AGENT_NAMES` em `scripts/validate-agents.js`
4. Adicione o mode esperado em `AGENT_MODES` em `scripts/validate-agents.js` (se for primary)
5. Adicione a cor esperada em `AGENT_COLORS` em `scripts/validate-agents.js`
6. Atualize a documentacao em `docs/pt/AGENTS.md` e `docs/en/AGENTS.md`

### Licenca

Ao contribuir, voce concorda que suas contribuicoes serao licenciadas sob a Licenca MIT.
