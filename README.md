# xlm402 Services Platform

Commercial x402 service platform for Stellar payments. The app now serves:

- Mainnet weather routes at `/weather/*`
- Testnet weather routes at `/testnet/weather/*`
- Mainnet AI inference at `/chat/respond`
- Mainnet image generation at `/image/generate`
- Human-facing pages at `/` and `/docs`

One deployment can now expose both Stellar networks at once. Testnet is intentionally limited to the weather product so you can validate payment flows safely while keeping premium AI routes on mainnet only.

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

Paid AI:

- `POST /chat/respond`
- `POST /image/generate`

## Local Run

```bash
cp .env.example .env
# fill in mainnet/testnet pay-to addresses and facilitator URLs
# add OPENAI_API_KEY to enable /chat and /image

npm install
npm run dev
```

Default server URL is `http://localhost:3000`.

## Environment

```env
PORT=3000
NODE_ENV=development
PLATFORM_NAME=xlm402 services
PUBLIC_BASE_URL=https://xlm402.com

WEATHER_PRICE_USDC=0.01
CHAT_PRICE_USDC=0.05
IMAGE_PRICE_USDC=0.10

MAINNET_PAY_TO_ADDRESS=G...
MAINNET_FACILITATOR_URL=http://localhost:4022
MAINNET_FACILITATOR_API_KEY=

TESTNET_PAY_TO_ADDRESS=G...
TESTNET_FACILITATOR_URL=http://localhost:4023
TESTNET_FACILITATOR_API_KEY=

OPEN_METEO_BASE_URL=https://api.open-meteo.com
OPEN_METEO_ARCHIVE_BASE_URL=https://archive-api.open-meteo.com

OPENAI_API_KEY=
OPENAI_ORG_ID=
OPENAI_PROJECT_ID=
OPENAI_CHAT_MODEL=gpt-5.4
OPENAI_IMAGE_MODEL=gpt-image-1.5

REQUEST_TIMEOUT_MS=8000
CACHE_TTL_SECONDS=60
LOG_PAYMENTS=true
```

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
- Chat and image routes are published only when `OPENAI_API_KEY` is configured.
- `/.well-known/x402` lists route-specific payment metadata for discovery clients.
- The HTML overview and docs pages are rendered from the same shared catalog as the payment middleware.

## Deployment
```bash
git clone https://github.com/jamesbachini/xlm402
ln -s ../sites-available/xlm402.com ./xlm402.com
sudo ln -s ../sites-available/xlm402.com ./xlm402.com
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