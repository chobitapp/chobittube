# chobittube

YouTuber向けの、自分のチャンネルデータを使うミニアプリです

## 開発

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

- デプロイ先は Cloudflare Workers です
- 公開URLは [https://chobittube.nanabit.dev/](https://chobittube.nanabit.dev/) です
- リポジトリは [https://github.com/chobitapp/chobittube](https://github.com/chobitapp/chobittube) です
- ストレージ（KV / D1 / R2）は使わず、YouTube への応答は Cache API で短時間キャッシュします
