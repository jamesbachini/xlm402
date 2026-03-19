type ParsedFeedItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
};

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

function stripCdata(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(
    `<(?:[^:>]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[^:>]+:)?${tag}>`,
    "i",
  );
  const match = xml.match(re);

  return match ? decodeEntities(stripCdata(match[1]).trim()) : "";
}

function extractLink(block: string): string {
  const alternateHref =
    block.match(/<link\b[^>]*\brel=["']alternate["'][^>]*\bhref=["']([^"']+)["']/i) ??
    block.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']alternate["']/i);

  if (alternateHref?.[1]) {
    return alternateHref[1].trim();
  }

  const href = block.match(/<link\b[^>]*\bhref=["']([^"']+)["']/i);
  if (href?.[1]) {
    return href[1].trim();
  }

  return extractTag(block, "link");
}

function parseBlocks(xml: string, tagName: "item" | "entry") {
  const re = new RegExp(`<${tagName}[\\s>][\\s\\S]*?<\\/${tagName}>`, "gi");
  return xml.match(re) ?? [];
}

export function parseFeed(xml: string): ParsedFeedItem[] {
  const blocks = [...parseBlocks(xml, "item"), ...parseBlocks(xml, "entry")];

  return blocks
    .map((block) => {
      const title = stripTags(extractTag(block, "title"));
      const link = decodeEntities(extractLink(block));
      const pubDate =
        extractTag(block, "pubDate") ||
        extractTag(block, "published") ||
        extractTag(block, "updated") ||
        extractTag(block, "date");
      const description =
        extractTag(block, "description") ||
        extractTag(block, "summary") ||
        extractTag(block, "content");

      return {
        title: title || "(untitled)",
        link,
        pubDate,
        description: stripTags(description).slice(0, 400),
      };
    })
    .filter((item) => Boolean(item.title || item.link));
}

export async function fetchFeed(
  url: string,
  maxItems: number,
  timeoutMs: number,
): Promise<ParsedFeedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "xlm402-news/1.0 (+https://xlm402.com)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    const items = parseFeed(xml).filter((item) => item.link || item.title);
    if (items.length === 0) {
      throw new Error("Feed returned no parseable items");
    }

    return items.slice(0, maxItems);
  } finally {
    clearTimeout(timeout);
  }
}
