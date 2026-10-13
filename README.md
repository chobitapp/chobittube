# chobittube

YouTuber向けの、自分のチャンネルデータを使うミニアプリです

## 開発

Node.js のバージョンは `.node-version`、pnpm のバージョンは `package.json` の `packageManager` に合わせてください。

```bash
pnpm install
pnpm dev
```

```bash
pnpm test
pnpm check
pnpm build
pnpm deploy
```

## CI

GitHub Actions は `main` への push、Pull Request、手動実行で `pnpm lint`、`pnpm test`、`pnpm build`（Cloudflare の型生成・TypeScript の型チェックを含む）を実行します。
依存関係は `pnpm install --frozen-lockfile` でインストールし、使用する3つの Action は完全なコミット SHA に固定しています。

- デプロイ先は Cloudflare Workers です
- 公開URLは [https://chobittube.nanabit.dev/](https://chobittube.nanabit.dev/) です
- リポジトリは [https://github.com/chobitapp/chobittube](https://github.com/chobitapp/chobittube) です
- ストレージ（KV / D1 / R2）は使わず、YouTube への応答は Cache API で短時間キャッシュします
