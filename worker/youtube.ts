import type { ChannelVideosResponse, Video } from "../shared/types";

const CHANNEL_ID_RE = /^UC[\w-]{22}$/;
const HANDLE_RE = /^[\w.-]{3,30}$/;
const YOUTUBE_HOSTS = new Set([
	"youtube.com",
	"www.youtube.com",
	"m.youtube.com",
	"music.youtube.com",
	"youtu.be",
]);

export type ChannelQuery =
	| { kind: "channelId"; value: string }
	| { kind: "user"; value: string };

export class YoutubeLookupError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "YoutubeLookupError";
		this.status = status;
	}
}

export function xSearchUrl(videoId: string): string {
	return `https://x.com/search?q=${encodeURIComponent(videoId)}&src=recent_search_click&f=live`;
}

export function parseChannelInput(raw: string): ChannelQuery {
	const trimmed = raw.trim();
	if (!trimmed) {
		throw new YoutubeLookupError("YouTube ID を入力してください", 400);
	}

	const fromUrl = parseYoutubeUrl(trimmed);
	if (fromUrl) {
		return fromUrl;
	}

	if (CHANNEL_ID_RE.test(trimmed)) {
		return { kind: "channelId", value: trimmed };
	}

	const handle = trimmed.replace(/^@/, "");
	if (!HANDLE_RE.test(handle)) {
		throw new YoutubeLookupError(
			"チャンネルID（UCから始まる文字列）、@ハンドル、またはチャンネルURLを入力してください",
			400,
		);
	}

	return { kind: "user", value: handle };
}

function parseYoutubeUrl(input: string): ChannelQuery | null {
	let url: URL;
	try {
		url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
	} catch {
		return null;
	}

	const host = url.hostname.replace(/^www\./, "");
	if (!YOUTUBE_HOSTS.has(url.hostname) && host !== "youtube.com") {
		return null;
	}

	const channelMatch = url.pathname.match(/\/channel\/(UC[\w-]{22})/);
	if (channelMatch) {
		return { kind: "channelId", value: channelMatch[1] };
	}

	const handleMatch = url.pathname.match(/\/@([^/]+)/);
	if (handleMatch) {
		return { kind: "user", value: decodeURIComponent(handleMatch[1]) };
	}

	const userMatch = url.pathname.match(/\/(?:user|c)\/([^/]+)/);
	if (userMatch) {
		return { kind: "user", value: decodeURIComponent(userMatch[1]) };
	}

	return null;
}

export function feedUrlForQuery(query: ChannelQuery): string {
	const params = new URLSearchParams(
		query.kind === "channelId"
			? { channel_id: query.value }
			: { user: query.value },
	);
	return `https://www.youtube.com/feeds/videos.xml?${params.toString()}`;
}

export function decodeXmlEntities(value: string): string {
	return value
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, code: string) =>
			String.fromCharCode(Number(code)),
		)
		.replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) =>
			String.fromCharCode(Number.parseInt(code, 16)),
		)
		.replace(/&amp;/g, "&");
}

function extractTag(xml: string, tag: string): string | null {
	const match = xml.match(
		new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`),
	);
	return match ? decodeXmlEntities(match[1].trim()) : null;
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
	const match = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i"));
	return match ? decodeXmlEntities(match[1]) : null;
}

function normalizeChannelId(id: string): string {
	return id.startsWith("UC") ? id : `UC${id}`;
}

export function parseYoutubeFeed(xml: string): ChannelVideosResponse {
	if (!xml.includes("<feed") || xml.includes("<errors")) {
		throw new YoutubeLookupError(
			"チャンネルが見つかりませんでした。ID を確認してください",
			404,
		);
	}

	const header = xml.split("<entry>")[0] ?? xml;
	const headerTitle = extractTag(header, "title");
	const headerChannelId =
		extractTag(header, "yt:channelId") ?? extractTag(header, "channelId") ?? "";

	const entryMatches = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
	const videos: Video[] = [];
	let channelId = headerChannelId;

	for (const match of entryMatches) {
		const entry = match[1];
		const id = extractTag(entry, "yt:videoId");
		if (!id) {
			continue;
		}
		const entryChannelId = extractTag(entry, "yt:channelId");
		if (entryChannelId) {
			channelId = entryChannelId;
		}

		const viewsRaw = extractAttr(entry, "media:statistics", "views");
		const viewCount =
			viewsRaw && /^\d+$/.test(viewsRaw) ? Number(viewsRaw) : null;
		const href = extractAttr(entry, "link", "href");

		videos.push({
			id,
			title: extractTag(entry, "title") ?? id,
			url: href ?? `https://www.youtube.com/watch?v=${id}`,
			publishedAt: extractTag(entry, "published") ?? "",
			thumbnailUrl:
				extractAttr(entry, "media:thumbnail", "url") ??
				`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
			viewCount,
			xSearchUrl: xSearchUrl(id),
		});
	}

	if (!channelId && videos.length === 0 && !headerTitle) {
		throw new YoutubeLookupError(
			"チャンネルが見つかりませんでした。ID を確認してください",
			404,
		);
	}

	const normalizedId = normalizeChannelId(channelId);
	return {
		channel: {
			id: normalizedId,
			title: headerTitle ?? normalizedId,
			url: `https://www.youtube.com/channel/${normalizedId}`,
		},
		videos,
	};
}

export function extractChannelIdFromHtml(html: string): string | null {
	const patterns = [
		/"channelId":"(UC[\w-]{22})"/,
		/"externalId":"(UC[\w-]{22})"/,
		/"browseId":"(UC[\w-]{22})"/,
		/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
		/"canonicalBaseUrl":"\/channel\/(UC[\w-]{22})"/,
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match) {
			return match[1];
		}
	}

	return null;
}

const FETCH_HEADERS = {
	"User-Agent": "chobittube/0.1 (+https://github.com/zaru/chobittube)",
	Accept: "application/atom+xml,application/xml,text/xml,text/html;q=0.8",
};

async function readLimitedText(
	response: Response,
	maxBytes: number,
): Promise<string> {
	if (!response.body) {
		return "";
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let result = "";
	let bytes = 0;

	try {
		while (bytes < maxBytes) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			bytes += value.byteLength;
			result += decoder.decode(value, { stream: true });
			if (extractChannelIdFromHtml(result)) {
				break;
			}
		}
	} finally {
		await reader.cancel();
	}

	return result + decoder.decode();
}

async function fetchFeedXml(url: string): Promise<string | null> {
	const response = await fetch(url, {
		headers: FETCH_HEADERS,
		cf: { cacheTtl: 600, cacheEverything: true },
	});

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		console.error(
			JSON.stringify({
				message: "youtube feed fetch failed",
				status: response.status,
				url,
			}),
		);
		throw new YoutubeLookupError(
			"YouTube の動画一覧を取得できませんでした",
			502,
		);
	}

	return response.text();
}

async function resolveHandleToChannelId(handle: string): Promise<string> {
	const pageUrl = `https://www.youtube.com/@${encodeURIComponent(handle)}`;
	const response = await fetch(pageUrl, {
		headers: {
			...FETCH_HEADERS,
			"User-Agent":
				"Mozilla/5.0 (compatible; chobittube/0.1; +https://github.com/zaru/chobittube)",
			Accept: "text/html",
		},
		redirect: "follow",
		cf: { cacheTtl: 3600, cacheEverything: true },
	});

	if (!response.ok) {
		throw new YoutubeLookupError(
			"チャンネルが見つかりませんでした。ID を確認してください",
			404,
		);
	}

	const html = await readLimitedText(response, 512_000);
	const channelId = extractChannelIdFromHtml(html);
	if (!channelId) {
		throw new YoutubeLookupError(
			"チャンネルが見つかりませんでした。ID を確認してください",
			404,
		);
	}

	return channelId;
}

export async function fetchChannelVideos(
	rawQuery: string,
): Promise<ChannelVideosResponse> {
	const query = parseChannelInput(rawQuery);

	let xml = await fetchFeedXml(feedUrlForQuery(query));

	if (xml == null && query.kind === "user") {
		const channelId = await resolveHandleToChannelId(query.value);
		xml = await fetchFeedXml(
			feedUrlForQuery({ kind: "channelId", value: channelId }),
		);
	}

	if (xml == null) {
		throw new YoutubeLookupError(
			"チャンネルが見つかりませんでした。ID を確認してください",
			404,
		);
	}

	return parseYoutubeFeed(xml);
}
