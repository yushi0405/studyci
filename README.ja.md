# StudyCI

共同管理される学習教材・資格問題集・フラッシュカード向けのCI / lintツールです。

[English](README.md)

> **v0.1.0候補:** 決定論的チェックを中核にし、ローカルAIレビューはオプションです。

## インストール

npm初回公開後は次のように利用できます。

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

v0.1.0のAIレビューは次の警告だけを保守的に出します。

- 意味的に重複した問題
- 実質的に曖昧な問題文
- 明白な質問・回答の不整合

外部知識による事実確認はまだ行いません。ローカルLLMの不確実な知識を決定論的な検証結果のように扱わないためです。

## GitHub Action

```yaml
- uses: yushi0405/studyci@main
  with:
    path: questions
```

GitHub Actionは意図的に決定論的チェックのみ実行します。error / warningは、対象のリポジトリファイルと、特定できる場合は問題の行に紐づくGitHub annotationとして表示されます。GitHub-hosted runnerから利用者PC上のOllamaへ接続できることは前提にしません。

## v0.1.0の範囲

- [x] YAML / Markdown
- [x] 決定論的lint
- [x] CLI / GitHub Action
- [x] JSON出力
- [x] `.studyci.yaml`
- [x] Ollamaによる任意の意味的レビュー
- [x] npm公開用メタデータ
- [x] npm初回公開
- [x] GitHub release / tag

## License

MIT
