import { describe, expect, it } from "vitest";
import {
	decodeXmlEntities,
	extractChannelIdFromHtml,
	feedUrlForQuery,
	parseChannelInput,
	parseYoutubeFeed,
	xSearchUrl,
	YoutubeLookupError,
} from "./youtube";

const SAMPLE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Google for Developers</title>
 <yt:channelId>_x5XG1OV2P6uZZ5FSM9Ttw</yt:channelId>
 <entry>
  <yt:videoId>LuQbBr3XdSw</yt:videoId>
  <yt:channelId>UC_x5XG1OV2P6uZZ5FSM9Ttw</yt:channelId>
  <title>Hello &amp; welcome</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=LuQbBr3XdSw"/>
  <published>2026-09-11T19:30:14+00:00</published>
  <media:group>
   <media:thumbnail url="https://i.ytimg.com/vi/LuQbBr3XdSw/hqdefault.jpg" width="480" height="360"/>
   <media:community>
    <media:statistics views="2373"/>
   </media:community>
  </media:group>
 </entry>
 <entry>
  <yt:videoId>abc_DEF-12</yt:videoId>
  <title>Shorts</title>
  <link rel="alternate" href="https://www.youtube.com/shorts/abc_DEF-12"/>
  <published>2026-08-01T00:00:00+00:00</published>
 </entry>
</feed>`;

describe("parseChannelInput", () => {
	it("accepts a channel ID", () => {
		expect(parseChannelInput("UC_x5XG1OV2P6uZZ5FSM9Ttw")).toEqual({
			kind: "channelId",
			value: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
		});
	});

	it("accepts a handle with or without @", () => {
		expect(parseChannelInput("@GoogleDevelopers")).toEqual({
			kind: "user",
			value: "GoogleDevelopers",
		});
		expect(parseChannelInput("GoogleDevelopers")).toEqual({
			kind: "user",
			value: "GoogleDevelopers",
		});
	});

	it("extracts IDs from channel and handle URLs", () => {
		expect(
			parseChannelInput(
				"https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw",
			),
		).toEqual({
			kind: "channelId",
			value: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
		});
		expect(
			parseChannelInput("https://www.youtube.com/@GoogleDevelopers/videos"),
		).toEqual({
			kind: "user",
			value: "GoogleDevelopers",
		});
		expect(parseChannelInput("youtube.com/user/GoogleDevelopers")).toEqual({
			kind: "user",
			value: "GoogleDevelopers",
		});
	});

	it("rejects empty and invalid input", () => {
		expect(() => parseChannelInput("  ")).toThrow(YoutubeLookupError);
		expect(() => parseChannelInput("not a channel")).toThrow(
			YoutubeLookupError,
		);
	});
});

describe("feedUrlForQuery", () => {
	it("builds channel_id and user feed URLs", () => {
		expect(
			feedUrlForQuery({
				kind: "channelId",
				value: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
			}),
		).toBe(
			"https://www.youtube.com/feeds/videos.xml?channel_id=UC_x5XG1OV2P6uZZ5FSM9Ttw",
		);
		expect(feedUrlForQuery({ kind: "user", value: "GoogleDevelopers" })).toBe(
			"https://www.youtube.com/feeds/videos.xml?user=GoogleDevelopers",
		);
	});
});

describe("xSearchUrl", () => {
	it("searches live posts by video ID only", () => {
		expect(xSearchUrl("LuQbBr3XdSw")).toBe(
			"https://x.com/search?q=LuQbBr3XdSw&src=recent_search_click&f=live",
		);
	});
});

describe("parseYoutubeFeed", () => {
	it("parses channel metadata, videos, and X search URLs", () => {
		const result = parseYoutubeFeed(SAMPLE_FEED);
		expect(result.channel).toEqual({
			id: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
			title: "Google for Developers",
			url: "https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw",
		});
		expect(result.videos).toHaveLength(2);
		expect(result.videos[0]).toMatchObject({
			id: "LuQbBr3XdSw",
			title: "Hello & welcome",
			url: "https://www.youtube.com/watch?v=LuQbBr3XdSw",
			publishedAt: "2026-09-11T19:30:14+00:00",
			thumbnailUrl: "https://i.ytimg.com/vi/LuQbBr3XdSw/hqdefault.jpg",
			viewCount: 2373,
			xSearchUrl:
				"https://x.com/search?q=LuQbBr3XdSw&src=recent_search_click&f=live",
		});
		expect(result.videos[1]?.thumbnailUrl).toBe(
			"https://i.ytimg.com/vi/abc_DEF-12/hqdefault.jpg",
		);
	});
});

describe("decodeXmlEntities", () => {
	it("decodes named and numeric entities", () => {
		expect(decodeXmlEntities("A &amp; B &#39; C &#x26; D")).toBe(
			"A & B ' C & D",
		);
	});
});

describe("extractChannelIdFromHtml", () => {
	it("finds a channel ID in page source", () => {
		expect(
			extractChannelIdFromHtml(
				'<script>{"channelId":"UC_x5XG1OV2P6uZZ5FSM9Ttw"}</script>',
			),
		).toBe("UC_x5XG1OV2P6uZZ5FSM9Ttw");
	});
});
