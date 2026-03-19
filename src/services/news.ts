import { config } from "../config.js";
import { HttpError } from "../utils/errors.js";
import { MemoryCache } from "../utils/cache.js";
import { NEWS_CATEGORIES, NEWS_FEEDS, type NewsCategory, type NewsFeedDefinition } from "./newsFeeds.js";
import { fetchFeed } from "./newsParser.js";

type StandardNewsStory = {
  title: string;
  url: string;
  summary: string;
  published_at: string | null;
  source: {
    id: string;
    name: string;
    site_url: string;
    feed_url: string;
  };
  category: NewsCategory;
};

type NewsFeedResult = {
  source: {
    id: string;
    name: string;
    site_url: string;
    feed_url: string;
  };
  item_count: number;
};

type NewsFeedError = {
  source: {
    id: string;
    name: string;
    feed_url: string;
  };
  error: string;
};

export type NewsResponse = {
  category: NewsCategory;
  requested_at: string;
  story_count: number;
  source_count: number;
  sources: NewsFeedResult[];
  errors: NewsFeedError[];
  stories: StandardNewsStory[];
};

const newsCache = new MemoryCache<NewsResponse>(config.cacheTtlSeconds * 1000);

function normalizeDate(value: string): string | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function dedupeKey(story: StandardNewsStory): string {
  return `${story.url.toLowerCase()}|${story.title.toLowerCase()}`;
}

function sortByPublishedAt(items: StandardNewsStory[]) {
  return [...items].sort((left, right) => {
    const leftTime = left.published_at ? Date.parse(left.published_at) : 0;
    const rightTime = right.published_at ? Date.parse(right.published_at) : 0;
    return rightTime - leftTime;
  });
}

function interleaveStories(groups: StandardNewsStory[][], limit: number) {
  const seen = new Set<string>();
  const stories: StandardNewsStory[] = [];
  const queues = groups.map((group) => [...group]);

  while (stories.length < limit && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      if (stories.length >= limit) {
        break;
      }

      const story = queue.shift();
      if (!story) {
        continue;
      }

      const key = dedupeKey(story);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      stories.push(story);
    }
  }

  return stories;
}

function mapStory(feed: NewsFeedDefinition, item: Awaited<ReturnType<typeof fetchFeed>>[number]): StandardNewsStory {
  return {
    title: item.title,
    url: item.link,
    summary: item.description,
    published_at: normalizeDate(item.pubDate),
    source: {
      id: feed.id,
      name: feed.name,
      site_url: feed.siteUrl,
      feed_url: feed.feedUrl,
    },
    category: feed.category,
  };
}

export function listNewsCategories(): NewsCategory[] {
  return [...NEWS_CATEGORIES];
}

export async function getLatestNewsByCategory({
  category,
  maxStories = 12,
  maxItemsPerFeed = 6,
}: {
  category: NewsCategory;
  maxStories?: number;
  maxItemsPerFeed?: number;
}): Promise<NewsResponse> {
  const cacheKey = `${category}:${maxStories}:${maxItemsPerFeed}`;
  const cached = newsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const feeds = NEWS_FEEDS.filter((feed) => feed.category === category);
  if (feeds.length === 0) {
    throw new HttpError(404, "not_found", `No feeds configured for category '${category}'`);
  }

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const items = await fetchFeed(feed.feedUrl, maxItemsPerFeed, config.requestTimeoutMs);
      return {
        feed,
        stories: sortByPublishedAt(
          items
            .map((item) => mapStory(feed, item))
            .filter((story) => Boolean(story.url)),
        ),
      };
    }),
  );

  const sources: NewsFeedResult[] = [];
  const errors: NewsFeedError[] = [];
  const successfulGroups: StandardNewsStory[][] = [];

  results.forEach((result, index) => {
    const feed = feeds[index];

    if (result.status === "fulfilled") {
      sources.push({
        source: {
          id: result.value.feed.id,
          name: result.value.feed.name,
          site_url: result.value.feed.siteUrl,
          feed_url: result.value.feed.feedUrl,
        },
        item_count: result.value.stories.length,
      });
      successfulGroups.push(result.value.stories);
      return;
    }

    errors.push({
      source: {
        id: feed.id,
        name: feed.name,
        feed_url: feed.feedUrl,
      },
      error:
        result.reason instanceof Error ? result.reason.message : "Unknown upstream feed failure",
    });
  });

  const orderedGroups = successfulGroups.sort((left, right) => {
    const leftTime = left[0]?.published_at ? Date.parse(left[0].published_at) : 0;
    const rightTime = right[0]?.published_at ? Date.parse(right[0].published_at) : 0;
    return rightTime - leftTime;
  });

  const stories = interleaveStories(orderedGroups, maxStories);
  if (stories.length === 0) {
    throw new HttpError(502, "upstream_error", `No parseable stories were returned for '${category}'`);
  }

  const response: NewsResponse = {
    category,
    requested_at: new Date().toISOString(),
    story_count: stories.length,
    source_count: sources.length,
    sources,
    errors,
    stories,
  };

  newsCache.set(cacheKey, response);
  return response;
}
