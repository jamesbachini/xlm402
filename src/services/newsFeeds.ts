export const NEWS_CATEGORIES = [
  "tech",
  "ai",
  "global",
  "economics",
  "blockchain",
  "politics",
  "sports",
  "business",
  "science",
  "entertainment",
  "gaming",
  "security",
  "health",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export type NewsCategoryDetail = {
  name: string;
  description: string;
};

export type NewsFeedDefinition = {
  id: string;
  name: string;
  category: NewsCategory;
  siteUrl: string;
  feedUrl: string;
};

export const NEWS_CATEGORY_DETAILS: Record<NewsCategory, NewsCategoryDetail> = {
  tech: {
    name: "Technology",
    description: "Latest technology stories mixed from multiple vetted RSS feeds.",
  },
  ai: {
    name: "AI",
    description: "Latest AI stories mixed from multiple vetted RSS feeds.",
  },
  global: {
    name: "Global",
    description: "Latest global news stories mixed from multiple vetted RSS feeds.",
  },
  economics: {
    name: "Economics",
    description: "Latest economics and markets stories mixed from multiple vetted RSS feeds.",
  },
  blockchain: {
    name: "Blockchain",
    description: "Latest blockchain and crypto stories mixed from multiple vetted RSS feeds.",
  },
  politics: {
    name: "Politics",
    description: "Latest politics stories mixed from multiple vetted RSS feeds.",
  },
  sports: {
    name: "Sports",
    description: "Latest sports stories mixed from multiple vetted RSS feeds.",
  },
  business: {
    name: "Business",
    description: "Latest business stories mixed from multiple vetted RSS feeds.",
  },
  science: {
    name: "Science",
    description: "Latest science stories mixed from multiple vetted RSS feeds.",
  },
  entertainment: {
    name: "Entertainment",
    description: "Latest entertainment stories mixed from multiple vetted RSS feeds.",
  },
  gaming: {
    name: "Gaming",
    description: "Latest gaming stories mixed from multiple vetted RSS feeds.",
  },
  security: {
    name: "Security",
    description: "Latest cybersecurity and security stories mixed from multiple vetted RSS feeds.",
  },
  health: {
    name: "Health",
    description: "Latest health and medicine stories mixed from multiple vetted RSS feeds.",
  },
};

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
  {
    id: "coindesk",
    name: "CoinDesk",
    category: "blockchain",
    siteUrl: "https://www.coindesk.com",
    feedUrl: "https://www.coindesk.com/arc/outboundfeeds/rss/",
  },
  {
    id: "cointelegraph",
    name: "Cointelegraph",
    category: "blockchain",
    siteUrl: "https://cointelegraph.com",
    feedUrl: "https://cointelegraph.com/rss",
  },
  {
    id: "decrypt",
    name: "Decrypt",
    category: "blockchain",
    siteUrl: "https://decrypt.co",
    feedUrl: "https://decrypt.co/feed",
  },
  {
    id: "bbc-politics",
    name: "BBC Politics",
    category: "politics",
    siteUrl: "https://www.bbc.com/news/politics",
    feedUrl: "https://feeds.bbci.co.uk/news/politics/rss.xml",
  },
  {
    id: "nyt-politics",
    name: "NYT Politics",
    category: "politics",
    siteUrl: "https://www.nytimes.com/section/politics",
    feedUrl: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml",
  },
  {
    id: "guardian-politics",
    name: "Guardian Politics",
    category: "politics",
    siteUrl: "https://www.theguardian.com/politics",
    feedUrl: "https://www.theguardian.com/politics/rss",
  },
  {
    id: "bbc-sport",
    name: "BBC Sport",
    category: "sports",
    siteUrl: "https://www.bbc.com/sport",
    feedUrl: "https://feeds.bbci.co.uk/sport/rss.xml?edition=uk",
  },
  {
    id: "espn",
    name: "ESPN",
    category: "sports",
    siteUrl: "https://www.espn.com",
    feedUrl: "https://www.espn.com/espn/rss/news",
  },
  {
    id: "sky-sports",
    name: "Sky Sports",
    category: "sports",
    siteUrl: "https://www.skysports.com",
    feedUrl: "https://www.skysports.com/rss/12040",
  },
  {
    id: "bbc-business-extra",
    name: "BBC Business",
    category: "business",
    siteUrl: "https://www.bbc.com/news/business",
    feedUrl: "https://feeds.bbci.co.uk/news/business/rss.xml",
  },
  {
    id: "cnbc",
    name: "CNBC",
    category: "business",
    siteUrl: "https://www.cnbc.com",
    feedUrl: "https://www.cnbc.com/id/10001147/device/rss/rss.html",
  },
  {
    id: "guardian-business",
    name: "Guardian Business",
    category: "business",
    siteUrl: "https://www.theguardian.com/business",
    feedUrl: "https://www.theguardian.com/business/rss",
  },
  {
    id: "nyt-business",
    name: "NYT Business",
    category: "business",
    siteUrl: "https://www.nytimes.com/section/business",
    feedUrl: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
  },
  {
    id: "bbc-science",
    name: "BBC Science & Environment",
    category: "science",
    siteUrl: "https://www.bbc.com/news/science_and_environment",
    feedUrl: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
  },
  {
    id: "science-daily",
    name: "ScienceDaily",
    category: "science",
    siteUrl: "https://www.sciencedaily.com",
    feedUrl: "https://www.sciencedaily.com/rss/top/science.xml",
  },
  {
    id: "nasa-breaking",
    name: "NASA Breaking News",
    category: "science",
    siteUrl: "https://www.nasa.gov/news/",
    feedUrl: "https://www.nasa.gov/rss/dyn/breaking_news.rss",
  },
  {
    id: "nyt-science",
    name: "NYT Science",
    category: "science",
    siteUrl: "https://www.nytimes.com/section/science",
    feedUrl: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml",
  },
  {
    id: "bbc-entertainment",
    name: "BBC Entertainment & Arts",
    category: "entertainment",
    siteUrl: "https://www.bbc.com/news/entertainment_and_arts",
    feedUrl: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
  },
  {
    id: "rolling-stone",
    name: "Rolling Stone",
    category: "entertainment",
    siteUrl: "https://www.rollingstone.com/music/music-news/",
    feedUrl: "https://www.rollingstone.com/music/music-news/feed/",
  },
  {
    id: "guardian-culture",
    name: "Guardian Culture",
    category: "entertainment",
    siteUrl: "https://www.theguardian.com/culture",
    feedUrl: "https://www.theguardian.com/culture/rss",
  },
  {
    id: "gamespot",
    name: "GameSpot",
    category: "gaming",
    siteUrl: "https://www.gamespot.com",
    feedUrl: "https://www.gamespot.com/feeds/mashup/",
  },
  {
    id: "polygon",
    name: "Polygon",
    category: "gaming",
    siteUrl: "https://www.polygon.com",
    feedUrl: "https://www.polygon.com/rss/index.xml",
  },
  {
    id: "ign",
    name: "IGN",
    category: "gaming",
    siteUrl: "https://www.ign.com",
    feedUrl: "https://feeds.ign.com/ign/all",
  },
  {
    id: "wired-security",
    name: "Wired Security",
    category: "security",
    siteUrl: "https://www.wired.com/category/security/",
    feedUrl: "https://www.wired.com/feed/category/security/latest/rss",
  },
  {
    id: "krebs-on-security",
    name: "Krebs on Security",
    category: "security",
    siteUrl: "https://krebsonsecurity.com",
    feedUrl: "https://krebsonsecurity.com/feed/",
  },
  {
    id: "schneier-security",
    name: "Schneier on Security",
    category: "security",
    siteUrl: "https://www.schneier.com",
    feedUrl: "https://www.schneier.com/feed/atom/",
  },
  {
    id: "who-news",
    name: "WHO News",
    category: "health",
    siteUrl: "https://www.who.int/news",
    feedUrl: "https://www.who.int/rss-feeds/news-english.xml",
  },
  {
    id: "medicalxpress",
    name: "Medical Xpress",
    category: "health",
    siteUrl: "https://medicalxpress.com",
    feedUrl: "https://medicalxpress.com/rss-feed/",
  },
  {
    id: "nyt-health",
    name: "NYT Health",
    category: "health",
    siteUrl: "https://www.nytimes.com/section/health",
    feedUrl: "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml",
  },
];
