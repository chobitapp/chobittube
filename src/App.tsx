import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Thumbnail } from "@astryxdesign/core/Thumbnail";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { useCallback, useEffect, useState } from "react";
import type { ApiError, ChannelVideosResponse } from "../shared/types";

const STORAGE_KEY = "chobittube:channel";

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
		<Center axis="horizontal" minHeight="100dvh" width="100%">
			<VStack gap={4} padding={4} width="100%" maxWidth={512}>
				<Card maxWidth={480} width="100%" padding={5}>
					<VStack gap={4}>
						<Heading level={1} className="brand-logo">
							<img
								src="/favicon.png"
								alt=""
								width={28}
								height={28}
								className="brand-logo__icon"
							/>
							<span className="brand-logo__wordmark">
								<span className="brand-logo__chobit">chobit</span>
								<span className="brand-logo__tube">tube</span>
							</span>
						</Heading>

						<Text color="secondary">
							チャンネルの動画言及ポストを𝕏で検索します。
						</Text>

						<form
							onSubmit={(event) => {
								event.preventDefault();
								void loadVideos(channelInput);
							}}
						>
							<VStack gap={4}>
								<FormLayout direction="vertical">
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
								</FormLayout>

								{error ? (
									<Banner
										status="error"
										title="動画一覧を取得できませんでした"
										description={error}
									/>
								) : null}

								<Button
									type="submit"
									label="動画を表示"
									variant="primary"
									isLoading={isLoading}
									isDisabled={isLoading}
								/>
							</VStack>
						</form>
					</VStack>
				</Card>

				{isLoading && !data ? (
					<Center axis="horizontal" width="100%">
						<HStack gap={2} vAlign="center">
							<Spinner size="sm" />
							<Text color="secondary">公開動画を読み込んでいます</Text>
						</HStack>
					</Center>
				) : null}

				{data && data.videos.length === 0 ? (
					<Card maxWidth={480} width="100%" padding={5}>
						<EmptyState
							title="公開動画がありません"
							description={`${data.channel.title} のRSSには直近の公開動画がありません。`}
							icon={<Icon icon="search" />}
						/>
					</Card>
				) : null}

				{data && data.videos.length > 0 ? (
					<Card maxWidth={480} width="100%" padding={5}>
						<VStack gap={3} width="100%">
							<VStack gap={1}>
								<Heading level={2}>{data.channel.title}</Heading>
								<Text color="secondary" type="supporting">
									直近 {data.videos.length} 本
								</Text>
							</VStack>
							<List hasDividers>
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
						</VStack>
					</Card>
				) : null}

				<Center axis="horizontal">
					<HStack gap={3} vAlign="center">
						<Link
							href="https://github.com/chobitapp/chobittube"
							isExternalLink
							isStandalone
						>
							GitHub
						</Link>
						<Link href="https://nanabit.dev/" isExternalLink isStandalone>
							nanabit
						</Link>
					</HStack>
				</Center>
			</VStack>
		</Center>
	);
}
