import { AppShell } from "@astryxdesign/core/AppShell";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import {
	HStack,
	Layout,
	LayoutContent,
	StackItem,
	VStack,
} from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Section } from "@astryxdesign/core/Section";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Thumbnail } from "@astryxdesign/core/Thumbnail";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import * as stylex from "@stylexjs/stylex";
import { useCallback, useEffect, useState } from "react";
import type { ApiError, ChannelVideosResponse } from "../shared/types";

const STORAGE_KEY = "chobittube:channel";

const styles = stylex.create({
	list: {
		width: "100%",
	},
});

function readStoredChannel(): string {
	const fromUrl = new URLSearchParams(window.location.search).get("channel");
	if (fromUrl?.trim()) {
		return fromUrl.trim();
	}
	try {
		return localStorage.getItem(STORAGE_KEY) ?? "";
	} catch {
		return "";
	}
}

function persistChannel(value: string) {
	const url = new URL(window.location.href);
	if (value) {
		url.searchParams.set("channel", value);
	} else {
		url.searchParams.delete("channel");
	}
	window.history.replaceState(null, "", url);
	try {
		if (value) {
			localStorage.setItem(STORAGE_KEY, value);
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	} catch {
		// private mode などでは無視
	}
}

export default function App() {
	const [channelInput, setChannelInput] = useState("");
	const [data, setData] = useState<ChannelVideosResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const loadVideos = useCallback(async (raw: string) => {
		const query = raw.trim();
		if (!query) {
			setError("YouTube ID を入力してください");
			setData(null);
			return;
		}

		setIsLoading(true);
		setError(null);
		persistChannel(query);

		try {
			const response = await fetch(
				`/api/videos?channel=${encodeURIComponent(query)}`,
			);
			const payload = (await response.json()) as
				| ChannelVideosResponse
				| ApiError;
			if (!response.ok || "error" in payload) {
				const message =
					"error" in payload
						? payload.error
						: "YouTube の動画一覧を取得できませんでした";
				setData(null);
				setError(message);
				return;
			}
			setData(payload);
		} catch {
			setData(null);
			setError("YouTube の動画一覧を取得できませんでした");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		const initial = readStoredChannel();
		if (!initial) {
			return;
		}
		setChannelInput(initial);
		void loadVideos(initial);
	}, [loadVideos]);

	return (
		<AppShell
			height="auto"
			contentPadding={4}
			topNav={
				<TopNav
					label="chobittube"
					heading={<TopNavHeading heading="chobittube" headingHref="/" />}
				/>
			}
		>
			<Layout height="auto" contentWidth={640} padding={0}>
				<LayoutContent>
					<VStack gap={6}>
						<VStack gap={1}>
							<Heading level={1}>公開動画のエゴサ</Heading>
							<Text color="secondary">
								チャンネルの公開動画から、動画IDだけで𝕏を検索します。URLではなくIDで探すのでヒットしやすいショートカットです。
							</Text>
						</VStack>

						<Section>
							<form
								onSubmit={(event) => {
									event.preventDefault();
									void loadVideos(channelInput);
								}}
							>
								<VStack gap={3}>
									<HStack gap={2} vAlign="end" wrap="wrap">
										<StackItem size="fill">
											<TextInput
												label="YouTube ID"
												description="チャンネルID（UC...）、@ハンドル、チャンネルURL"
												placeholder="UC... または @handle"
												value={channelInput}
												onChange={setChannelInput}
												hasClear
												width="100%"
												isRequired
												htmlName="channel"
											/>
										</StackItem>
										<Button
											type="submit"
											label="動画を表示"
											variant="primary"
											isLoading={isLoading}
										/>
									</HStack>
								</VStack>
							</form>
						</Section>

						{error ? (
							<Banner
								status="error"
								title="動画一覧を取得できませんでした"
								description={error}
							/>
						) : null}

						{isLoading && !data ? (
							<HStack gap={2} vAlign="center">
								<Spinner size="sm" />
								<Text color="secondary">公開動画を読み込んでいます</Text>
							</HStack>
						) : null}

						{data && data.videos.length === 0 ? (
							<EmptyState
								title="公開動画がありません"
								description={`${data.channel.title} のRSSには直近の公開動画がありません。`}
								icon={<Icon icon="search" />}
							/>
						) : null}

						{data && data.videos.length > 0 ? (
							<Section padding={0}>
								<List
									xstyle={styles.list}
									hasDividers
									header={
										<VStack gap={1}>
											<Heading level={2}>{data.channel.title}</Heading>
											<Text color="secondary" type="supporting">
												直近 {data.videos.length}{" "}
												本（YouTubeの公開フィードは最新15本まで）
											</Text>
										</VStack>
									}
								>
									{data.videos.map((video) => (
										<ListItem
											key={video.id}
											label={video.title}
											startContent={
												<Thumbnail
													src={video.thumbnailUrl}
													alt=""
													label={video.title}
												/>
											}
											description={
												<VStack gap={2}>
													<HStack gap={2} vAlign="center" wrap="wrap">
														{video.publishedAt ? (
															<Timestamp value={video.publishedAt} />
														) : null}
														<Text type="code">{video.id}</Text>
														<Link
															href={video.url}
															isExternalLink
															type="supporting"
														>
															YouTube
														</Link>
													</HStack>
													<Button
														label="𝕏で検索"
														href={video.xSearchUrl}
														target="_blank"
														rel="noopener noreferrer"
														variant="primary"
														size="sm"
													/>
												</VStack>
											}
										/>
									))}
								</List>
							</Section>
						) : null}

						{!isLoading && !data && !error ? (
							<EmptyState
								title="チャンネルを入力してください"
								description="自分のYouTubeチャンネルIDを入れると、公開動画ごとの𝕏検索リンクが出ます。"
								icon={<Icon icon="search" />}
							/>
						) : null}
					</VStack>
				</LayoutContent>
			</Layout>
		</AppShell>
	);
}
