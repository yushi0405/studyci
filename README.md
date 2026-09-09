# StudyCI

CI and linting tools for collaboratively maintained study materials, certification question banks, and flashcards.

[日本語](README.ja.md)

> **Status:** early MVP. StudyCI starts with deterministic, reproducible checks. AI-assisted review is planned as an optional layer.

## Why StudyCI?

Study content is increasingly maintained like software: in Git repositories, through pull requests, reviews, releases, and community contributions. StudyCI brings software-style quality checks to educational content.

The MVP checks:

- YAML and Markdown question-bank parsing
- required fields (`id`, `question`, `answer`)
- duplicate IDs
- exact duplicate question text
- missing sources
- invalid tags
- undeclared categories
- category coverage counts

Planned optional AI-assisted checks include semantic duplicates, ambiguity detection, answer/source consistency, and stale-content review.

## Quick start

```bash
npm install
npm run build
node dist/cli.js check examples
```

## Example YAML

```yaml
syllabus:
  categories: [networking, security]

questions:
  - id: network-001
    question: What is the default HTTPS port?
    answer: "443"
    category: networking
    tags: [tcp, https]
    source: RFC 9110
```

## Markdown format

```markdown
## network-001
Question: What is the default HTTPS port?
Answer: 443
Category: networking
Tags: tcp, https
Source: RFC 9110
```

## GitHub Action

```yaml
- uses: yushi0405/studyci@main
  with:
    path: .
```

For production repositories, pin a release tag once stable releases are available.

## Design principles

1. **Useful without AI** — deterministic linting remains free and reproducible.
2. **AI only where semantics matter** — semantic duplicate and ambiguity review are optional.
3. **Language-agnostic** — multilingual repositories, including Japanese content, are first-class use cases.
4. **Git-native** — local CLI and CI output fit pull-request workflows.
5. **Open formats** — study content should remain portable across tools.

## Roadmap

- [x] CLI scaffold
- [x] YAML and Markdown loading
- [x] deterministic lint rules
- [x] basic category coverage
- [x] GitHub Action
- [ ] JSON output / GitHub annotations
- [ ] configurable rule severity
- [ ] syllabus percentage coverage
- [ ] stable v0.1 release
- [ ] optional AI review layer

## Contributing

Issues and pull requests are welcome. The project intentionally keeps its core deterministic and vendor-neutral.

## License

MIT
