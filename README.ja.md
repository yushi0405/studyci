# StudyCI

共同管理される学習教材・資格問題集・フラッシュカード向けのCI / lintツールです。

[English](README.md)

> **状態:** 初期MVPです。まず決定論的で再現可能なチェックを実装し、AIレビューは将来のオプション機能として追加します。

## StudyCIの目的

教材もソフトウェアと同じように、Gitリポジトリ、Pull Request、レビュー、リリース、コミュニティ貢献によって管理できます。StudyCIは教育コンテンツにソフトウェア開発と同様の品質チェックを持ち込みます。

MVPでは以下を検査します。

- YAML / Markdown問題集の読み込み
- 必須フィールド (`id`, `question`, `answer`)
- ID重複
- 問題文の完全一致重複
- 出典の欠落
- 不正なtags
- syllabusで宣言されていないcategory
- category別問題数

将来的には、意味的な重複、曖昧な問題文、回答と出典の整合性、古くなった教材の検出をAIによるオプション機能として追加する予定です。

## クイックスタート

```bash
npm install
npm run build
node dist/cli.js check examples
```

## YAML例

```yaml
questions:
  - id: fe-network-001
    question: TCPの3-way handshakeの順序は？
    answer: SYN → SYN/ACK → ACK
    category: networking
    tags: [tcp, network]
    source: サンプル教材
```

## GitHub Action

```yaml
- uses: yushi0405/studyci@main
  with:
    path: .
```

安定版リリース後は、`main` ではなくリリースタグへの固定を推奨します。

## 設計原則

1. **AIなしでも有用** — 基本lintは無料かつ再現可能にする。
2. **意味理解が必要な箇所だけAI** — 意味的重複や曖昧性判定はオプションにする。
3. **多言語を前提** — 日本語を含む多言語教材を正式なユースケースとする。
4. **Gitネイティブ** — CLIとCIをPull Requestのワークフローに自然に組み込む。
5. **オープン形式** — 教材データを特定サービスに閉じ込めない。

## License

MIT
