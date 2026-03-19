# xlm402 Services Platform

Commercial x402 service platform for Stellar payments. The app now serves:

- Mainnet weather routes at `/weather/*`
- Testnet weather routes at `/testnet/weather/*`
- Mainnet news routes at `/news/*`
- Testnet news routes at `/testnet/news/*`
- Mainnet AI inference at `/chat/respond`
- Mainnet image generation at `/image/generate`
- Human-facing pages at `/` and `/docs`

One deployment can now expose both Stellar networks at once. Testnet includes the data products so you can validate payment flows safely while keeping premium AI routes on mainnet only.

## Route Shape

Public:

- `GET /`
- `GET /docs`
- `GET /health`
- `GET /supported`
- `GET /api/catalog`
- `GET /.well-known/x402`

Paid weather:

- `GET /weather/current`
- `GET /weather/forecast`
- `GET /weather/archive`
- `GET /weather/history-summary`
- `GET /testnet/weather/current`
- `GET /testnet/weather/forecast`
- `GET /testnet/weather/archive`
- `GET /testnet/weather/history-summary`

Paid news:

- `GET /news/:category`
- `GET /testnet/news/:category`
- Categories: `tech`, `ai`, `global`, `economics`, `blockchain`, `politics`, `sports`, `business`, `science`, `entertainment`, `gaming`, `security`, `health`

Paid AI:

- `POST /chat/respond`
- `POST /image/generate`

## Local Run

```bash
cp .env.example .env
# edit config/app.json for pricing and public runtime config
# keep secrets in .env
# add OPENAI_API_KEY to enable /chat and /image

npm install
npm run dev
```

Default server URL is `http://localhost:3000`.

## Config File

Public, non-secret runtime settings now live in `config/app.json`. That includes:

- pricing for `weather`, `news`, `chat`, and `image`
- public base URL and platform name
- request/cache timeouts and logging flag
- Stellar RPC URLs
- Open-Meteo upstream URLs
- default OpenAI model names
- mainnet/testnet pay-to addresses, facilitator URLs, and optional XLM contract addresses

Edit that file directly for normal configuration changes.

## Environment

`.env` is now for secrets and optional overrides.

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

You can still override any public value via env if needed, including prices such as `NEWS_PRICE_USDC`, but the default edit point is `config/app.json`.

## Example Requests

Public catalog:

```bash
curl http://localhost:3000/api/catalog
```

Unpaid mainnet forecast request, expected to return `402 Payment Required`:

```bash
curl "http://localhost:3000/weather/forecast?latitude=52.2053&longitude=0.1218&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto"
```

Unpaid testnet forecast request, also expected to return `402 Payment Required`:

```bash
curl "http://localhost:3000/testnet/weather/forecast?latitude=52.2053&longitude=0.1218&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto"
```

Paid news request:

```bash
curl "http://localhost:3000/news/ai?limit=12&max_per_feed=6"
```

Mainnet chat request:

```bash
curl -X POST "http://localhost:3000/chat/respond" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a short product pitch for a paid weather API on Stellar.",
    "system": "Be commercial and concise.",
    "reasoning_effort": "medium"
  }'
```

Mainnet image request:

```bash
curl -X POST "http://localhost:3000/image/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A premium weather app dashboard hero image, editorial 3d illustration",
    "size": "1536x1024",
    "quality": "high",
    "output_format": "jpeg"
  }'
```

## Notes

- Weather is available on both networks with the same request contracts.
- News is available on both networks with the same request contracts.
- Chat and image routes are published only when `OPENAI_API_KEY` is configured.
- `/.well-known/x402` lists route-specific payment metadata for discovery clients.
- The HTML overview and docs pages are rendered from the same shared catalog as the payment middleware.

## Deployment
```bash
git clone https://github.com/jamesbachini/xlm402
ln -s ../sites-available/xlm402.com ./xlm402.com
sudo ln -s ../sites-available/xlm402.com ./xlm402.com
nano config/app.json
nano .env
sudo npm install -g typescript
sudo npm install -g pm2
npm install  @types/node
npm run build
pm2 start dist/index.js --name xlm402
pm2 save
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u james --hp /home/james
sudo systemctl restart nginx
pm2 logs xlm402
pm2 restart xlm402
git pull origin main
pm2 restart xlm402
```

## License
MIT
