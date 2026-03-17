import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { Keypair } from "@stellar/stellar-sdk";
import { x402Client, x402HTTPClient } from "@x402/core/client";

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
  renderDocsPage: (catalog: unknown) => string;
  buildPlatformCatalog: () => unknown;
};

let context: AppContext;

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

before(async () => {
  const mainnetPayTo = Keypair.random().publicKey();
  const testnetPayTo = Keypair.random().publicKey();
  const facilitatorSigner = Keypair.random().publicKey();

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
  process.env.OPEN_METEO_BASE_URL = weatherServer.baseUrl;
  process.env.OPEN_METEO_ARCHIVE_BASE_URL = weatherServer.baseUrl;

  const [{ createApp }, htmlModule, catalogModule] = await Promise.all([
    import("../src/app.ts"),
    import("../src/platform/html.ts"),
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
    renderDocsPage: htmlModule.renderDocsPage,
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
  await context.close();
});

test("catalogue HTML uses the v2 payment flow and bundled Freighter client", () => {
  const html = context.renderDocsPage(context.buildPlatformCatalog());

  assert.match(html, /\/vendor\/freighter-x402\.js/);
  assert.match(html, /PAYMENT-REQUIRED/);
  assert.match(html, /createPaymentPayload/);
  assert.match(html, /X402Freighter/);
  assert.doesNotMatch(html, /authModal\(/);
  assert.doesNotMatch(html, /openModal\(/);
  assert.doesNotMatch(html, /X-PAYMENT/);
});

test("paid weather route accepts a v2 retry and returns settlement headers", async () => {
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
