# StudyCI

CI and linting for collaboratively maintained study materials, certification question banks, and flashcards.

[日本語](README.ja.md)

> **v0.1.0 candidate:** deterministic checks are the core; local AI review is optional.

## Install

After the first npm release:

```bash
npm install -g studyci
studyci check ./questions
```

Or run without a global install:

```bash
npx studyci check ./questions
```

## Deterministic checks

`studyci check` works without AI or network access. It checks YAML/Markdown parsing, required fields, duplicate IDs and exact question text (including across files), missing sources, tags, declared categories, and basic category coverage.

```bash
studyci check .
studyci check . --format json
studyci check . --format github
```

`--format github` emits GitHub Actions workflow commands for error and warning annotations. When a finding has a question ID, StudyCI maps common YAML `id:` fields and Markdown `## id` headings to a source line on a best-effort basis.

## Optional local AI review with Ollama

StudyCI can use a local Ollama model for semantic review. The default is `qwen3.5:9b`.

```bash
ollama pull qwen3.5:9b
ollama serve
studyci review ./questions
```

Override the model or endpoint directly:

```bash
studyci review ./questions --model qwen3.5:9b --base-url http://127.0.0.1:11434
```

A text-mode AI review prints the active model, endpoint, number of questions being reviewed, elapsed time, and finding count so local-model latency is visible instead of appearing to hang.

```text
StudyCI AI review
Model: qwen3.5:9b
Endpoint: http://127.0.0.1:11434
Reviewing 4 question(s)...

WARN semantic-duplicate [network-001]: ...

Completed in 31.4s.
1 finding(s).
```

Use `--quiet` when only findings should be printed:

```bash
studyci review ./questions --quiet
```

JSON output remains machine-readable and does not include progress text:

```bash
studyci review ./questions --format json
```

Or copy `.studyci.example.yaml` to `.studyci.yaml`:

```yaml
ai:
  provider: ollama
  model: qwen3.5:9b
  baseUrl: http://127.0.0.1:11434
  timeoutMs: 120000
  maxQuestions: 50
```

AI review currently reports only conservative warnings for:

- semantic duplicates
- materially ambiguous questions
- obvious question/answer mismatches

It deliberately does **not** use outside knowledge for fact checking in v0.1.0. This keeps local-model review useful without presenting uncertain model knowledge as a deterministic validation result.

## YAML example

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

## Markdown example

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
    path: questions
```

The GitHub Action intentionally runs deterministic checks only. Errors and warnings are emitted as GitHub annotations associated with the relevant repository file and, when it can be determined, the question line. Local AI endpoints such as Ollama are not assumed to be reachable from GitHub-hosted runners.

## Design principles

1. Useful without AI.
2. AI only where semantics matter.
3. Multilingual content is a first-class use case.
4. Git-native CLI and CI workflows.
5. Open, portable study formats.

## v0.1.0 scope

- [x] YAML and Markdown loading
- [x] deterministic lint rules
- [x] CLI and GitHub Action
- [x] JSON output
- [x] `.studyci.yaml` configuration
- [x] optional Ollama semantic review
- [x] npm-ready package metadata
- [x] first npm publication
- [x] GitHub release/tag

## License

MIT
