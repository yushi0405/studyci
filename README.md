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
- missing `source` when the input format supports source references
- invalid `tags` when the input format supports tags
- undeclared categories when the input format supports categories
- category counts when categories are available

A check exits with status `1` when an error is found. Warnings do not fail the command.

## Supported input formats

StudyCI auto-detects supported formats during loading.

### Native StudyCI YAML

```yaml
questions:
  - id: network-001
    question: What is the default HTTPS port?
    answer: "443"
    source: RFC 9110
```

A top-level YAML array of question objects is also supported.

### Native StudyCI Markdown

```markdown
## network-001
Question: What is the default HTTPS port?
Answer: 443
Source: RFC 9110
```

### QUIZR-style YAML

QUIZR-style YAML maps top-level question IDs to `prompt` and `answer` fields:

```yaml
q_001:
  prompt: What is the name of OSI Layer 1?
  answer: Physical
```

QUIZR IDs are treated as file-scoped because the format commonly reuses identifiers such as `q_001` in different files. Checks that depend on `source`, `category`, or `tags` are skipped for QUIZR documents because those fields are not part of the format.

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

Unrelated YAML and Markdown files are skipped during directory scans. If a file is passed explicitly, StudyCI treats it as input and reports an error when it does not contain a supported study document.

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

StudyCI reports source line numbers when the active input adapter can determine them.

## GitHub Action

```yaml
- uses: yushi0405/studyci@v0.3.0
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

## Native YAML example with metadata

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

## Native Markdown example with metadata

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
