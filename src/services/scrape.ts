import { load } from "cheerio";
import TurndownService from "turndown";
import { config } from "../config.js";
import { MemoryCache } from "../utils/cache.js";
import { HttpError } from "../utils/errors.js";

export type ExtractFormat = "text" | "markdown";

export type ExtractPageRequest = {
  url: string;
  format: ExtractFormat;
  includeLinks: boolean;
  includeMetadata: boolean;
  includeJsonLd: boolean;
  maxChars: number;
};

export type ExtractPageResult = {
  url: string;
  final_url: string;
  status_code: number;
  content_type: string;
  title?: string;
  description?: string;
  lang?: string;
  canonical_url?: string;
  text?: string;
  markdown?: string;
  links?: Array<{ href: string; text: string; rel?: string }>;
  json_ld?: unknown[];
  fetched_at: string;
  cache: {
    hit: boolean;
    ttl_seconds: number;
  };
};

export type CollectRequest = {
  seedUrl: string;
  scope: "same_origin";
  maxPages: number;
  maxDepth: number;
  includePatterns: string[];
  excludePatterns: string[];
  format: ExtractFormat;
  dedupe: "canonical_url" | "final_url";
  maxCharsPerPage: number;
};

export type CollectResult = {
  seed_url: string;
  pages_requested: number;
  pages_fetched: number;
  pages_skipped: number;
  results: Array<{
    url: string;
    final_url: string;
    title?: string;
    canonical_url?: string;
    text?: string;
    markdown?: string;
    fetched_at: string;
  }>;
  skipped: Array<{ url: string; reason: string }>;
  fetched_at: string;
  cache: {
    hit: boolean;
    ttl_seconds: number;
  };
};

type CachedExtractPageResult = Omit<ExtractPageResult, "cache">;
type CachedCollectResult = Omit<CollectResult, "cache">;
type RobotsRule = { allow: boolean; pattern: string };

const extractCache = new MemoryCache<CachedExtractPageResult>(
  config.scrape.cacheTtlSeconds * 1000,
);
const collectCache = new MemoryCache<CachedCollectResult>(
  config.scrape.cacheTtlSeconds * 1000,
);
const robotsCache = new MemoryCache<RobotsRule[]>(config.scrape.cacheTtlSeconds * 1000);

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

turndown.remove(["script", "style", "noscript", "template"]);

export async function extractPublicPage(
  request: ExtractPageRequest,
): Promise<ExtractPageResult> {
  const targetUrl = normalizeAndValidateUrl(request.url);
  const cacheKey = JSON.stringify({
    url: targetUrl.toString(),
    format: request.format,
    includeLinks: request.includeLinks,
    includeMetadata: request.includeMetadata,
    includeJsonLd: request.includeJsonLd,
    maxChars: request.maxChars,
  });
  const cached = extractCache.get(cacheKey);

  if (cached) {
    return {
      ...cached,
      cache: buildCacheInfo(true),
    };
  }

  await ensureRobotsAllowed(targetUrl);
  const fetched = await fetchHtml(targetUrl);
  const result = buildExtractResult(request, fetched);
  extractCache.set(cacheKey, result);

  return {
    ...result,
    cache: buildCacheInfo(false),
  };
}

export async function collectPublicPages(
  request: CollectRequest,
): Promise<CollectResult> {
  const seedUrl = normalizeAndValidateUrl(request.seedUrl);
  const cacheKey = JSON.stringify({
    seedUrl: seedUrl.toString(),
    scope: request.scope,
    maxPages: request.maxPages,
    maxDepth: request.maxDepth,
    includePatterns: request.includePatterns,
    excludePatterns: request.excludePatterns,
    format: request.format,
    dedupe: request.dedupe,
    maxCharsPerPage: request.maxCharsPerPage,
  });
  const cached = collectCache.get(cacheKey);

  if (cached) {
    return {
      ...cached,
      cache: buildCacheInfo(true),
    };
  }

  const includePatterns = request.includePatterns.map(compilePattern);
  const excludePatterns = request.excludePatterns.map(compilePattern);
  const seedOrigin = seedUrl.origin;
  const queue: Array<{ url: URL; depth: number }> = [{ url: seedUrl, depth: 0 }];
  const enqueued = new Set([seedUrl.toString()]);
  const seen = new Set<string>();
  const skipped: CollectResult["skipped"] = [];
  const results: CollectResult["results"] = [];

  while (queue.length > 0 && results.length < request.maxPages) {
    const next = queue.shift();
    if (!next) {
      break;
    }

    const currentUrl = next.url;

    if (!matchesCollectionScope(currentUrl, seedOrigin)) {
      skipped.push({ url: currentUrl.toString(), reason: "out_of_scope" });
      continue;
    }

    if (!matchesPatterns(currentUrl, includePatterns, excludePatterns)) {
      skipped.push({ url: currentUrl.toString(), reason: "filtered_out" });
      continue;
    }

    let page: ExtractPageResult;

    try {
      page = await extractPublicPage({
        url: currentUrl.toString(),
        format: request.format,
        includeLinks: true,
        includeMetadata: true,
        includeJsonLd: false,
        maxChars: request.maxCharsPerPage,
      });
    } catch (error) {
      if (error instanceof HttpError && error.code === "forbidden_target") {
        skipped.push({ url: currentUrl.toString(), reason: "robots_disallowed" });
        continue;
      }

      skipped.push({ url: currentUrl.toString(), reason: "fetch_failed" });
      continue;
    }

    if (new URL(page.final_url).origin !== seedOrigin) {
      if (results.length === 0) {
        throw new HttpError(
          400,
          "invalid_request",
          "seed_url must remain on the same origin after redirects",
        );
      }

      skipped.push({ url: page.final_url, reason: "out_of_scope" });
      continue;
    }

    const dedupeKey =
      request.dedupe === "canonical_url"
        ? page.canonical_url || page.final_url
        : page.final_url;

    if (seen.has(dedupeKey)) {
      skipped.push({ url: page.final_url, reason: "duplicate" });
      continue;
    }

    seen.add(dedupeKey);
    results.push({
      url: currentUrl.toString(),
      final_url: page.final_url,
      title: page.title,
      canonical_url: page.canonical_url,
      text: page.text,
      markdown: page.markdown,
      fetched_at: page.fetched_at,
    });

    if (next.depth >= request.maxDepth || !page.links) {
      continue;
    }

    for (const link of page.links) {
      let resolved: URL;

      try {
        resolved = normalizeAndValidateUrl(link.href);
      } catch {
        continue;
      }

      if (!matchesCollectionScope(resolved, seedOrigin)) {
        continue;
      }

      const key = resolved.toString();
      if (enqueued.has(key)) {
        continue;
      }

      enqueued.add(key);
      queue.push({ url: resolved, depth: next.depth + 1 });
    }
  }

  const result: CachedCollectResult = {
    seed_url: seedUrl.toString(),
    pages_requested: request.maxPages,
    pages_fetched: results.length,
    pages_skipped: skipped.length,
    results,
    skipped,
    fetched_at: new Date().toISOString(),
  };

  collectCache.set(cacheKey, result);

  return {
    ...result,
    cache: buildCacheInfo(false),
  };
}

function buildExtractResult(
  request: ExtractPageRequest,
  fetched: {
    url: string;
    status: number;
    contentType: string;
    html: string;
  },
): CachedExtractPageResult {
  const $ = load(fetched.html, {
    baseURI: fetched.url,
  });

  const title = normalizeOptionalText($("title").first().text());
  const description = normalizeOptionalText(
    $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content"),
  );
  const lang = normalizeOptionalText($("html").attr("lang"));
  const canonicalUrl = resolveOptionalUrl($('link[rel="canonical"]').attr("href"), fetched.url);
  const text = truncateText(normalizeVisibleText($("body").text()), request.maxChars);
  const markdown = truncateText(
    normalizeWhitespace(turndown.turndown($("body").html() || "")),
    request.maxChars,
  );

  const links = request.includeLinks
    ? $("a[href]")
        .toArray()
        .map((element) => {
          const href = resolveOptionalUrl($(element).attr("href"), fetched.url);
          if (!href) {
            return null;
          }

          return {
            href,
            text: truncateText(normalizeWhitespace($(element).text()), 280) || "",
            rel: normalizeOptionalText($(element).attr("rel")),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .slice(0, 100)
    : undefined;

  const jsonLd = request.includeJsonLd
    ? $('script[type="application/ld+json"]')
        .toArray()
        .map((element) => parseJson($(element).html()))
        .filter((value): value is NonNullable<typeof value> => value !== undefined)
        .slice(0, 20)
    : undefined;

  $("script, style, noscript, template, svg").remove();

  return {
    url: request.url,
    final_url: fetched.url,
    status_code: fetched.status,
    content_type: fetched.contentType,
    title: request.includeMetadata ? title : undefined,
    description: request.includeMetadata ? description : undefined,
    lang: request.includeMetadata ? lang : undefined,
    canonical_url: request.includeMetadata ? canonicalUrl : undefined,
    text,
    markdown: request.format === "markdown" ? markdown : undefined,
    links,
    json_ld: jsonLd,
    fetched_at: new Date().toISOString(),
  };
}

async function fetchHtml(targetUrl: URL) {
  let currentUrl = targetUrl;

  for (let redirects = 0; redirects <= config.scrape.maxRedirects; redirects += 1) {
    const response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      headers: {
        "user-agent": config.scrape.userAgent,
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new HttpError(502, "upstream_error", "Redirect response did not include location");
      }

      currentUrl = normalizeAndValidateUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (response.status >= 400) {
      throw new HttpError(502, "upstream_error", `Upstream returned HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
    if (!isHtmlContentType(contentType)) {
      throw new HttpError(400, "invalid_request", "Target URL must return HTML content");
    }

    return {
      url: normalizeAndValidateUrl(response.url || currentUrl.toString()).toString(),
      status: response.status,
      contentType,
      html: await readBody(response),
    };
  }

  throw new HttpError(400, "invalid_request", "Redirect limit exceeded");
}

async function ensureRobotsAllowed(targetUrl: URL): Promise<void> {
  const rules = await getRobotsRules(targetUrl);
  const pathname = `${targetUrl.pathname}${targetUrl.search}`;
  const matched = rules
    .filter((rule) => matchesRobotsRule(pathname, rule.pattern))
    .sort((left, right) => right.pattern.length - left.pattern.length)[0];

  if (matched && !matched.allow) {
    throw new HttpError(
      403,
      "forbidden_target",
      "robots.txt disallows scraping this URL",
    );
  }
}

async function getRobotsRules(targetUrl: URL): Promise<RobotsRule[]> {
  const cacheKey = targetUrl.origin;
  const cached = robotsCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const robotsUrl = new URL("/robots.txt", targetUrl.origin);

  let response: Response;
  try {
    response = await fetch(robotsUrl, {
      method: "GET",
      headers: {
        "user-agent": config.scrape.userAgent,
        accept: "text/plain",
      },
    });
  } catch {
    robotsCache.set(cacheKey, []);
    return [];
  }

  if (response.status === 404) {
    robotsCache.set(cacheKey, []);
    return [];
  }

  if (!response.ok) {
    robotsCache.set(cacheKey, []);
    return [];
  }

  const rules = parseRobots(await response.text());
  robotsCache.set(cacheKey, rules);
  return rules;
}

function parseRobots(content: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let groupMatches = false;
  let seenRuleInGroup = false;

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.replace(/#.*/u, "").trim();
    if (!line) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const directive = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (directive === "user-agent") {
      if (seenRuleInGroup) {
        groupMatches = false;
        seenRuleInGroup = false;
      }

      if (value === "*" || value.toLowerCase() === "xlm402-bot") {
        groupMatches = true;
      }

      continue;
    }

    if (!groupMatches) {
      continue;
    }

    if (directive === "allow" || directive === "disallow") {
      seenRuleInGroup = true;
      rules.push({
        allow: directive === "allow",
        pattern: value,
      });
    }
  }

  return rules;
}

function matchesRobotsRule(pathname: string, pattern: string): boolean {
  if (!pattern) {
    return true;
  }

  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
    .replaceAll("*", ".*");
  const regex = new RegExp(`^${escaped}${pattern.endsWith("$") ? "" : ".*"}$`, "u");
  return regex.test(pathname);
}

async function readBody(response: Response): Promise<string> {
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > config.scrape.maxBodyBytes) {
    throw new HttpError(400, "invalid_request", "Target page exceeds max body size");
  }

  return buffer.toString("utf8");
}

function normalizeAndValidateUrl(rawUrl: string): URL {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new HttpError(400, "invalid_request", "URL must be a valid absolute URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new HttpError(400, "invalid_request", "URL must use http or https");
  }

  if (url.username || url.password) {
    throw new HttpError(400, "invalid_request", "Authenticated URLs are not supported");
  }

  if (isForbiddenHostname(url.hostname)) {
    throw new HttpError(400, "invalid_request", "Target URL host is not allowed");
  }

  url.hash = "";
  return url;
}

function isForbiddenHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();

  if (!normalized || normalized === "localhost" || normalized.endsWith(".local")) {
    return true;
  }

  if (normalized === "::1" || normalized === "[::1]") {
    return true;
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) {
    return true;
  }

  if (!/^\d+\.\d+\.\d+\.\d+$/u.test(normalized)) {
    return false;
  }

  const octets = normalized.split(".").map(Number);
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isHtmlContentType(contentType: string): boolean {
  return contentType === "text/html" || contentType === "application/xhtml+xml";
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function normalizeVisibleText(value: string): string {
  return value
    .replace(/\u00a0/gu, " ")
    .replace(/\s+\n/gu, "\n")
    .replace(/\n\s+/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeWhitespace(value);
  return normalized || undefined;
}

function truncateText(value: string, maxChars: number): string | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function resolveOptionalUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return normalizeAndValidateUrl(new URL(value, baseUrl).toString()).toString();
  } catch {
    return undefined;
  }
}

function parseJson(raw: string | null): unknown | undefined {
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function buildCacheInfo(hit: boolean) {
  return {
    hit,
    ttl_seconds: config.scrape.cacheTtlSeconds,
  };
}

function compilePattern(pattern: string): RegExp {
  try {
    return new RegExp(pattern, "u");
  } catch {
    throw new HttpError(400, "invalid_request", `Invalid regex pattern: ${pattern}`);
  }
}

function matchesPatterns(
  url: URL,
  includePatterns: RegExp[],
  excludePatterns: RegExp[],
): boolean {
  const value = `${url.pathname}${url.search}`;

  if (excludePatterns.some((pattern) => pattern.test(value))) {
    return false;
  }

  if (includePatterns.length === 0) {
    return true;
  }

  return includePatterns.some((pattern) => pattern.test(value));
}

function matchesCollectionScope(url: URL, seedOrigin: string): boolean {
  return url.origin === seedOrigin;
}
