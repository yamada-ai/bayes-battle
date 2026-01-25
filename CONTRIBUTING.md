# Contributing to Bayes Battle

Thank you for your interest in contributing to Bayes Battle!

## Development Workflow

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/bayes-battle.git
   cd bayes-battle
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/M#-feature-name
   ```

3. **Make Changes**
   - Follow existing code style
   - Write tests for new features
   - Update documentation as needed

4. **Commit**
   - Use [Conventional Commits](https://www.conventionalcommits.org/)
   - Examples:
     - `feat(battle-core): add damage calculation`
     - `fix(match-server): handle timeout correctly`
     - `test(data): add schema validation test`
     - `docs: update implementation plan`

5. **Push and Create PR**
   ```bash
   git push origin feature/M#-feature-name
   ```
   - Create a pull request to `develop` branch
   - Reference related issue(s)

## Code Style

### TypeScript
- Use Prettier (configured in project)
- Follow existing patterns
- Prefer functional programming where appropriate

### Python
- Follow PEP 8
- Use type hints
- Use Black for formatting

## Testing

### TypeScript
```bash
pnpm --filter battle-core test
pnpm --filter battle-core test:watch
```

### Python
```bash
cd rl-engine
pytest
pytest --cov=belief
```

## Issue Reporting

- Use issue templates
- Provide clear reproduction steps for bugs
- Include environment details

## Questions?

Feel free to open a discussion or reach out in issues.

## Code of Conduct

Be respectful and constructive. We're all here to learn and build something cool together.
