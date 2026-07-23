# Contributing

English | [Portugues](docs/pt/CONTRIBUTING.md)

---

## How to Contribute

We welcome contributions to the AIOX OpenCode Adapter project.

### Reporting Bugs

1. Check if the bug already exists in [Issues](https://github.com/exdrama23/aiox-opencode-adapter/issues)
2. If not, open a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, Node.js version, npm version)

### Suggesting Features

1. Open an issue with the "feature request" label
2. Describe the feature and its use case
3. Explain why it would be useful

### Pull Requests

1. Fork the repository
2. Create a branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test: `aiox-global doctor`
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

### Code Standards

- Use consistent formatting
- Add comments for complex logic
- Follow existing patterns
- Test your changes

### Project Structure

```
aiox-opencode-adapter/
  agents/           # Agent markdown files
  bin/              # CLI scripts
  docs/             # Documentation
    pt/             # Portuguese
    en/             # English
  templates/        # Configuration templates
  LICENSE           # MIT License
  README.md         # Portuguese README
  README.en.md      # English README
  CONTRIBUTING.md   # This file
  package.json      # npm package
```

### Adding a New Agent

1. Create `agents/your-agent.md` with frontmatter:
   ```yaml
   ---
   description: "Name - Role. Description."
   mode: subagent
   color: "#HEXCOLOR"
   permission:
     edit: deny
     bash:
       "*": allow
     read: allow
   ---
   ```
2. Add to `AGENTS` array in `bin/aiox-global.js`
3. Add agent name mapping to `AGENT_NAMES` in `scripts/validate-agents.js`
4. Add expected mode to `AGENT_MODES` in `scripts/validate-agents.js` (if primary)
5. Add expected color to `AGENT_COLORS` in `scripts/validate-agents.js`
6. Update documentation in `docs/pt/AGENTS.md` and `docs/en/AGENTS.md`

### License

By contributing, you agree that your contributions will be licensed under the MIT License.
