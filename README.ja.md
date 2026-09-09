# StudyCI

共同管理される学習教材・資格問題集・フラッシュカード向けのCI / lintツールです。

[English](README.md)

> **v0.2.0:** 安全なディレクトリ探索、ファイルをまたぐ重複検出、GitHub PR annotationを追加しました。決定論的チェックを中核にし、ローカルAIレビューは引き続きオプションです。

## インストール

npmからインストールできます。

```bash
npm install -g studyci
studyci check ./questions
```

グローバルインストールせずに使う場合:

```bash
npx studyci check ./questions
```

## 通常のlint

`studyci check` はAIもネットワークも不要です。YAML/Markdown、必須項目、ファイルをまたぐ重複を含む重複ID・完全一致の問題文、source欠落、tags、category、基本coverageを検査します。

```bash
studyci check .
studyci check . --format json
studyci check . --format github
```

`--format github` はGitHub Actionsのerror / warning annotation用workflow commandを出力します。findingにquestion IDがある場合、一般的なYAMLの `id:` 行やMarkdownの `## id` 見出しから、可能な範囲で対象行を特定します。

## OllamaによるローカルAIレビュー

StudyCIはローカルOllamaを使った意味的レビューにも対応します。デフォルトモデルは `qwen3.5:9b` です。

```bash
ollama pull qwen3.5:9b
ollama serve
studyci review ./questions
```

直接指定する場合:

```bash
studyci review ./questions --model qwen3.5:9b --base-url http://127.0.0.1:11434
```

通常のtextモードでは、ローカルLLMの待ち時間が無応答に見えないよう、モデル名・接続先・レビュー対象数・所要時間・finding数を表示します。

```text
StudyCI AI review
Model: qwen3.5:9b
Endpoint: http://127.0.0.1:11434
Reviewing 4 question(s)...

WARN semantic-duplicate [network-001]: ...

Completed in 31.4s.
1 finding(s).
```

findingだけを出したい場合は `--quiet` を使えます。

```bash
studyci review ./questions --quiet
```

JSON出力には進捗メッセージを混ぜず、機械可読性を維持します。

```bash
studyci review ./questions --format json
```

`.studyci.example.yaml` を `.studyci.yaml` にコピーして設定することもできます。

```yaml
ai:
  provider: ollama
  model: qwen3.5:9b
  baseUrl: http://127.0.0.1:11434
  timeoutMs: 120000
  maxQuestions: 50
```

AIレビューは現在、次の警告だけを保守的に出します。

- 意味的に重複した問題
- 実質的に曖昧な問題文
- 明白な質問・回答の不整合

外部知識による事実確認はまだ行いません。ローカルLLMの不確実な知識を決定論的な検証結果のように扱わないためです。

## GitHub Action

```yaml
- uses: yushi0405/studyci@v0.2.0
  with:
    path: questions
```

GitHub Actionは意図的に決定論的チェックのみ実行します。error / warningは、対象のリポジトリファイルと、特定できる場合は問題の行に紐づくGitHub annotationとして表示されます。GitHub-hosted runnerから利用者PC上のOllamaへ接続できることは前提にしません。

## v0.2.0の主な内容

- YAML / Markdownの学習コンテンツ
- 決定論的lintルール
- 安全な再帰ディレクトリ探索
- ファイルをまたぐ重複ID・完全一致問題文の検出
- JSON / GitHub annotation出力
- GitHub Action連携
- Ubuntu / WindowsのCI
- Ollamaによる任意のローカル意味的レビュー

## License

MIT
