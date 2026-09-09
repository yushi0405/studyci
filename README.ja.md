# StudyCI

StudyCIは、YAML / Markdownで管理する学習教材、資格問題集、フラッシュカード向けのlintツールです。

通常のチェックはAIやネットワーク接続なしで動作します。必要な場合だけ、ローカルのOllamaを使って意味的なレビューを追加できます。

[English](README.md)

## インストール

```bash
npm install -g studyci
```

グローバルインストールせずに使う場合:

```bash
npx studyci check ./questions
```

Node.js 20以降が必要です。

## 教材をチェックする

```bash
studyci check ./questions
```

現在の主なチェック項目:

- YAML / Markdownの解析
- 必須項目
- 重複ID
- 完全一致する問題文
- ファイルをまたぐ重複
- `source` の欠落
- 不正な `tags`
- 未定義のcategory
- categoryごとの件数

errorが1件でもある場合、終了コードは `1` になります。warningだけでは失敗扱いになりません。

### ディレクトリ走査

ディレクトリやリポジトリ直下を指定できます。

```bash
studyci check .
```

再帰走査では、次のディレクトリを標準で除外します。

- `.git`
- `.github`
- `node_modules`
- `dist`
- `coverage`

ディレクトリ走査中に見つかったStudyCI形式ではないYAML / Markdownはスキップします。ファイルを明示指定した場合は入力ファイルとして扱い、StudyCI文書でなければerrorにします。

## 出力形式

通常のtext出力:

```bash
studyci check ./questions
```

JSON出力:

```bash
studyci check ./questions --format json
```

GitHub Actions annotation用の出力:

```bash
studyci check ./questions --format github
```

GitHub向け出力では、可能な場合にYAMLの `id:` 行やMarkdownの `## id` 見出しから行番号を特定します。

## GitHub Action

```yaml
- uses: yushi0405/studyci@v0.2.0
  with:
    path: questions
```

Actionでは通常の決定論的チェックを実行し、error / warningをGitHub annotationとして表示します。OllamaレビューはActionでは実行しません。

## ローカルAIレビュー

意味的レビューはオプションです。ローカルのOllamaに接続して実行します。

デフォルトモデル: `qwen3.5:9b`

```bash
ollama pull qwen3.5:9b
ollama serve
studyci review ./questions
```

モデルや接続先を直接指定する場合:

```bash
studyci review ./questions \
  --model qwen3.5:9b \
  --base-url http://127.0.0.1:11434
```

現在のAIレビューで警告する内容:

- 意味的に重複している問題
- 曖昧な問題文
- 明らかな質問・回答の不整合

外部知識を使った事実確認は行いません。

進捗表示が不要な場合:

```bash
studyci review ./questions --quiet
```

JSON出力も利用できます。

```bash
studyci review ./questions --format json
```

## 設定

`.studyci.example.yaml` を `.studyci.yaml` にコピーすると、ローカルAIレビューの設定を変更できます。

```yaml
ai:
  provider: ollama
  model: qwen3.5:9b
  baseUrl: http://127.0.0.1:11434
  timeoutMs: 120000
  maxQuestions: 50
```

## YAML例

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

## Markdown例

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
