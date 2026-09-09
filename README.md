# StudyCI

StudyCI lints YAML and Markdown study materials, certification question banks, and flashcards.

Deterministic checks run locally and in CI without network access. Optional semantic review uses a local Ollama model.

[日本語](README.ja.md)

## Install

```bash
npm install -g studyci
```

Or run it with `npx`:

```bash
npx studyci check ./questions
```

Node.js 20 or later is required.

## Check study content

```bash
studyci check ./questions
```

StudyCI currently checks:

- YAML and Markdown parsing
- required fields
- duplicate IDs
- exact duplicate question text
- duplicates across files
- missing `source`
- invalid `tags`
- undeclared categories
- category counts

A check exits with status `1` when an error is found. Warnings do not fail the command.

### Directory scans

You can scan a directory or the repository root:

```bash
studyci check .
```

Recursive scans ignore these directories by default:

- `.git`
- `.github`
- `node_modules`
- `dist`
- `coverage`

Unrelated YAML and Markdown files are skipped during directory scans. If a file is passed explicitly, StudyCI treats it as input and reports an error when it is not a StudyCI document.

## Output formats

Text output is the default:

```bash
studyci check ./questions
```

JSON output:

```bash
studyci check ./questions --format json
```

GitHub Actions annotations:

```bash
studyci check ./questions --format github
```

For GitHub output, StudyCI maps YAML `id:` entries and Markdown `## id` headings to line numbers when possible.

## GitHub Action

```yaml
- uses: yushi0405/studyci@v0.2.0
  with:
    path: questions
```

The action runs deterministic checks and emits errors and warnings as GitHub annotations. Ollama review is not run by the action.

## Local AI review

Semantic review is optional and runs against a local Ollama endpoint.

Default model: `qwen3.5:9b`

```bash
ollama pull qwen3.5:9b
ollama serve
studyci review ./questions
```

Specify a model or endpoint directly:

```bash
studyci review ./questions \
  --model qwen3.5:9b \
  --base-url http://127.0.0.1:11434
```

The current AI review reports warnings for:

- semantic duplicates
- ambiguous questions
- obvious question/answer mismatches

It does not perform external fact checking.

Use `--quiet` to print findings without progress output:

```bash
studyci review ./questions --quiet
```

JSON output is also available:

```bash
studyci review ./questions --format json
```

## Configuration

Copy `.studyci.example.yaml` to `.studyci.yaml` to configure local AI review:

```yaml
ai:
  provider: ollama
  model: qwen3.5:9b
  baseUrl: http://127.0.0.1:11434
  timeoutMs: 120000
  maxQuestions: 50
```

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

## License

MIT
