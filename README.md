# xlm402

Pay-per-request APIs on Stellar using `x402`.

`xlm402` is an Express + TypeScript service platform that sells weather data, news aggregation, text inference, and image generation over standard HTTP routes. It exposes public discovery endpoints, enforces payment with `x402`, and supports both Stellar mainnet and testnet in a single deployment.

The repo is designed to work as both:

- a production-ready paid API server
- a reference implementation for `x402` on Stellar
- a browsable service catalogue with human-facing pages at `/` and `/docs`

## What It Includes

### Public routes

- `GET /`
- `GET /docs`
- `GET /health`
- `GET /supported`
- `GET /api/catalog`
- `GET /.well-known/x402`
- `GET /vendor/freighter-x402.js`

### Paid weather routes

- `GET /weather/current`
- `GET /weather/forecast`
- `GET /weather/archive`
- `GET /weather/history-summary`
- `GET /testnet/weather/current`
- `GET /testnet/weather/forecast`
- `GET /testnet/weather/archive`
- `GET /testnet/weather/history-summary`

### Paid news routes

- `GET /news/:category`
- `GET /testnet/news/:category`

Supported categories:
`tech`, `ai`, `global`, `economics`, `blockchain`, `politics`, `sports`, `business`, `science`, `entertainment`, `gaming`, `security`, `health`

### Paid extraction routes

- `POST /scrape/extract`
- `POST /testnet/scrape/extract`
- `POST /collect/run`
- `POST /testnet/collect/run`

Extraction services are limited to ethical public-web collection:

- public `http` and `https` pages only
- robots-aware fetching
- no login flows, CAPTCHAs, or anti-bot bypass behavior
- bounded same-origin collection for `/collect/run`

### Paid AI routes

- `POST /chat/respond`
- `POST /image/generate`

AI routes are only published when `OPENAI_API_KEY` is configured.

## Highlights

- One deployment can serve both `stellar:pubnet` and `stellar:testnet`
- Mainnet and testnet weather/news route families share the same request contracts
- Payment metadata is published at `/.well-known/x402`
- The public site, docs page, and middleware all use the same internal service catalogue
- Weather uses Open-Meteo upstreams with response caching
- News is aggregated from multiple RSS and Atom feeds per category
- Chat and image endpoints are backed by OpenAI models configured in `config/app.json`
- A browser helper bundle is included for Freighter-based x402 flows

## Service Matrix

| Service | Routes | Networks | Default price |
| --- | --- | --- | --- |
| Weather | `/weather/*`, `/testnet/weather/*` | Mainnet + testnet | `$0.01` |
| News | `/news/:category`, `/testnet/news/:category` | Mainnet + testnet | `$0.01` |
| Chat | `/chat/respond` | Mainnet only | `$0.05` |
| Image | `/image/generate` | Mainnet only | `$0.10` |
| Scrape | `/scrape/extract`, `/testnet/scrape/extract` | Mainnet + testnet | `$0.03` |
| Collect | `/collect/run`, `/testnet/collect/run` | Mainnet + testnet | `$0.08` |

Prices come from [`config/app.json`](/mnt/c/code/xlm402/config/app.json) and can be overridden with environment variables.

## How Payment Works

Unpaid requests to paid routes return `402 Payment Required` plus machine-readable payment requirements. Clients can then retry with an `x402` payment header and receive the normal JSON payload after verification and settlement.

Typical flow:

1. Call a paid route without payment.
2. Read the `402` response and `payment-required` header.
3. Create a payment payload with an `x402` client.
4. Retry with `payment-signature` or `x-payment`.
5. Receive the paid response and settlement headers.

With the current implementation:

- weather and news routes advertise `USDC` and `XLM` when the network's `*_XLM_CONTRACT_ADDRESS` is configured
- scrape and collect routes advertise `USDC` and `XLM` when the network's `*_XLM_CONTRACT_ADDRESS` is configured
- chat and image routes are mainnet-only

## Quick Start

### Requirements

- Node.js `20+`
- npm
- facilitator credentials if your chosen facilitator requires authentication
- `OPENAI_API_KEY` if you want `/chat/respond` and `/image/generate`

### Local development

```bash
git clone https://github.com/jamesbachini/xlm402
cd xlm402
npm install
cp .env.example .env
```

Then:

1. Edit `config/app.json` for public runtime settings, pricing, URLs, and network config.
2. Add secrets and overrides in `.env`.
3. Start the dev server:

```bash
npm run dev
```

Default local URL:

```text
http://localhost:3000
```

## Configuration

### Primary config file

Most non-secret settings live in [`config/app.json`](/mnt/c/code/xlm402/config/app.json).

It controls:

- server port and public base URL
- platform name
- request timeout and cache TTLs
- Stellar RPC URLs
- Open-Meteo upstream URLs
- per-service prices
- scrape safety and cache controls
- default OpenAI model names
- mainnet and testnet pay-to addresses
- facilitator URLs
- optional XLM contract addresses

Current defaults in this repo:

```json
{
  "port": 3000,
  "platformName": "xlm402 services",
  "publicBaseUrl": "https://xlm402.com",
  "prices": {
    "weather": "0.01",
    "news": "0.01",
    "chat": "0.05",
    "image": "0.10"
  },
  "openai": {
    "chatModel": "gpt-5.4",
    "imageModel": "gpt-image-1.5"
  }
}
```

### Environment variables

Use `.env` for secrets and optional overrides. The minimal example file is [`.env.example`](/mnt/c/code/xlm402/.env.example).

| Variable | Purpose |
| --- | --- |
| `APP_CONFIG_PATH` | Path to an alternate JSON config file |
| `PORT` | Override server port |
| `NODE_ENV` | Runtime mode |
| `PLATFORM_NAME` | Override platform display name |
| `PUBLIC_BASE_URL` | Override public base URL used in docs and examples |
| `MAINNET_SOROBAN_RPC_URL` | Mainnet Soroban RPC URL |
| `TESTNET_SOROBAN_RPC_URL` | Testnet Soroban RPC URL |
| `REQUEST_TIMEOUT_MS` | Upstream request timeout |
| `CACHE_TTL_SECONDS` | Shared cache TTL |
| `XLM_PRICE_TTL_SECONDS` | XLM price cache TTL |
| `OPEN_METEO_BASE_URL` | Forecast/current upstream base URL |
| `OPEN_METEO_ARCHIVE_BASE_URL` | Archive upstream base URL |
| `LOG_PAYMENTS` | Enable request logging |
| `WEATHER_PRICE_USDC` | Weather route price override |
| `NEWS_PRICE_USDC` | News route price override |
| `CHAT_PRICE_USDC` | Chat route price override |
| `IMAGE_PRICE_USDC` | Image route price override |
| `SCRAPE_PRICE_USDC` | Scrape route price override |
| `COLLECT_PRICE_USDC` | Collect route price override |
| `MAINNET_PAY_TO_ADDRESS` | Mainnet payment recipient |
| `MAINNET_FACILITATOR_URL` | Mainnet facilitator URL |
| `MAINNET_FACILITATOR_API_KEY` | Mainnet facilitator auth token |
| `MAINNET_XLM_CONTRACT_ADDRESS` | Optional mainnet XLM contract override |
| `TESTNET_PAY_TO_ADDRESS` | Testnet payment recipient |
| `TESTNET_FACILITATOR_URL` | Testnet facilitator URL |
| `TESTNET_FACILITATOR_API_KEY` | Testnet facilitator auth token |
| `TESTNET_XLM_CONTRACT_ADDRESS` | Optional testnet XLM contract override |
| `OPENAI_API_KEY` | Enables chat and image services |
| `OPENAI_ORG_ID` | Optional OpenAI organization |
| `OPENAI_PROJECT_ID` | Optional OpenAI project |
| `OPENAI_CHAT_MODEL` | Override chat model |
| `OPENAI_IMAGE_MODEL` | Override image model |

Example:

```env
APP_CONFIG_PATH=./config/app.json
PORT=3000
NODE_ENV=development

MAINNET_FACILITATOR_API_KEY=
TESTNET_FACILITATOR_API_KEY=

OPENAI_API_KEY=
OPENAI_ORG_ID=
OPENAI_PROJECT_ID=
```

## API Reference

### Public endpoints

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/` | Marketing/catalogue landing page |
| `GET` | `/docs` | Human-readable API docs page |
| `GET` | `/health` | Service health and route summary |
| `GET` | `/supported` | Facilitator capabilities for both networks |
| `GET` | `/api/catalog` | Machine-readable catalogue of live services |
| `GET` | `/.well-known/x402` | Full payment metadata per route |
| `GET` | `/vendor/freighter-x402.js` | Browser bundle for Freighter-backed x402 payments |

### Weather endpoints

All weather endpoints require:

- `latitude`
- `longitude`

Optional or route-specific params:

- `timezone` default: `auto`
- `daily` comma-separated field list
- `hourly` comma-separated field list
- `forecast_days` for forecast requests, `1..16`
- `start_date` and `end_date` in `YYYY-MM-DD` for archive routes, max range `366` days

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/weather/current` | Current conditions |
| `GET` | `/weather/forecast` | Forecast data with daily/hourly field selection |
| `GET` | `/weather/archive` | Historical archive range |
| `GET` | `/weather/history-summary` | Compact summary over an archive range |
| `GET` | `/testnet/weather/current` | Testnet current conditions |
| `GET` | `/testnet/weather/forecast` | Testnet forecast |
| `GET` | `/testnet/weather/archive` | Testnet archive |
| `GET` | `/testnet/weather/history-summary` | Testnet summary |

### News endpoints

Query params:

- `limit` integer `1..30`, default `12`
- `max_per_feed` integer `1..10`, default `6`

Routes:

- `GET /news/:category`
- `GET /testnet/news/:category`

Categories:

| Category | Description |
| --- | --- |
| `tech` | Technology |
| `ai` | AI |
| `global` | World news |
| `economics` | Economy and markets |
| `blockchain` | Blockchain and crypto |
| `politics` | Politics |
| `sports` | Sports |
| `business` | Business |
| `science` | Science |
| `entertainment` | Entertainment |
| `gaming` | Gaming |
| `security` | Cybersecurity |
| `health` | Health and medicine |

### Chat endpoint

Route:

- `POST /chat/respond`

Body:

```json
{
  "prompt": "Write a short product pitch for a paid weather API on Stellar.",
  "system": "Be concise and commercial.",
  "max_output_tokens": 400,
  "reasoning_effort": "medium",
  "metadata": {
    "team": "growth"
  }
}
```

Rules:

- `prompt` is required
- `system` is optional
- `max_output_tokens` must be `64..4096`
- `reasoning_effort` must be one of `none`, `low`, `medium`, `high`, `xhigh`
- legacy `minimal` is normalized to `low`
- `metadata` is optional and trimmed to non-empty string pairs

### Image endpoint

Route:

- `POST /image/generate`

Body:

```json
{
  "prompt": "A premium weather dashboard hero image, editorial 3d illustration",
  "size": "1536x1024",
  "quality": "high",
  "background": "opaque",
  "output_format": "jpeg",
  "moderation": "auto"
}
```

Supported values:

- `size`: `auto`, `1024x1024`, `1536x1024`, `1024x1536`
- `quality`: `auto`, `low`, `medium`, `high`
- `background`: `auto`, `opaque`, `transparent`
- `output_format`: `jpeg`, `png`, `webp`
- `moderation`: `auto`, `low`

## Example Requests

### Discover the live catalogue

```bash
curl http://localhost:3000/api/catalog
```

### Inspect x402 payment requirements

```bash
curl "http://localhost:3000/weather/forecast?latitude=51.5072&longitude=-0.1276&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto"
```

Expected outcome: `402 Payment Required`

Typical response body:

```json
{
  "error": "payment_required",
  "message": "This endpoint requires x402 payment",
  "price_usd": "0.01",
  "assets": [
    {
      "asset": "USDC",
      "price": "0.01"
    }
  ],
  "network": "mainnet",
  "pay_to": "G...",
  "facilitator_url": "https://channels.openzeppelin.com/x402",
  "route": "/weather/forecast"
}
```

### Pay and retry from Node.js

```ts
import { x402Client, x402HTTPClient } from "@x402/core/client";

const client = new x402HTTPClient(new x402Client());
const url =
  "http://localhost:3000/weather/current?latitude=51.5072&longitude=-0.1276&timezone=auto";

const unpaidResponse = await fetch(url);
const unpaidBody = await unpaidResponse.json();

const paymentRequired = client.getPaymentRequiredResponse(
  (name) => unpaidResponse.headers.get(name) ?? undefined,
  unpaidBody,
);

const paymentPayload = await client.createPaymentPayload(paymentRequired);

const paidResponse = await fetch(url, {
  headers: client.encodePaymentSignatureHeader(paymentPayload),
});

console.log(await paidResponse.json());
```

### Chat request

```bash
curl -X POST "http://localhost:3000/chat/respond" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a short product pitch for a paid weather API on Stellar.",
    "system": "Be commercial and concise.",
    "reasoning_effort": "medium"
  }'
```

### Image request

```bash
curl -X POST "http://localhost:3000/image/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cinematic satellite view of a storm front above the Atlantic",
    "size": "1536x1024",
    "quality": "high",
    "output_format": "jpeg"
  }'
```

## Response Shape

Paid route responses are wrapped like this:

```json
{
  "network": "mainnet",
  "paid": true,
  "price_usd": "0.01",
  "assets": ["USDC"],
  "data": {}
}
```

That makes it easy for client code to consistently inspect:

- which network was used
- whether the request was paid
- which asset set the route accepted
- the raw service payload in `data`

## Browser / Freighter Integration

The app ships a browser helper at:

```text
/vendor/freighter-x402.js
```

It exposes `window.X402Freighter.connectAndCreateHttpClient(...)` for browser-side flows using the Freighter wallet. The helper checks wallet connectivity, validates the selected Stellar network, and returns an `x402HTTPClient` you can use to retry paid requests from the browser.

Source:

- [`src/browser/freighter-x402.ts`](/mnt/c/code/xlm402/src/browser/freighter-x402.ts)

## Development

Scripts from [`package.json`](/mnt/c/code/xlm402/package.json):

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm test
```

Project layout:

- [`src/app.ts`](/mnt/c/code/xlm402/src/app.ts): Express app wiring
- [`src/config.ts`](/mnt/c/code/xlm402/src/config.ts): config loading and env overrides
- [`src/middleware/x402.ts`](/mnt/c/code/xlm402/src/middleware/x402.ts): x402 registration and route payment rules
- [`src/routes/`](/mnt/c/code/xlm402/src/routes): API endpoints
- [`src/platform/`](/mnt/c/code/xlm402/src/platform): HTML landing page, docs page, and catalogue rendering
- [`test/`](/mnt/c/code/xlm402/test): Node test suite covering payment flow and request validation

## Docker

The repo includes a [`Dockerfile`](/mnt/c/code/xlm402/Dockerfile) based on `node:22-alpine`.

Build:

```bash
docker build -t xlm402 .
```

If you use the container in production, make sure the runtime image has access to:

- `config/app.json`
- `.env` or equivalent environment variables
- static assets under `public/`

## Deployment Notes

For production deployment you will typically want to:

1. build with `npm run build`
2. run `dist/index.js` behind a process manager or container platform
3. set `PUBLIC_BASE_URL` to the public HTTPS origin
4. configure mainnet and testnet facilitator credentials if required
5. add `OPENAI_API_KEY` only if you want AI routes exposed

## Update Notes

```bash
git pull origin main; npm run build; pm2 restart xlm402

The hosted project URL configured in this repo is:

- https://xlm402.com

GitHub repository:

- https://github.com/jamesbachini/xlm402

## License

MIT
