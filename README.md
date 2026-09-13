# chobittube

YouTuber向けの、自分のチャンネルデータを使うミニアプリです。

最初の機能は **公開動画のエゴサショートカット** です。チャンネルIDを入れると直近の公開動画が一覧になり、各動画の YouTube 動画IDだけで 𝕏 を検索するリンクを出します。

検索URLの形:

```
https://x.com/search?q=LuQbBr3XdSw&src=recent_search_click&f=live
```

動画のフルURLだとヒットしにくいので、ID（例: `LuQbBr3XdSw`）だけをクエリにしています。

## なぜ OAuth が不要か

公開動画は YouTube の Atom フィードから取れます。

```
https://www.youtube.com/feeds/videos.xml?channel_id=UC...
```

最新15本までです。APIキーもログインも使いません。

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

デプロイ先は Cloudflare Workers です。ストレージ（KV / D1 / R2）は使わず、YouTube への応答は Cache API で短時間キャッシュします。

## YouTube ID の入れ方

次のいずれでも動きます。

- チャンネルID（`UC` から始まる24文字）
- `@handle`（旧 `/c/name` カスタムURLも含む）
- チャンネルURL（`youtube.com/@name` / `youtube.com/c/name` / `youtube.com/channel/UC...`）
