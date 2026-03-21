import { config } from "../config.js";
import type { PlatformCatalog, PublishedEndpoint } from "./catalog.js";
import { NEWS_CATEGORIES } from "../services/newsFeeds.js";
import {
  escapeHtml,
  layout,
  renderNav,
  renderFooter,
  renderEndpointDetail,
  renderCatalogueClientScript,
} from "./html.js";

const docsStyles = `
/* ── Docs layout ── */
.docs-wrapper {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 0;
  min-height: calc(100vh - 200px);
}

/* ── Sidebar ── */
.docs-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 32px 20px 32px 0;
  border-right: 1px solid var(--border);
}

.docs-sidebar-title {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  padding: 0 12px;
  margin-bottom: 8px;
}

.docs-sidebar-group + .docs-sidebar-group {
  margin-top: 24px;
}

.docs-sidebar-links {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.docs-sidebar-links a {
  display: block;
  padding: 6px 12px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.84rem;
  line-height: 1.4;
  transition: all 150ms var(--ease);
  text-decoration: none;
}

.docs-sidebar-links a:hover {
  background: rgba(255,255,255,0.04);
  color: var(--text);
}

.docs-sidebar-links a.active {
  background: rgba(125,226,209,0.08);
  color: var(--accent);
}

/* ── Main content ── */
.docs-content {
  padding: 32px 0 64px 40px;
  max-width: 820px;
  min-width: 0;
}

/* ── Section spacing ── */
.docs-section {
  margin-bottom: 48px;
  scroll-margin-top: 24px;
}

.docs-section:last-child {
  margin-bottom: 0;
}

.docs-section-label {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 8px;
}

.docs-section h2 {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin-bottom: 12px;
  line-height: 1.25;
}

.docs-section h3 {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-top: 28px;
  margin-bottom: 10px;
}

.docs-p {
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.75;
  margin-bottom: 16px;
  max-width: 680px;
}

.docs-p a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.docs-p a:hover {
  color: var(--accent-bright);
}

.docs-p code,
.docs-table code {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.82em;
}

/* ── Code blocks ── */
.docs-code {
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #080d14;
  overflow: hidden;
  margin-bottom: 16px;
}

.docs-code-header {
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.02);
}

.docs-code-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-tertiary);
  opacity: 0.5;
}

.docs-code-label {
  font-size: 0.72rem;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  margin-left: 4px;
}

.docs-code pre {
  margin: 0;
  padding: 16px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.7;
  color: #b0c4de;
  overflow-x: auto;
  white-space: pre;
  word-break: normal;
}

/* ── Steps / cards grid ── */
.docs-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.docs-step {
  padding: 20px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
}

.docs-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: var(--font-mono);
  background: rgba(125,226,209,0.1);
  border: 1px solid rgba(125,226,209,0.2);
  color: var(--accent);
  margin-bottom: 10px;
}

.docs-step h4 {
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 6px;
}

.docs-step p {
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.6;
}

/* ── Two-column layout ── */
.docs-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

/* ── Table ── */
.docs-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  font-size: 0.88rem;
}

.docs-table th {
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.docs-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(126,170,194,0.06);
  vertical-align: top;
}

.docs-table td:first-child {
  font-family: var(--font-mono);
  font-size: 0.84rem;
  color: var(--text);
  white-space: nowrap;
}

.docs-table td:last-child {
  color: var(--text-secondary);
}

.docs-table tr:last-child td {
  border-bottom: none;
}

/* ── Callout ── */
.docs-callout {
  padding: 16px 18px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  margin-bottom: 16px;
}

.docs-callout h4 {
  font-family: var(--font-display);
  font-size: 0.95rem;
  margin-bottom: 6px;
}

.docs-callout p {
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.65;
}

/* ── Endpoint section within docs ── */
.docs-endpoints .endpoints-grid {
  gap: 12px;
}

.docs-divider {
  height: 1px;
  background: var(--border);
  margin: 48px 0;
}

/* ── Discovery cards ── */
.docs-discovery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.docs-discovery-card {
  padding: 18px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
}

.docs-discovery-card code {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.84rem;
  color: var(--accent);
  margin-bottom: 8px;
}

.docs-discovery-card p {
  color: var(--text-secondary);
  font-size: 0.84rem;
  line-height: 1.55;
}

/* ── Responsive ── */
@media (max-width: 860px) {
  .docs-wrapper {
    grid-template-columns: 1fr;
  }
  .docs-sidebar {
    position: static;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 20px 0 16px;
    overflow-y: visible;
  }
  .docs-sidebar-links {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px;
  }
  .docs-sidebar-links a {
    font-size: 0.8rem;
    padding: 5px 10px;
    white-space: nowrap;
  }
  .docs-content {
    padding: 24px 0 48px;
  }
  .docs-cols {
    grid-template-columns: 1fr;
  }
  .docs-steps {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .docs-section h2 {
    font-size: 1.3rem;
  }
  .docs-discovery-grid {
    grid-template-columns: 1fr;
  }
}
`;

function renderCodeBlock(label: string, code: string) {
  return `
    <div class="docs-code">
      <div class="docs-code-header">
        <div class="docs-code-dot"></div>
        <div class="docs-code-dot"></div>
        <div class="docs-code-dot"></div>
        <span class="docs-code-label">${escapeHtml(label)}</span>
      </div>
      <pre>${escapeHtml(code)}</pre>
    </div>
  `;
}

function renderParamTable(items: Array<{ name: string; detail: string }>) {
  return `
    <table class="docs-table">
      <thead><tr><th>Parameter</th><th>Description</th></tr></thead>
      <tbody>
        ${items.map((item) => `<tr><td><code>${escapeHtml(item.name)}</code></td><td>${escapeHtml(item.detail)}</td></tr>`).join("")}
      </tbody>
    </table>
  `;
}

function renderEndpointSection(
  title: string,
  description: string,
  endpoints: PublishedEndpoint[],
) {
  if (endpoints.length === 0) return "";
  return `
    <h3>${escapeHtml(title)}</h3>
    <p class="docs-p">${escapeHtml(description)}</p>
    <div class="docs-endpoints">
      <div class="endpoints-grid">
        ${endpoints.map((ep) => renderEndpointDetail(ep, config.publicBaseUrl)).join("")}
      </div>
    </div>
  `;
}

export function renderDocsPage(catalog: PlatformCatalog) {
  const endpoints = catalog.publishedEndpoints;
  const weatherEndpoints = endpoints.filter((ep) => ep.serviceId === "weather");
  const newsEndpoints = endpoints.filter((ep) => ep.serviceId === "news");
  const cryptoEndpoints = endpoints.filter((ep) => ep.serviceId === "crypto");
  const chatEndpoints = endpoints.filter((ep) => ep.serviceId === "chat");
  const imageEndpoints = endpoints.filter((ep) => ep.serviceId === "image");
  const scrapeEndpoints = endpoints.filter((ep) => ep.serviceId === "scrape");
  const collectEndpoints = endpoints.filter((ep) => ep.serviceId === "collect");

  const unpaidExample = `{
  "error": "payment_required",
  "message": "This endpoint requires x402 payment",
  "price_usd": "0.01",
  "assets": [
    { "asset": "USDC", "price": "0.01" }
  ],
  "network": "mainnet",
  "pay_to": "${config.networks.mainnet.payToAddress}",
  "facilitator_url": "${config.networks.mainnet.facilitatorUrl}",
  "route": "/weather/current"
}`;

  const successExample = `{
  "network": "mainnet",
  "paid": true,
  "price_usd": "0.01",
  "assets": ["USDC"],
  "data": { ... }
}`;

  const mcpCloneExample = `git clone https://github.com/jamesbachini/x402-mcp-stellar
cd x402-mcp-stellar
cp .env.example .env
npm install
npm run dev`;

  const mcpCodexExample = `codex mcp add x402-stellar -- \\
  npm --silent --prefix /path/to/x402-mcp-stellar run dev`;

  const mcpEnvExample = `STELLAR_SECRET_KEY=S...
STELLAR_NETWORK=stellar:testnet

# For mainnet:
STELLAR_NETWORK=stellar:pubnet
STELLAR_RPC_URL=https://rpc.lightsail.network/
X402_FACILITATOR_URL=https://channels.openzeppelin.com/x402
X402_FACILITATOR_API_KEY=<your-openzeppelin-api-key>`;

  const sidebarLinks = [
    { href: "#overview", label: "Overview" },
    { href: "#quickstart", label: "Quickstart" },
    { href: "#payment-flow", label: "Payment Flow" },
    { href: "#mcp", label: "MCP Integration" },
    { href: "#discovery", label: "Discovery" },
    { href: "#response-format", label: "Response Format" },
  ];

  if (weatherEndpoints.length > 0)
    sidebarLinks.push({ href: "#weather", label: "Weather API" });
  if (newsEndpoints.length > 0)
    sidebarLinks.push({ href: "#news", label: "News API" });
  if (cryptoEndpoints.length > 0)
    sidebarLinks.push({ href: "#crypto", label: "Crypto API" });
  if (chatEndpoints.length > 0)
    sidebarLinks.push({ href: "#chat", label: "Chat API" });
  if (imageEndpoints.length > 0)
    sidebarLinks.push({ href: "#image", label: "Image API" });
  if (scrapeEndpoints.length > 0)
    sidebarLinks.push({ href: "#scrape", label: "Scrape API" });
  if (collectEndpoints.length > 0)
    sidebarLinks.push({ href: "#collect", label: "Collect API" });

  return layout({
    title: "Documentation | xlm402.com",
    description:
      "API documentation for xlm402.com x402 services on Stellar.",
    body: `
      <div class="container">
        ${renderNav("docs")}

        <div class="docs-wrapper">
          <aside class="docs-sidebar">
            <div class="docs-sidebar-group">
              <div class="docs-sidebar-title">Guide</div>
              <div class="docs-sidebar-links">
                ${sidebarLinks.map((l) => `<a href="${l.href}">${escapeHtml(l.label)}</a>`).join("")}
              </div>
            </div>
          </aside>

          <main class="docs-content">

            <!-- Overview -->
            <section class="docs-section" id="overview">
              <div class="docs-section-label">Overview</div>
              <h2>xlm402 API Documentation</h2>
              <p class="docs-p">
                xlm402 provides paid API services over the
                <a href="https://www.x402.org/" target="_blank" rel="noopener noreferrer">x402 payment protocol</a>
                on the Stellar network. Weather, crypto, news, scrape, and collect routes on both networks expose USDC and XLM,
                with no API keys or subscriptions required.
              </p>
              <div class="docs-steps">
                <div class="docs-step">
                  <h4>Weather</h4>
                  <p>Current conditions, forecasts, archives, and historical summaries. Available on mainnet and testnet.</p>
                </div>
                <div class="docs-step">
                  <h4>Crypto</h4>
                  <p>Production-grade quotes and candles from official Binance, Kraken, and Coinbase Exchange APIs.</p>
                </div>
                <div class="docs-step">
                  <h4>News</h4>
                  <p>Aggregated feeds across ${NEWS_CATEGORIES.length} categories including ${escapeHtml(NEWS_CATEGORIES.slice(0, 4).join(", "))}, and more.</p>
                </div>
                <div class="docs-step">
                  <h4>Chat</h4>
                  <p>GPT-powered text generation. Mainnet only, requires <code>OPENAI_API_KEY</code>.</p>
                </div>
                <div class="docs-step">
                  <h4>Image</h4>
                  <p>Prompt-to-image generation with base64 output. Mainnet only, requires <code>OPENAI_API_KEY</code>.</p>
                </div>
                <div class="docs-step">
                  <h4>Scrape</h4>
                  <p>Public-page extraction with robots-aware fetching, metadata, text, markdown, links, and JSON-LD.</p>
                </div>
                <div class="docs-step">
                  <h4>Collect</h4>
                  <p>Bounded same-origin collection from a seed URL with regex filtering and dedupe controls.</p>
                </div>
              </div>
            </section>

            <!-- Quickstart -->
            <section class="docs-section" id="quickstart">
              <div class="docs-section-label">Getting Started</div>
              <h2>Quickstart</h2>
              <p class="docs-p">
                Call any endpoint with a standard HTTP request. The server responds with
                <code>402 Payment Required</code> and payment details. Use a Freighter wallet
                or x402 client to sign and retry.
              </p>
              <div class="docs-cols">
                <div>
                  ${renderCodeBlock("Run the server locally", `git clone https://github.com/jamesbachini/xlm402
cd xlm402
cp .env.example .env
npm install
npm run dev`)}
                </div>
                <div>
                  ${renderCodeBlock("Test the API", `# Check service health
curl ${config.publicBaseUrl}/health

# Browse the catalogue
curl ${config.publicBaseUrl}/api/catalog

# Try a paid endpoint (returns 402)
curl ${config.publicBaseUrl}/weather/current?latitude=51.5&longitude=-0.1`)}
                </div>
              </div>
              <div class="docs-callout">
                <h4>Configuration</h4>
                <p>
                  Public settings live in <code>config/app.json</code>. Secrets (<code>OPENAI_API_KEY</code>,
                  wallet keys) go in <code>.env</code>. Chat uses <code>${escapeHtml(config.openai.chatModel)}</code>
                  and images use <code>${escapeHtml(config.openai.imageModel)}</code>.
                </p>
              </div>
            </section>

            <!-- Payment Flow -->
            <section class="docs-section" id="payment-flow">
              <div class="docs-section-label">Payments</div>
              <h2>x402 Payment Flow</h2>
              <p class="docs-p">
                The x402 protocol turns HTTP <code>402 Payment Required</code> into a native payment flow.
                No API keys, no subscriptions &mdash; just pay per call.
              </p>
              <div class="docs-steps">
                <div class="docs-step">
                  <div class="docs-step-num">1</div>
                  <h4>Request</h4>
                  <p>Make a standard HTTP request to any paid route.</p>
                </div>
                <div class="docs-step">
                  <div class="docs-step-num">2</div>
                  <h4>402 Response</h4>
                  <p>Server returns payment requirements: price, network, asset, pay-to address, and facilitator URL.</p>
                </div>
                <div class="docs-step">
                  <div class="docs-step-num">3</div>
                  <h4>Sign &amp; Retry</h4>
                  <p>Your x402 client signs a Stellar payment and retries with payment headers attached.</p>
                </div>
                <div class="docs-step">
                  <div class="docs-step-num">4</div>
                  <h4>Response</h4>
                  <p>The facilitator verifies payment and the server returns the API data.</p>
                </div>
              </div>
              <div class="docs-cols">
                <div>${renderCodeBlock("402 response body", unpaidExample)}</div>
                <div>${renderCodeBlock("Successful response", successExample)}</div>
              </div>
            </section>

            <!-- MCP -->
            <section class="docs-section" id="mcp">
              <div class="docs-section-label">Integration</div>
              <h2>MCP Integration</h2>
              <p class="docs-p">
                To let AI agents (Codex, Claude, etc.) pay for these routes automatically, use the
                <a href="https://github.com/jamesbachini/x402-mcp-stellar" target="_blank" rel="noopener noreferrer">x402-mcp-stellar</a>
                MCP server. It runs over stdio and exposes wallet info, facilitator checks, and a paid fetch tool.
              </p>

              <h3>Setup</h3>
              <div class="docs-cols">
                <div>${renderCodeBlock("Clone and run the MCP server", mcpCloneExample)}</div>
                <div>${renderCodeBlock(".env configuration", mcpEnvExample)}</div>
              </div>

              <h3>Register with Codex</h3>
              ${renderCodeBlock("Add MCP to Codex", mcpCodexExample)}

              <div class="docs-callout">
                <h4>Prerequisites</h4>
                <p>
                  Node.js 20+, a funded Stellar wallet, this resource server running, and a reachable
                  facilitator. Start with testnet. For mainnet, use the OpenZeppelin relayer with an API key.
                </p>
              </div>
            </section>

            <!-- Discovery -->
            <section class="docs-section" id="discovery">
              <div class="docs-section-label">Discovery</div>
              <h2>Discovery Endpoints</h2>
              <p class="docs-p">
                Every service publishes structured metadata so AI agents and automation tools can
                discover, evaluate, and purchase API access programmatically.
              </p>
              <div class="docs-discovery-grid">
                <div class="docs-discovery-card">
                  <code>/api/catalog</code>
                  <p>Service definitions, published routes, prices, response types, and network metadata.</p>
                </div>
                <div class="docs-discovery-card">
                  <code>/.well-known/x402</code>
                  <p>x402 manifest with route descriptions and full payment options for discovery clients.</p>
                </div>
                <div class="docs-discovery-card">
                  <code>/supported</code>
                  <p>Facilitator capabilities for mainnet and testnet.</p>
                </div>
                <div class="docs-discovery-card">
                  <code>/health</code>
                  <p>Platform status, route count, networks, and AI enablement.</p>
                </div>
              </div>
            </section>

            <!-- Response Format -->
            <section class="docs-section" id="response-format">
              <div class="docs-section-label">Formats</div>
              <h2>Response Format</h2>
              <p class="docs-p">
                All successful paid responses share a common JSON envelope.
              </p>
              ${renderParamTable([
                { name: "network", detail: "Network label: mainnet or testnet." },
                { name: "paid", detail: "Boolean, true on successful paid responses." },
                { name: "price_usd", detail: "USD price string for the route." },
                { name: "assets", detail: "Accepted settlement assets for that route and network." },
                { name: "data", detail: "Endpoint-specific payload." },
              ])}
              <div class="docs-callout">
                <h4>Error responses</h4>
                <p>
                  Errors return <code>{ "error": "invalid_request", "message": "..." }</code>.
                  Common causes: invalid coordinates, bad date ranges, or malformed body parameters.
                </p>
              </div>
            </section>

            <div class="docs-divider"></div>

            <!-- Weather Reference -->
            ${weatherEndpoints.length > 0 ? `
            <section class="docs-section" id="weather">
              <div class="docs-section-label">API Reference</div>
              <h2>Weather API</h2>
              <p class="docs-p">
                Weather is available on both mainnet and testnet. Forecast and archive routes accept
                field selection through comma-separated query parameters.
              </p>
              ${renderParamTable([
                { name: "latitude", detail: "Required. Number between -90 and 90." },
                { name: "longitude", detail: "Required. Number between -180 and 180." },
                { name: "timezone", detail: "Optional. IANA timezone string or auto." },
                { name: "forecast_days", detail: "Forecast only. Integer 1-16." },
                { name: "start_date / end_date", detail: "Archive only. YYYY-MM-DD format, max 366-day span." },
              ])}
              ${renderEndpointSection("Weather Endpoints", "Current conditions, forecasts, archives, and historical summaries.", weatherEndpoints)}
            </section>
            ` : ""}

            <!-- News Reference -->
            ${newsEndpoints.length > 0 ? `
            <section class="docs-section" id="news">
              <div class="docs-section-label">API Reference</div>
              <h2>News API</h2>
              <p class="docs-p">
                News endpoints aggregate multiple RSS and Atom feeds into a normalized response.
                Available categories: ${escapeHtml(NEWS_CATEGORIES.join(", "))}.
              </p>
              ${renderParamTable([
                { name: "category", detail: "Path parameter. One of: " + NEWS_CATEGORIES.join(", ") + "." },
                { name: "limit", detail: "Optional. Integer 1-30, defaults to 12." },
                { name: "max_per_feed", detail: "Optional. Integer 1-10, defaults to 6." },
              ])}
              ${renderEndpointSection("News Endpoints", "Category-based story aggregation with standardized story objects.", newsEndpoints)}
            </section>
            ` : ""}

            <!-- Crypto Reference -->
            ${cryptoEndpoints.length > 0 ? `
            <section class="docs-section" id="crypto">
              <div class="docs-section-label">API Reference</div>
              <h2>Crypto API</h2>
              <p class="docs-p">
                Crypto market data is available on both mainnet and testnet with a normalized
                request contract. Use <code>source=best</code> to follow the configured fallback order
                across Binance, Kraken, and Coinbase Exchange.
              </p>
              ${renderParamTable([
                { name: "symbol", detail: "Required. BASE-USD format, for example BTC-USD." },
                { name: "source", detail: "Optional. best, binance, kraken, or coinbase. Defaults to best." },
                { name: "interval", detail: "Candles only. One of: 1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M." },
                { name: "limit", detail: "Candles only. Integer 1-500. Coinbase is capped at 300." },
                { name: "start / end", detail: "Candles only. Optional ISO-8601 timestamps with start < end." },
              ])}
              ${renderEndpointSection("Crypto Endpoints", "Request-time quotes and candles with normalized JSON output and source fallback.", cryptoEndpoints)}
            </section>
            ` : ""}

            <!-- Chat Reference -->
            ${chatEndpoints.length > 0 ? `
            <section class="docs-section" id="chat">
              <div class="docs-section-label">API Reference</div>
              <h2>Chat API</h2>
              <p class="docs-p">
                Mainnet only. Returns a wrapped GPT Responses API payload with
                <code>id</code>, <code>model</code>, <code>output_text</code>, <code>status</code>, and <code>usage</code>.
              </p>
              ${renderParamTable([
                { name: "prompt", detail: "Required. String up to 32,000 characters." },
                { name: "system", detail: "Optional. Instruction string up to 12,000 characters." },
                { name: "max_output_tokens", detail: "Optional. Integer 64-4096, defaults to 800." },
                { name: "reasoning_effort", detail: "Optional. One of: none, low, medium, high, xhigh." },
                { name: "metadata", detail: "Optional. Object of up to 16 string key/value pairs." },
              ])}
              ${renderEndpointSection("Chat Endpoint", "Paid text generation against the configured GPT model.", chatEndpoints)}
            </section>
            ` : ""}

            <!-- Image Reference -->
            ${imageEndpoints.length > 0 ? `
            <section class="docs-section" id="image">
              <div class="docs-section-label">API Reference</div>
              <h2>Image API</h2>
              <p class="docs-p">
                Mainnet only. Returns base64-encoded image data. Use <code>png</code> or <code>webp</code>
                output format for transparent backgrounds.
              </p>
              ${renderParamTable([
                { name: "prompt", detail: "Required. Prompt string up to 32,000 characters." },
                { name: "size", detail: "Optional. auto, 1024x1024, 1536x1024, or 1024x1536." },
                { name: "quality", detail: "Optional. auto, low, medium, or high." },
                { name: "background", detail: "Optional. auto, opaque, or transparent." },
                { name: "output_format", detail: "Optional. jpeg, png, or webp." },
              ])}
              ${renderEndpointSection("Image Endpoint", "Prompt-to-image generation with base64 output.", imageEndpoints)}
            </section>
            ` : ""}

            <!-- Scrape Reference -->
            ${scrapeEndpoints.length > 0 ? `
            <section class="docs-section" id="scrape">
              <div class="docs-section-label">API Reference</div>
              <h2>Scrape API</h2>
              <p class="docs-p">
                Public HTML extraction on mainnet and testnet. Requests must target public <code>http</code> or <code>https</code>
                pages and the service respects <code>robots.txt</code>.
              </p>
              ${renderParamTable([
                { name: "url", detail: "Required. Absolute public http or https URL." },
                { name: "format", detail: "Optional. text or markdown. Defaults to markdown." },
                { name: "include_links", detail: "Optional. Boolean, defaults to true." },
                { name: "include_metadata", detail: "Optional. Boolean, defaults to true." },
                { name: "include_json_ld", detail: "Optional. Boolean, defaults to true." },
                { name: "max_chars", detail: "Optional. Integer 1000-100000, defaults to 50000." },
              ])}
              ${renderEndpointSection("Scrape Endpoint", "Single-URL extraction for public pages.", scrapeEndpoints)}
            </section>
            ` : ""}

            <!-- Collect Reference -->
            ${collectEndpoints.length > 0 ? `
            <section class="docs-section" id="collect">
              <div class="docs-section-label">API Reference</div>
              <h2>Collect API</h2>
              <p class="docs-p">
                Synchronous same-origin collection for small public datasets. Use include and exclude regex filters
                to bound the crawl and choose canonical or final-URL dedupe.
              </p>
              ${renderParamTable([
                { name: "seed_url", detail: "Required. Absolute public http or https URL." },
                { name: "scope", detail: "Optional. same_origin only in v1." },
                { name: "max_pages", detail: "Optional. Integer 1-10, defaults to 10." },
                { name: "max_depth", detail: "Optional. Integer 0-2, defaults to 2." },
                { name: "include_patterns / exclude_patterns", detail: "Optional. Arrays of regex strings matched against path and query." },
                { name: "dedupe", detail: "Optional. canonical_url or final_url. Defaults to canonical_url." },
                { name: "max_chars_per_page", detail: "Optional. Integer 1000-50000, defaults to 30000." },
              ])}
              ${renderEndpointSection("Collect Endpoint", "Small bounded collection runs from one seed URL.", collectEndpoints)}
            </section>
            ` : ""}

          </main>
        </div>

        ${renderFooter()}
      </div>
      <style>${docsStyles}</style>
      ${renderCatalogueClientScript()}
      <script>
      (function() {
        var links = document.querySelectorAll('.docs-sidebar-links a');
        var sections = [];
        links.forEach(function(a) {
          var id = a.getAttribute('href');
          if (id && id.charAt(0) === '#') {
            var el = document.getElementById(id.slice(1));
            if (el) sections.push({ el: el, link: a });
          }
        });
        function update() {
          var scrollY = window.scrollY + 60;
          var active = null;
          for (var i = sections.length - 1; i >= 0; i--) {
            if (sections[i].el.offsetTop <= scrollY) {
              active = sections[i];
              break;
            }
          }
          links.forEach(function(a) { a.classList.remove('active'); });
          if (active) active.link.classList.add('active');
        }
        window.addEventListener('scroll', update, { passive: true });
        update();
      })();
      </script>
    `,
  });
}
