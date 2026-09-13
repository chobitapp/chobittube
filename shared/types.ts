export type Video = {
	id: string;
	title: string;
	url: string;
	publishedAt: string;
	thumbnailUrl: string;
	viewCount: number | null;
	xSearchUrl: string;
};

export type ChannelVideosResponse = {
	channel: {
		id: string;
		title: string;
		url: string;
	};
	videos: Video[];
};

export type ApiError = {
	error: string;
};
