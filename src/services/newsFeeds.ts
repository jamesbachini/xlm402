export type NewsCategory = "tech" | "ai" | "global" | "economics";

export type NewsFeedDefinition = {
  id: string;
  name: string;
  category: NewsCategory;
  siteUrl: string;
  feedUrl: string;
};

export const NEWS_CATEGORIES: NewsCategory[] = ["tech", "ai", "global", "economics"];

export function isNewsCategory(value: string): value is NewsCategory {
  return NEWS_CATEGORIES.includes(value as NewsCategory);
}

export const NEWS_FEEDS: NewsFeedDefinition[] = [
  {
    id: "verge",
    name: "The Verge",
    category: "tech",
    siteUrl: "https://www.theverge.com",
    feedUrl: "https://www.theverge.com/rss/index.xml",
  },
  {
    id: "ars-technica",
    name: "Ars Technica",
    category: "tech",
    siteUrl: "https://arstechnica.com",
    feedUrl: "https://feeds.arstechnica.com/arstechnica/index",
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    category: "tech",
    siteUrl: "https://techcrunch.com",
    feedUrl: "https://techcrunch.com/feed/",
  },
  {
    id: "openai-news",
    name: "OpenAI News",
    category: "ai",
    siteUrl: "https://openai.com/news",
    feedUrl: "https://openai.com/news/rss.xml",
  },
  {
    id: "google-ai",
    name: "Google AI",
    category: "ai",
    siteUrl: "https://blog.google/technology/ai/",
    feedUrl: "https://blog.google/technology/ai/rss/",
  },
  {
    id: "hugging-face",
    name: "Hugging Face",
    category: "ai",
    siteUrl: "https://huggingface.co/blog",
    feedUrl: "https://huggingface.co/blog/feed.xml",
  },
  {
    id: "bbc-world",
    name: "BBC World",
    category: "global",
    siteUrl: "https://www.bbc.com/news/world",
    feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
  },
  {
    id: "al-jazeera",
    name: "Al Jazeera",
    category: "global",
    siteUrl: "https://www.aljazeera.com",
    feedUrl: "https://www.aljazeera.com/xml/rss/all.xml",
  },
  {
    id: "wsj-world",
    name: "WSJ World",
    category: "global",
    siteUrl: "https://www.wsj.com/news/world",
    feedUrl: "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
  },
  {
    id: "bbc-business",
    name: "BBC Business",
    category: "economics",
    siteUrl: "https://www.bbc.com/news/business",
    feedUrl: "https://feeds.bbci.co.uk/news/business/rss.xml",
  },
  {
    id: "nyt-economy",
    name: "NYT Economy",
    category: "economics",
    siteUrl: "https://www.nytimes.com/section/business/economy",
    feedUrl: "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml",
  },
  {
    id: "marketwatch",
    name: "MarketWatch",
    category: "economics",
    siteUrl: "https://www.marketwatch.com",
    feedUrl: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
  },
];
