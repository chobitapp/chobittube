import { fetchChannelVideos, YoutubeLookupError } from "./youtube";

const CACHE_TTL_SECONDS = 600;

function json(data: unknown, status: number, cacheControl?: string): Response {
	const headers = new Headers({
		"Content-Type": "application/json; charset=utf-8",
	});
	if (cacheControl) {
		headers.set("Cache-Control", cacheControl);
	}
	return new Response(JSON.stringify(data), { status, headers });
}

export default {
	async fetch(
		request: Request,
		_env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		if (request.method !== "GET") {
			return json({ error: "Method Not Allowed" }, 405);
		}

		if (url.pathname !== "/api/videos") {
			return json({ error: "Not Found" }, 404);
		}

		const channel = url.searchParams.get("channel")?.trim() ?? "";
		if (!channel) {
			return json({ error: "YouTube ID を入力してください" }, 400);
		}

		const cache = caches.default;
		const cacheKey = new Request(
			new URL(
				`/api/videos?channel=${encodeURIComponent(channel.toLowerCase())}`,
				url.origin,
			).toString(),
			request,
		);

		const cached = await cache.match(cacheKey);
		if (cached) {
			return cached;
		}

		try {
			const payload = await fetchChannelVideos(channel);
			const response = json(
				payload,
				200,
				`public, max-age=${CACHE_TTL_SECONDS}`,
			);
			ctx.waitUntil(cache.put(cacheKey, response.clone()));
			return response;
		} catch (error) {
			if (error instanceof YoutubeLookupError) {
				console.error(
					JSON.stringify({
						message: "youtube lookup failed",
						error: error.message,
						status: error.status,
					}),
				);
				return json({ error: error.message }, error.status);
			}

			const message = error instanceof Error ? error.message : "Unknown error";
			console.error(
				JSON.stringify({
					message: "unhandled error",
					error: message,
					path: url.pathname,
				}),
			);
			return json({ error: "YouTube の動画一覧を取得できませんでした" }, 500);
		}
	},
} satisfies ExportedHandler<Env>;
