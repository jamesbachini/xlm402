import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { Keypair } from "@stellar/stellar-sdk";
import { getUsdcAddress } from "@x402/stellar";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { NEWS_FEEDS } from "../src/services/newsFeeds.ts";

type JsonValue = Record<string, unknown> | unknown[];

type TestServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

type AppContext = {
  appBaseUrl: string;
  close: () => Promise<void>;
  facilitatorRequests: {
    verify: Array<Record<string, unknown>>;
    settle: Array<Record<string, unknown>>;
  };
  facilitatorBehavior: {
    settleMode: "success" | "failure";
  };
  renderDocsPage: (catalog: unknown) => string;
  buildPlatformCatalog: () => unknown;
};

let context: AppContext;
let originalFetch: typeof fetch;
let mainnetXlmContract: string;
let testnetXlmContract: string;

function buildRssFeed(items: Array<{
  title: string;
  link: string;
  pubDate: string;
  description: string;
}>): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    ${items
      .map(
        (item) => `<item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <pubDate>${item.pubDate}</pubDate>
      <description><![CDATA[${item.description}]]></description>
    </item>`,
      )
      .join("\n")}
  </channel>
</rss>`;
}

function buildAtomFeed(items: Array<{
  title: string;
  link: string;
  published: string;
  summary: string;
}>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  ${items
    .map(
      (item) => `<entry>
    <title>${item.title}</title>
    <link rel="alternate" href="${item.link}" />
    <published>${item.published}</published>
    <summary>${item.summary}</summary>
  </entry>`,
    )
    .join("\n")}
</feed>`;
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function startJsonServer(
  handler: (
    req: IncomingMessage,
    res: ServerResponse,
  ) => Promise<void> | void,
): Promise<TestServer> {
  const server = createServer(async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          error: String(error),
        }),
      );
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });

  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function sendJson(res: ServerResponse, statusCode: number, body: JsonValue) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function createTestPaymentClient(
  selectRequirement?: Parameters<typeof x402Client>[0],
) {
  return new x402HTTPClient(
    new x402Client(selectRequirement).register("stellar:*", {
      scheme: "exact",
      async createPaymentPayload(x402Version: number) {
        return {
          x402Version,
          payload: {
            provider: "integration-test",
          },
        };
      },
    }),
  );
}

before(async () => {
  const mainnetPayTo = Keypair.random().publicKey();
  const testnetPayTo = Keypair.random().publicKey();
  const facilitatorSigner = Keypair.random().publicKey();
  originalFetch = globalThis.fetch.bind(globalThis);
  mainnetXlmContract = getUsdcAddress("stellar:testnet");
  testnetXlmContract = getUsdcAddress("stellar:pubnet");
  const newsFeedXmlByUrl = new Map<string, string>([
    [
      NEWS_FEEDS.find((feed) => feed.id === "openai-news")!.feedUrl,
      buildRssFeed([
        {
          title: "OpenAI launches a new model",
          link: "https://example.com/openai-model",
          pubDate: "Wed, 19 Mar 2026 10:00:00 GMT",
          description: "OpenAI news item one",
        },
        {
          title: "OpenAI publishes benchmark notes",
          link: "https://example.com/openai-benchmarks",
          pubDate: "Wed, 19 Mar 2026 08:00:00 GMT",
          description: "OpenAI news item two",
        },
      ]),
    ],
    [
      NEWS_FEEDS.find((feed) => feed.id === "google-ai")!.feedUrl,
      buildAtomFeed([
        {
          title: "Google ships a new agent",
          link: "https://example.com/google-agent",
          published: "2026-03-19T11:00:00Z",
          summary: "Google AI story one",
        },
        {
          title: "Google updates multimodal search",
          link: "https://example.com/google-search",
          published: "2026-03-19T07:00:00Z",
          summary: "Google AI story two",
        },
      ]),
    ],
    [
      NEWS_FEEDS.find((feed) => feed.id === "hugging-face")!.feedUrl,
      buildRssFeed([
        {
          title: "Hugging Face releases a compact model",
          link: "https://example.com/hf-compact-model",
          pubDate: "Wed, 19 Mar 2026 10:30:00 GMT",
          description: "Hugging Face story one",
        },
        {
          title: "Hugging Face adds new evaluation tools",
          link: "https://example.com/hf-eval-tools",
          pubDate: "Wed, 19 Mar 2026 06:00:00 GMT",
          description: "Hugging Face story two",
        },
      ]),
    ],
    [
      NEWS_FEEDS.find((feed) => feed.id === "bbc-world")!.feedUrl,
      buildRssFeed([
        {
          title: "Global headline one",
          link: "https://example.com/global-one",
          pubDate: "Wed, 19 Mar 2026 10:00:00 GMT",
          description: "Global story one",
        },
      ]),
    ],
    [
      NEWS_FEEDS.find((feed) => feed.id === "al-jazeera")!.feedUrl,
      buildRssFeed([
        {
          title: "Global headline two",
          link: "https://example.com/global-two",
          pubDate: "Wed, 19 Mar 2026 09:30:00 GMT",
          description: "Global story two",
        },
      ]),
    ],
    [
      NEWS_FEEDS.find((feed) => feed.id === "wsj-world")!.feedUrl,
      buildRssFeed([
        {
          title: "Global headline three",
          link: "https://example.com/global-three",
          pubDate: "Wed, 19 Mar 2026 09:00:00 GMT",
          description: "Global story three",
        },
      ]),
    ],
  ]);
  const htmlByUrl = new Map<
    string,
    {
      body: string;
      contentType: string;
      status?: number;
      location?: string;
    }
  >([
    [
      "https://scrape.example/robots.txt",
      {
        body: "User-agent: *\nDisallow: /blocked\n",
        contentType: "text/plain",
      },
    ],
    [
      "https://scrape.example/article",
      {
        body: `<!doctype html>
<html lang="en">
  <head>
    <title>Example Article</title>
    <meta name="description" content="Structured extraction example">
    <link rel="canonical" href="https://scrape.example/article">
    <script type="application/ld+json">{"@type":"Article","headline":"Example Article"}</script>
  </head>
  <body>
    <main>
      <h1>Example Article</h1>
      <p>This page contains useful text for structured extraction.</p>
      <a href="/related" rel="next">Related page</a>
      <a href="/blocked">Blocked page</a>
    </main>
  </body>
</html>`,
        contentType: "text/html; charset=utf-8",
      },
    ],
    [
      "https://scrape.example/related",
      {
        body: `<!doctype html>
<html lang="en">
  <head><title>Related Page</title></head>
  <body><p>Related content lives here.</p></body>
</html>`,
        contentType: "text/html; charset=utf-8",
      },
    ],
    [
      "https://scrape.example/blocked",
      {
        body: `<!doctype html><html><body><p>Blocked page.</p></body></html>`,
        contentType: "text/html; charset=utf-8",
      },
    ],
    [
      "https://collect.example/robots.txt",
      {
        body: "User-agent: *\nDisallow: /private\n",
        contentType: "text/plain",
      },
    ],
    [
      "https://collect.example/blog",
      {
        body: `<!doctype html>
<html lang="en">
  <head><title>Blog Index</title><link rel="canonical" href="https://collect.example/blog"></head>
  <body>
    <h1>Blog</h1>
    <a href="/blog/post-1">Post 1</a>
    <a href="/blog/post-2">Post 2</a>
    <a href="/tag/ignore">Ignore Tag</a>
    <a href="/private/secret">Private</a>
  </body>
</html>`,
        contentType: "text/html; charset=utf-8",
      },
    ],
    [
      "https://collect.example/blog/post-1",
      {
        body: `<!doctype html>
<html lang="en">
  <head>
    <title>Post One</title>
    <link rel="canonical" href="https://collect.example/blog/post-1">
  </head>
  <body>
    <article>
      <h1>Post One</h1>
      <p>Collected content for the first post.</p>
      <a href="/blog/post-2">Post 2</a>
    </article>
  </body>
</html>`,
        contentType: "text/html; charset=utf-8",
      },
    ],
    [
      "https://collect.example/blog/post-2",
      {
        body: `<!doctype html>
<html lang="en">
  <head>
    <title>Post Two</title>
    <link rel="canonical" href="https://collect.example/blog/post-2">
  </head>
  <body>
    <article>
      <h1>Post Two</h1>
      <p>Collected content for the second post.</p>
    </article>
  </body>
</html>`,
        contentType: "text/html; charset=utf-8",
      },
    ],
    [
      "https://collect.example/tag/ignore",
      {
        body: `<!doctype html><html><body><p>Ignored page.</p></body></html>`,
        contentType: "text/html; charset=utf-8",
      },
    ],
    [
      "https://collect.example/private/secret",
      {
        body: `<!doctype html><html><body><p>Private page.</p></body></html>`,
        contentType: "text/html; charset=utf-8",
      },
    ],
  ]);

  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url === "https://api.binance.com/api/v3/ticker/price?symbol=XLMUSDT") {
      return new Response(JSON.stringify({ price: "0.25" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }

    const newsXml = newsFeedXmlByUrl.get(url);
    if (newsXml) {
      return new Response(newsXml, {
        status: 200,
        headers: {
          "content-type": "application/rss+xml",
        },
      });
    }

    const html = htmlByUrl.get(url);
    if (html) {
      return new Response(html.body, {
        status: html.status ?? 200,
        headers: {
          "content-type": html.contentType,
          ...(html.location ? { location: html.location } : {}),
        },
      });
    }

    return originalFetch(input, init);
  };

  const weatherServer = await startJsonServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");

    if (url.pathname === "/v1/archive") {
      return sendJson(res, 200, {
        latitude: Number(url.searchParams.get("latitude") ?? 51.5072),
        longitude: Number(url.searchParams.get("longitude") ?? -0.1276),
        timezone: url.searchParams.get("timezone") ?? "auto",
        daily: {
          time: ["2026-03-01", "2026-03-02"],
          temperature_2m_max: [12.5, 14.1],
          temperature_2m_min: [6.2, 7.4],
          precipitation_sum: [1.1, 0.4],
        },
      });
    }

    return sendJson(res, 200, {
      latitude: Number(url.searchParams.get("latitude") ?? 51.5072),
      longitude: Number(url.searchParams.get("longitude") ?? -0.1276),
      timezone: url.searchParams.get("timezone") ?? "auto",
      current: {
        temperature_2m: 11.8,
        relative_humidity_2m: 68,
        apparent_temperature: 10.9,
        precipitation: 0,
        weather_code: 3,
        cloud_cover: 56,
        pressure_msl: 1015.4,
        wind_speed_10m: 4.8,
        wind_direction_10m: 212,
        is_day: 1,
      },
      daily: {
        time: ["2026-03-17", "2026-03-18", "2026-03-19"],
        temperature_2m_max: [13.2, 14.4, 15.1],
        temperature_2m_min: [7.1, 8.2, 8.7],
        precipitation_sum: [0.2, 0, 0.6],
      },
    });
  });

  const facilitatorRequests = {
    verify: [] as Array<Record<string, unknown>>,
    settle: [] as Array<Record<string, unknown>>,
  };
  const facilitatorBehavior = {
    settleMode: "success" as "success" | "failure",
  };

  const facilitatorServer = await startJsonServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");

    if (req.method === "GET" && url.pathname === "/supported") {
      return sendJson(res, 200, {
        kinds: [
          {
            x402Version: 2,
            scheme: "exact",
            network: "stellar:pubnet",
            extra: { areFeesSponsored: true },
          },
          {
            x402Version: 2,
            scheme: "exact",
            network: "stellar:testnet",
            extra: { areFeesSponsored: true },
          },
        ],
        extensions: [],
        signers: {
          stellar: [facilitatorSigner],
        },
      });
    }

    if (req.method === "POST" && url.pathname === "/verify") {
      const body = await readJson(req);
      facilitatorRequests.verify.push(body);
      return sendJson(res, 200, {
        isValid: true,
        payer: "GTESTPAYER",
      });
    }

    if (req.method === "POST" && url.pathname === "/settle") {
      const body = await readJson(req);
      facilitatorRequests.settle.push(body);
      const paymentRequirements = body.paymentRequirements as Record<string, unknown>;

      if (facilitatorBehavior.settleMode === "failure") {
        return sendJson(res, 400, {
          success: false,
          errorReason: "asset_not_supported",
          errorMessage: `Asset ${String(paymentRequirements.asset)} is not enabled for settlement`,
          transaction: "",
          network: paymentRequirements.network,
        });
      }

      return sendJson(res, 200, {
        success: true,
        payer: "GTESTPAYER",
        transaction: "mock-settlement-transaction",
        network: paymentRequirements.network,
      });
    }

    sendJson(res, 404, { error: "not_found" });
  });

  process.env.NODE_ENV = "test";
  process.env.PUBLIC_BASE_URL = "http://127.0.0.1:3000";
  process.env.MAINNET_PAY_TO_ADDRESS = mainnetPayTo;
  process.env.TESTNET_PAY_TO_ADDRESS = testnetPayTo;
  process.env.MAINNET_FACILITATOR_URL = facilitatorServer.baseUrl;
  process.env.TESTNET_FACILITATOR_URL = facilitatorServer.baseUrl;
  process.env.MAINNET_SOROBAN_RPC_URL = "https://soroban-rpc.mainnet.stellar.gateway.fm";
  process.env.TESTNET_SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
  process.env.MAINNET_XLM_CONTRACT_ADDRESS = mainnetXlmContract;
  process.env.TESTNET_XLM_CONTRACT_ADDRESS = testnetXlmContract;
  process.env.OPEN_METEO_BASE_URL = weatherServer.baseUrl;
  process.env.OPEN_METEO_ARCHIVE_BASE_URL = weatherServer.baseUrl;

  const [{ createApp }, docsModule, catalogModule] = await Promise.all([
    import("../src/app.ts"),
    import("../src/platform/docs.ts"),
    import("../src/platform/catalog.ts"),
  ]);

  const app = await createApp();
  const appServer = createServer(app);

  await new Promise<void>((resolve, reject) => {
    appServer.listen(0, "127.0.0.1", () => resolve());
    appServer.on("error", reject);
  });

  const appAddress = appServer.address() as AddressInfo;

  context = {
    appBaseUrl: `http://127.0.0.1:${appAddress.port}`,
    facilitatorRequests,
    facilitatorBehavior,
    renderDocsPage: docsModule.renderDocsPage,
    buildPlatformCatalog: catalogModule.buildPlatformCatalog,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        appServer.close((error) => (error ? reject(error) : resolve()));
      });
      await facilitatorServer.close();
      await weatherServer.close();
    },
  };
});

after(async () => {
  globalThis.fetch = originalFetch;
  await context.close();
});

test.afterEach(() => {
  context.facilitatorBehavior.settleMode = "success";
});

test("catalogue HTML uses the v2 payment flow and bundled Freighter client", () => {
  const html = context.renderDocsPage(context.buildPlatformCatalog());

  assert.match(html, /\/vendor\/freighter-x402\.js/);
  assert.match(html, /PAYMENT-REQUIRED/);
  assert.match(html, /createPaymentPayload/);
  assert.match(html, /X402Freighter/);
  assert.match(html, /data-asset-label/);
  assert.match(html, /\['USDC', 'XLM'\]/);
  assert.match(html, /preferredAsset/);
  assert.match(html, /class="request-editor"/);
  assert.match(html, /reasoning_effort&quot;: &quot;medium&quot;/);
  assert.doesNotMatch(html, /authModal\(/);
  assert.doesNotMatch(html, /openModal\(/);
  assert.doesNotMatch(html, /Pay with Freighter/);
  assert.doesNotMatch(html, /X-PAYMENT/);
  assert.doesNotMatch(html, /reasoning_effort&quot;: &quot;minimal&quot;/);
  assert.doesNotMatch(html, /Hello, world!/);
  assert.doesNotMatch(html, /A beautiful sunset over the ocean/);
});

test("public discovery endpoints advertise XLM when enabled for any configured network", async () => {
  const [healthResponse, catalogResponse] = await Promise.all([
    fetch(`${context.appBaseUrl}/health`),
    fetch(`${context.appBaseUrl}/api/catalog`),
  ]);

  assert.equal(healthResponse.status, 200);
  assert.equal(catalogResponse.status, 200);

  const healthBody = (await healthResponse.json()) as {
    payment_assets: string[];
  };
  const catalogBody = (await catalogResponse.json()) as {
    payment_assets: string[];
    services: Array<{ id: string }>;
    endpoints: Array<{ network: string; payment_assets: string[]; service: string }>;
  };

  assert.deepEqual(healthBody.payment_assets, ["USDC", "XLM"]);
  assert.deepEqual(catalogBody.payment_assets, ["USDC", "XLM"]);

  const mainnetEndpoint = catalogBody.endpoints.find(
    (endpoint) => endpoint.network === "mainnet",
  );
  const testnetEndpoint = catalogBody.endpoints.find(
    (endpoint) => endpoint.network === "testnet",
  );

  assert.ok(mainnetEndpoint);
  assert.ok(testnetEndpoint);
  assert.deepEqual(mainnetEndpoint.payment_assets, ["USDC", "XLM"]);
  assert.deepEqual(testnetEndpoint.payment_assets, ["USDC", "XLM"]);
  assert.ok(catalogBody.services.some((service) => service.id === "scrape"));
  assert.ok(catalogBody.services.some((service) => service.id === "collect"));
  assert.ok(catalogBody.endpoints.some((endpoint) => endpoint.service === "scrape"));
  assert.ok(catalogBody.endpoints.some((endpoint) => endpoint.service === "collect"));
});

test("weather routes expose USDC and XLM on both mainnet and testnet when configured", async () => {
  const client = new x402HTTPClient(new x402Client());
  const cases = [
    {
      route: "/weather/current",
      url:
        `${context.appBaseUrl}/weather/current` +
        "?latitude=51.5072&longitude=-0.1276&timezone=auto",
      network: "stellar:pubnet",
      payTo: process.env.MAINNET_PAY_TO_ADDRESS!,
      xlmContract: mainnetXlmContract,
      expectedAccepts: 2,
      expectsXlm: true,
    },
    {
      route: "/testnet/weather/current",
      url:
        `${context.appBaseUrl}/testnet/weather/current` +
        "?latitude=51.5072&longitude=-0.1276&timezone=auto",
      network: "stellar:testnet",
      payTo: process.env.TESTNET_PAY_TO_ADDRESS!,
      xlmContract: testnetXlmContract,
      expectedAccepts: 2,
      expectsXlm: true,
    },
  ];

  for (const testCase of cases) {
    const unpaidResponse = await fetch(testCase.url);
    assert.equal(unpaidResponse.status, 402);

    const unpaidBody = (await unpaidResponse.json()) as Record<string, unknown>;
    const paymentRequired = client.getPaymentRequiredResponse(
      (name) => unpaidResponse.headers.get(name) ?? undefined,
      unpaidBody,
    );

    assert.equal(unpaidBody.route, testCase.route);
    assert.equal(paymentRequired.accepts.length, testCase.expectedAccepts);

    const usdcRequirement = paymentRequired.accepts.find(
      (requirement) => requirement.asset === getUsdcAddress(testCase.network),
    );
    const xlmRequirement = paymentRequired.accepts.find(
      (requirement) => requirement.asset === testCase.xlmContract,
    );

    assert.ok(usdcRequirement);
    assert.equal(Boolean(xlmRequirement), testCase.expectsXlm);
    assert.equal(usdcRequirement.network, testCase.network);
    assert.equal(usdcRequirement.payTo, testCase.payTo);
    if (xlmRequirement) {
      assert.equal(xlmRequirement.network, testCase.network);
      assert.equal(xlmRequirement.payTo, testCase.payTo);
    }
  }
});

test("news routes expose USDC and XLM on both mainnet and testnet when configured", async () => {
  const client = new x402HTTPClient(new x402Client());
  const cases = [
    {
      route: "/news/global",
      url: `${context.appBaseUrl}/news/global?limit=3&max_per_feed=1`,
      network: "stellar:pubnet",
      payTo: process.env.MAINNET_PAY_TO_ADDRESS!,
      xlmContract: mainnetXlmContract,
      expectedAccepts: 2,
      expectsXlm: true,
    },
    {
      route: "/testnet/news/global",
      url: `${context.appBaseUrl}/testnet/news/global?limit=3&max_per_feed=1`,
      network: "stellar:testnet",
      payTo: process.env.TESTNET_PAY_TO_ADDRESS!,
      xlmContract: testnetXlmContract,
      expectedAccepts: 2,
      expectsXlm: true,
    },
  ];

  for (const testCase of cases) {
    const unpaidResponse = await fetch(testCase.url);
    assert.equal(unpaidResponse.status, 402);

    const unpaidBody = (await unpaidResponse.json()) as Record<string, unknown>;
    const paymentRequired = client.getPaymentRequiredResponse(
      (name) => unpaidResponse.headers.get(name) ?? undefined,
      unpaidBody,
    );

    assert.equal(unpaidBody.route, testCase.route);
    assert.equal(paymentRequired.accepts.length, testCase.expectedAccepts);

    const usdcRequirement = paymentRequired.accepts.find(
      (requirement) => requirement.asset === getUsdcAddress(testCase.network),
    );
    const xlmRequirement = paymentRequired.accepts.find(
      (requirement) => requirement.asset === testCase.xlmContract,
    );

    assert.ok(usdcRequirement);
    assert.equal(Boolean(xlmRequirement), testCase.expectsXlm);
    assert.equal(usdcRequirement.network, testCase.network);
    assert.equal(usdcRequirement.payTo, testCase.payTo);
    if (xlmRequirement) {
      assert.equal(xlmRequirement.network, testCase.network);
      assert.equal(xlmRequirement.payTo, testCase.payTo);
    }
  }
});

test("scrape and collect routes expose USDC and XLM on both mainnet and testnet when configured", async () => {
  const client = new x402HTTPClient(new x402Client());
  const cases = [
    {
      route: "/scrape/extract",
      url: `${context.appBaseUrl}/scrape/extract`,
      body: { url: "https://scrape.example/article" },
      network: "stellar:pubnet",
      payTo: process.env.MAINNET_PAY_TO_ADDRESS!,
      xlmContract: mainnetXlmContract,
    },
    {
      route: "/testnet/scrape/extract",
      url: `${context.appBaseUrl}/testnet/scrape/extract`,
      body: { url: "https://scrape.example/article" },
      network: "stellar:testnet",
      payTo: process.env.TESTNET_PAY_TO_ADDRESS!,
      xlmContract: testnetXlmContract,
    },
    {
      route: "/collect/run",
      url: `${context.appBaseUrl}/collect/run`,
      body: { seed_url: "https://collect.example/blog" },
      network: "stellar:pubnet",
      payTo: process.env.MAINNET_PAY_TO_ADDRESS!,
      xlmContract: mainnetXlmContract,
    },
    {
      route: "/testnet/collect/run",
      url: `${context.appBaseUrl}/testnet/collect/run`,
      body: { seed_url: "https://collect.example/blog" },
      network: "stellar:testnet",
      payTo: process.env.TESTNET_PAY_TO_ADDRESS!,
      xlmContract: testnetXlmContract,
    },
  ];

  for (const testCase of cases) {
    const unpaidResponse = await fetch(testCase.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(testCase.body),
    });
    assert.equal(unpaidResponse.status, 402);

    const unpaidBody = (await unpaidResponse.json()) as Record<string, unknown>;
    const paymentRequired = client.getPaymentRequiredResponse(
      (name) => unpaidResponse.headers.get(name) ?? undefined,
      unpaidBody,
    );

    assert.equal(unpaidBody.route, testCase.route);
    assert.equal(paymentRequired.accepts.length, 2);

    const usdcRequirement = paymentRequired.accepts.find(
      (requirement) => requirement.asset === getUsdcAddress(testCase.network),
    );
    const xlmRequirement = paymentRequired.accepts.find(
      (requirement) => requirement.asset === testCase.xlmContract,
    );

    assert.ok(usdcRequirement);
    assert.ok(xlmRequirement);
    assert.equal(usdcRequirement.network, testCase.network);
    assert.equal(usdcRequirement.payTo, testCase.payTo);
    assert.equal(xlmRequirement.network, testCase.network);
    assert.equal(xlmRequirement.payTo, testCase.payTo);
  }
});

test("paid weather route accepts a v2 retry and returns settlement headers", async () => {
  context.facilitatorRequests.verify.length = 0;
  context.facilitatorRequests.settle.length = 0;

  const url =
    `${context.appBaseUrl}/weather/current` +
    "?latitude=51.5072&longitude=-0.1276&timezone=auto";

  const unpaidResponse = await fetch(url);
  assert.equal(unpaidResponse.status, 402);
  assert.ok(unpaidResponse.headers.get("payment-required"));

  const unpaidBody = (await unpaidResponse.json()) as Record<string, unknown>;
  assert.equal(unpaidBody.error, "payment_required");
  assert.equal(unpaidBody.route, "/weather/current");

  const fakeSchemeClient = {
    scheme: "exact",
    async createPaymentPayload(x402Version: number) {
      return {
        x402Version,
        payload: {
          provider: "integration-test",
        },
      };
    },
  };

  const client = new x402HTTPClient(
    new x402Client().register("stellar:*", fakeSchemeClient),
  );

  const paymentRequired = client.getPaymentRequiredResponse(
    (name) => unpaidResponse.headers.get(name) ?? undefined,
    unpaidBody,
  );
  const paymentPayload = await client.createPaymentPayload(paymentRequired);

  const paidResponse = await fetch(url, {
    headers: client.encodePaymentSignatureHeader(paymentPayload),
  });

  assert.equal(paidResponse.status, 200);
  assert.ok(paidResponse.headers.get("payment-response"));

  const paidBody = (await paidResponse.json()) as Record<string, unknown>;
  assert.equal(paidBody.paid, true);
  assert.equal(paidBody.network, "mainnet");
  assert.ok((paidBody.data as Record<string, unknown>).current);

  assert.equal(context.facilitatorRequests.verify.length, 1);
  assert.equal(context.facilitatorRequests.settle.length, 1);

  const verifyRequest = context.facilitatorRequests.verify[0];
  const settleRequest = context.facilitatorRequests.settle[0];
  const verifyPayload = verifyRequest.paymentPayload as Record<string, unknown>;

  assert.equal(verifyRequest.x402Version, 2);
  assert.equal(
    (verifyPayload.accepted as Record<string, unknown>).network,
    "stellar:pubnet",
  );
  assert.deepEqual(settleRequest.paymentPayload, verifyRequest.paymentPayload);
});

test("XLM-selected retries settle against the configured XLM asset on testnet", async () => {
  context.facilitatorRequests.verify.length = 0;
  context.facilitatorRequests.settle.length = 0;

  const cases = [
    {
      url:
        `${context.appBaseUrl}/testnet/weather/current` +
        "?latitude=51.5072&longitude=-0.1276&timezone=auto",
      network: "stellar:testnet",
      xlmContract: testnetXlmContract,
      expectedNetwork: "testnet",
    },
  ];

  for (const testCase of cases) {
    const unpaidResponse = await fetch(testCase.url);
    assert.equal(unpaidResponse.status, 402);

    const unpaidBody = (await unpaidResponse.json()) as Record<string, unknown>;
    const client = new x402HTTPClient(
      new x402Client((_x402Version, accepts) => {
        const selectedRequirement = accepts.find(
          (requirement) => requirement.asset === testCase.xlmContract,
        );
        assert.ok(selectedRequirement);
        return selectedRequirement;
      }).register("stellar:*", {
        scheme: "exact",
        async createPaymentPayload(x402Version: number) {
          return {
            x402Version,
            payload: {
              provider: "integration-test",
              asset: "XLM",
            },
          };
        },
      }),
    );

    const paymentRequired = client.getPaymentRequiredResponse(
      (name) => unpaidResponse.headers.get(name) ?? undefined,
      unpaidBody,
    );
    const paymentPayload = await client.createPaymentPayload(paymentRequired);
    const paidResponse = await fetch(testCase.url, {
      headers: client.encodePaymentSignatureHeader(paymentPayload),
    });

    assert.equal(paidResponse.status, 200);

    const paidBody = (await paidResponse.json()) as Record<string, unknown>;
    assert.equal(paidBody.network, testCase.expectedNetwork);
  }

  assert.equal(context.facilitatorRequests.verify.length, 1);
  assert.equal(context.facilitatorRequests.settle.length, 1);

  context.facilitatorRequests.verify.forEach((request, index) => {
    const payload = request.paymentPayload as Record<string, unknown>;
    const accepted = payload.accepted as Record<string, unknown>;
    const requirements = request.paymentRequirements as Record<string, unknown>;
    const expectedContract = cases[index].xlmContract;
    const expectedNetwork = cases[index].network;

    assert.equal(accepted.asset, expectedContract);
    assert.equal(accepted.network, expectedNetwork);
    assert.equal(requirements.asset, expectedContract);
    assert.equal(requirements.network, expectedNetwork);
  });
});

test("settlement failures return the facilitator error instead of a blank body", async () => {
  context.facilitatorRequests.verify.length = 0;
  context.facilitatorRequests.settle.length = 0;
  context.facilitatorBehavior.settleMode = "failure";

  const url =
    `${context.appBaseUrl}/weather/current` +
    "?latitude=51.5072&longitude=-0.1276&timezone=auto";

  const unpaidResponse = await fetch(url);
  assert.equal(unpaidResponse.status, 402);

  const unpaidBody = (await unpaidResponse.json()) as Record<string, unknown>;
  const client = new x402HTTPClient(
    new x402Client().register("stellar:*", {
      scheme: "exact",
      async createPaymentPayload(x402Version: number) {
        return {
          x402Version,
          payload: {
            provider: "integration-test",
            asset: "XLM",
          },
        };
      },
    }),
  );

  const paymentRequired = client.getPaymentRequiredResponse(
    (name) => unpaidResponse.headers.get(name) ?? undefined,
    unpaidBody,
  );
  assert.equal(paymentRequired.accepts.length, 2);
  const paymentPayload = await client.createPaymentPayload(paymentRequired);
  const paidResponse = await fetch(url, {
    headers: client.encodePaymentSignatureHeader(paymentPayload),
  });
  const paidBody = (await paidResponse.json()) as Record<string, unknown>;
  const settledRequirements = context.facilitatorRequests.settle[0]
    .paymentRequirements as Record<string, unknown>;

  assert.equal(paidResponse.status, 402);
  assert.equal(paidBody.error, "payment_settlement_failed");
  assert.equal(paidBody.reason, "asset_not_supported");
  assert.match(String(paidBody.message), new RegExp(String(settledRequirements.asset)));
  assert.equal(paidBody.route, "/weather/current");
});

test("paid news route returns standardized mixed stories", async () => {
  context.facilitatorRequests.verify.length = 0;
  context.facilitatorRequests.settle.length = 0;

  const url = `${context.appBaseUrl}/news/ai?limit=5&max_per_feed=2`;
  const unpaidResponse = await fetch(url);
  assert.equal(unpaidResponse.status, 402);

  const unpaidBody = (await unpaidResponse.json()) as Record<string, unknown>;
  const fakeSchemeClient = {
    scheme: "exact",
    async createPaymentPayload(x402Version: number) {
      return {
        x402Version,
        payload: {
          provider: "integration-test",
        },
      };
    },
  };

  const client = new x402HTTPClient(
    new x402Client().register("stellar:*", fakeSchemeClient),
  );
  const paymentRequired = client.getPaymentRequiredResponse(
    (name) => unpaidResponse.headers.get(name) ?? undefined,
    unpaidBody,
  );
  const paymentPayload = await client.createPaymentPayload(paymentRequired);

  const paidResponse = await fetch(url, {
    headers: client.encodePaymentSignatureHeader(paymentPayload),
  });

  assert.equal(paidResponse.status, 200);

  const paidBody = (await paidResponse.json()) as Record<string, unknown>;
  assert.equal(paidBody.network, "mainnet");
  assert.equal(paidBody.price_usd, "0.01");

  const data = paidBody.data as Record<string, unknown>;
  assert.equal(data.category, "ai");
  assert.equal(data.story_count, 5);
  assert.equal(data.source_count, 3);
  assert.deepEqual(
    (data.sources as Array<{ source: { id: string } }>).map((item) => item.source.id),
    ["openai-news", "google-ai", "hugging-face"],
  );

  const stories = data.stories as Array<Record<string, unknown>>;
  assert.equal(stories.length, 5);
  assert.deepEqual(
    stories.slice(0, 3).map((story) => (story.source as Record<string, unknown>).id),
    ["google-ai", "hugging-face", "openai-news"],
  );
  assert.deepEqual(
    Object.keys(stories[0]),
    ["title", "url", "summary", "published_at", "source", "category"],
  );
  assert.equal(stories[0].category, "ai");
  assert.equal(
    (stories[0].source as Record<string, unknown>).feed_url,
    NEWS_FEEDS.find((feed) => feed.id === "google-ai")!.feedUrl,
  );
  assert.match(String(stories[0].published_at), /^2026-03-19T11:00:00\.000Z$/);
});

test("paid scrape route extracts metadata, markdown, links, and cache state", async () => {
  const url = `${context.appBaseUrl}/scrape/extract`;
  const requestBody = {
    url: "https://scrape.example/article",
    format: "markdown",
    include_links: true,
    include_metadata: true,
    include_json_ld: true,
    max_chars: 50000,
  };

  const unpaidResponse = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  assert.equal(unpaidResponse.status, 402);

  const unpaidBody = (await unpaidResponse.json()) as Record<string, unknown>;
  const client = createTestPaymentClient();
  const paymentRequired = client.getPaymentRequiredResponse(
    (name) => unpaidResponse.headers.get(name) ?? undefined,
    unpaidBody,
  );
  const paymentPayload = await client.createPaymentPayload(paymentRequired);
  const headers = {
    "content-type": "application/json",
    ...client.encodePaymentSignatureHeader(paymentPayload),
  };

  const firstPaidResponse = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });
  assert.equal(firstPaidResponse.status, 200);

  const firstPaidBody = (await firstPaidResponse.json()) as Record<string, unknown>;
  const firstData = firstPaidBody.data as Record<string, unknown>;

  assert.equal(firstPaidBody.network, "mainnet");
  assert.equal(firstPaidBody.price_usd, "0.03");
  assert.equal(firstData.title, "Example Article");
  assert.equal(firstData.description, "Structured extraction example");
  assert.equal(firstData.lang, "en");
  assert.equal(firstData.canonical_url, "https://scrape.example/article");
  assert.equal(firstData.final_url, "https://scrape.example/article");
  assert.equal((firstData.cache as Record<string, unknown>).hit, false);
  assert.match(String(firstData.markdown), /Example Article/);
  assert.match(String(firstData.text), /useful text for structured extraction/i);
  assert.equal((firstData.links as unknown[]).length, 2);
  assert.equal((firstData.json_ld as unknown[]).length, 1);

  const secondPaidResponse = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });
  assert.equal(secondPaidResponse.status, 200);

  const secondPaidBody = (await secondPaidResponse.json()) as Record<string, unknown>;
  const secondData = secondPaidBody.data as Record<string, unknown>;
  assert.equal((secondData.cache as Record<string, unknown>).hit, true);
});

test("paid collect route returns bounded same-origin results with skip reasons", async () => {
  const url = `${context.appBaseUrl}/collect/run`;
  const requestBody = {
    seed_url: "https://collect.example/blog",
    scope: "same_origin",
    max_pages: 4,
    max_depth: 2,
    exclude_patterns: ["^/tag/"],
    format: "markdown",
    dedupe: "canonical_url",
    max_chars_per_page: 30000,
  };

  const unpaidResponse = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  assert.equal(unpaidResponse.status, 402);

  const unpaidBody = (await unpaidResponse.json()) as Record<string, unknown>;
  const client = createTestPaymentClient();
  const paymentRequired = client.getPaymentRequiredResponse(
    (name) => unpaidResponse.headers.get(name) ?? undefined,
    unpaidBody,
  );
  const paymentPayload = await client.createPaymentPayload(paymentRequired);

  const paidResponse = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...client.encodePaymentSignatureHeader(paymentPayload),
    },
    body: JSON.stringify(requestBody),
  });
  assert.equal(paidResponse.status, 200);

  const paidBody = (await paidResponse.json()) as Record<string, unknown>;
  const data = paidBody.data as Record<string, unknown>;
  const results = data.results as Array<Record<string, unknown>>;
  const skipped = data.skipped as Array<Record<string, unknown>>;

  assert.equal(paidBody.network, "mainnet");
  assert.equal(paidBody.price_usd, "0.08");
  assert.equal(data.seed_url, "https://collect.example/blog");
  assert.equal(data.pages_requested, 4);
  assert.equal(data.pages_fetched, 3);
  assert.equal(results.length, 3);
  assert.deepEqual(
    results.map((result) => result.final_url),
    [
      "https://collect.example/blog",
      "https://collect.example/blog/post-1",
      "https://collect.example/blog/post-2",
    ],
  );
  assert.ok(skipped.some((entry) => entry.reason === "filtered_out"));
  assert.ok(skipped.some((entry) => entry.reason === "robots_disallowed"));
});

test("paid scrape route rejects private targets", async () => {
  const url = `${context.appBaseUrl}/scrape/extract`;
  const requestBody = {
    url: "http://127.0.0.1/private",
  };

  const unpaidResponse = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  assert.equal(unpaidResponse.status, 402);

  const unpaidBody = (await unpaidResponse.json()) as Record<string, unknown>;
  const client = createTestPaymentClient();
  const paymentRequired = client.getPaymentRequiredResponse(
    (name) => unpaidResponse.headers.get(name) ?? undefined,
    unpaidBody,
  );
  const paymentPayload = await client.createPaymentPayload(paymentRequired);

  const paidResponse = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...client.encodePaymentSignatureHeader(paymentPayload),
    },
    body: JSON.stringify(requestBody),
  });
  assert.equal(paidResponse.status, 400);

  const paidBody = (await paidResponse.json()) as Record<string, unknown>;
  assert.equal(paidBody.error, "invalid_request");
  assert.equal(paidBody.message, "Target URL host is not allowed");
});
