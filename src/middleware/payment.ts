import type { NextFunction, Request, Response } from "express";
import { ExpressAdapter, x402HTTPResourceServer } from "@x402/express";
import type { x402ResourceServer } from "@x402/express";
import { DEFAULT_TOKEN_DECIMALS, getUsdcAddress } from "@x402/stellar";
import { config } from "../config.js";

type RouteConfig = ConstructorParameters<typeof x402HTTPResourceServer>[1];
type BrowserPaymentRequired = {
  resource?: {
    url?: string;
    description?: string;
  };
  accepts?: Array<{
    network?: string;
    asset?: string;
    amount?: string;
  }>;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatStellarAmount(amount: string) {
  const trimmed = amount.replace(/^0+/, "") || "0";

  if (trimmed === "0") {
    return "0";
  }

  const padded = trimmed.padStart(DEFAULT_TOKEN_DECIMALS + 1, "0");
  const integerPart = padded.slice(0, -DEFAULT_TOKEN_DECIMALS) || "0";
  const fractionalPart = padded
    .slice(-DEFAULT_TOKEN_DECIMALS)
    .replace(/0+$/, "");

  return fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
}

function getAssetLabel(asset: string, network: string) {
  if (
    network === config.networks.mainnet.stellarNetwork ||
    network === config.networks.testnet.stellarNetwork
  ) {
    if (
      asset === getUsdcAddress(config.networks.mainnet.stellarNetwork) ||
      asset === getUsdcAddress(config.networks.testnet.stellarNetwork)
    ) {
      return "USDC";
    }

    if (
      asset === config.networks.mainnet.xlmContractAddress ||
      asset === config.networks.testnet.xlmContractAddress
    ) {
      return "XLM";
    }
  }

  return asset;
}

function renderBrowserPaywall(paymentRequired: BrowserPaymentRequired) {
  const resourceLabel =
    paymentRequired.resource?.description || paymentRequired.resource?.url || "Protected resource";
  const rawAccepts = (paymentRequired.accepts ?? [])
    .filter(
      (accept): accept is { network: string; asset: string; amount: string } =>
        typeof accept.network === "string" &&
        typeof accept.asset === "string" &&
        typeof accept.amount === "string",
    );
  const accepts = rawAccepts.map((accept, index) => {
      const assetLabel =
        index === 0
          ? "USDC"
          : index === 1 && rawAccepts.length > 1
            ? "XLM"
            : getAssetLabel(accept.asset, accept.network);
      const amount = formatStellarAmount(accept.amount);
      return assetLabel === "USDC"
        ? { ...accept, assetLabel, displayAmount: `$${amount} ${assetLabel}` }
        : { ...accept, assetLabel, displayAmount: `${amount} ${assetLabel}` };
    });

  const primary = accepts[0];
  const optionsHtml =
    accepts.length > 0
      ? `<ul style="margin: 0; padding-left: 1.25rem;">
          ${accepts
            .map(
              (accept) =>
                `<li style="margin: 0.35rem 0;">${escapeHtml(accept.displayAmount)}</li>`,
            )
            .join("")}
        </ul>`
      : "<p>No payment options available.</p>";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Required</title>
  </head>
  <body style="margin: 0; background: #0b1220; color: #e5eefb; font-family: system-ui, -apple-system, sans-serif;">
    <main style="max-width: 720px; margin: 56px auto; padding: 0 20px;">
      <section style="background: #111a2b; border: 1px solid #25324a; border-radius: 16px; padding: 24px;">
        <div style="display: inline-block; padding: 6px 10px; border-radius: 999px; background: #18243a; color: #8fb4ff; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">x402 Payment Required</div>
        <h1 style="margin: 16px 0 8px; font-size: 32px; line-height: 1.1;">Payment Required</h1>
        <p style="margin: 0 0 18px; color: #9cb0d1; line-height: 1.6;"><strong style="color: #e5eefb;">Resource:</strong> ${escapeHtml(resourceLabel)}</p>
        ${
          primary
            ? `<p style="margin: 0 0 14px; font-size: 20px; font-weight: 700;">Amount: ${escapeHtml(primary.displayAmount)}</p>`
            : ""
        }
        <div style="margin-top: 18px; padding: 16px; background: #0d1524; border: 1px solid #1c2940; border-radius: 12px;">
          <p style="margin: 0 0 10px; font-weight: 700;">Accepted payments</p>
          ${optionsHtml}
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function bufferResponseBody(
  bufferedCalls: Array<[method: string, args: unknown[]]>,
) {
  return Buffer.concat(
    bufferedCalls.flatMap(([, args]) => {
      const firstArg = args[0];

      if (
        typeof firstArg === "string" ||
        Buffer.isBuffer(firstArg) ||
        firstArg instanceof Uint8Array
      ) {
        return [Buffer.from(firstArg)];
      }

      return [];
    }),
  );
}

function buildUnexpectedSettlementBody(
  error: unknown,
  path: string,
  paymentRequirements: Record<string, unknown>,
) {
  const message = error instanceof Error ? error.message : String(error);

  return {
    error: "payment_settlement_failed",
    message: message || "Payment settlement failed",
    route: path,
    network:
      typeof paymentRequirements.network === "string"
        ? paymentRequirements.network
        : undefined,
    asset:
      typeof paymentRequirements.asset === "string"
        ? paymentRequirements.asset
        : undefined,
  };
}

export function createPaymentMiddleware(
  routes: RouteConfig,
  server: x402ResourceServer,
) {
  const httpServer = new x402HTTPResourceServer(server, routes);
  httpServer.registerPaywallProvider({
    generateHtml(paymentRequired) {
      return renderBrowserPaywall(paymentRequired as BrowserPaymentRequired);
    },
  });
  let initPromise: Promise<void> | null = httpServer.initialize();

  return async (req: Request, res: Response, next: NextFunction) => {
    const adapter = new ExpressAdapter(req);
    const context = {
      adapter,
      path: req.path,
      method: req.method,
      paymentHeader:
        adapter.getHeader("payment-signature") || adapter.getHeader("x-payment"),
    };

    if (!httpServer.requiresPayment(context)) {
      next();
      return;
    }

    if (initPromise) {
      await initPromise;
      initPromise = null;
    }

    const result = await httpServer.processHTTPRequest(context);

    switch (result.type) {
      case "no-payment-required":
        next();
        return;

      case "payment-error": {
        const { response } = result;
        res.status(response.status);

        Object.entries(response.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        if (response.isHtml) {
          res.send(response.body);
          return;
        }

        res.json(response.body || {});
        return;
      }

      case "payment-verified": {
        const { paymentPayload, paymentRequirements, declaredExtensions } = result;
        const mutableRes = res as any;
        const originalWriteHead = res.writeHead.bind(res);
        const originalWrite = res.write.bind(res);
        const originalEnd = res.end.bind(res);
        const originalFlushHeaders = res.flushHeaders.bind(res);
        const rawWriteHead = originalWriteHead as (...args: any[]) => Response;
        const rawWrite = originalWrite as (...args: any[]) => boolean;
        const rawEnd = originalEnd as (...args: any[]) => Response;
        let bufferedCalls: Array<[method: string, args: unknown[]]> = [];
        let settled = false;
        let endCalled!: () => void;
        const endPromise = new Promise<void>((resolve) => {
          endCalled = resolve;
        });

        mutableRes.writeHead = function writeHeadProxy(...args: unknown[]) {
          if (!settled) {
            bufferedCalls.push(["writeHead", args]);
            return res;
          }

          return rawWriteHead(...args);
        };

        mutableRes.write = function writeProxy(...args: unknown[]) {
          if (!settled) {
            bufferedCalls.push(["write", args]);
            return true;
          }

          return rawWrite(...args);
        };

        mutableRes.end = function endProxy(...args: unknown[]) {
          if (!settled) {
            bufferedCalls.push(["end", args]);
            endCalled();
            return res;
          }

          return rawEnd(...args);
        };

        mutableRes.flushHeaders = function flushHeadersProxy() {
          if (!settled) {
            bufferedCalls.push(["flushHeaders", []]);
            return;
          }

          return originalFlushHeaders();
        };

        next();
        await endPromise;

        if (res.statusCode >= 400) {
          settled = true;
          mutableRes.writeHead = originalWriteHead;
          mutableRes.write = originalWrite;
          mutableRes.end = originalEnd;
          mutableRes.flushHeaders = originalFlushHeaders;

          for (const [method, args] of bufferedCalls) {
            if (method === "writeHead") {
              rawWriteHead(...args);
            } else if (method === "write") {
              rawWrite(...args);
            } else if (method === "end") {
              rawEnd(...args);
            } else if (method === "flushHeaders") {
              originalFlushHeaders();
            }
          }

          bufferedCalls = [];
          return;
        }

        try {
          const responseBody = bufferResponseBody(bufferedCalls);
          const settleResult = await httpServer.processSettlement(
            paymentPayload,
            paymentRequirements,
            declaredExtensions,
            { request: context, responseBody },
          );

          if (!settleResult.success) {
            bufferedCalls = [];

            Object.entries(settleResult.response.headers).forEach(([key, value]) => {
              res.setHeader(key, value);
            });

            if (settleResult.response.isHtml) {
              res.status(settleResult.response.status).send(settleResult.response.body);
              return;
            }

            res.status(settleResult.response.status).json(settleResult.response.body ?? {});
            return;
          }

          Object.entries(settleResult.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        } catch (error) {
          console.error("[x402] unexpected settlement failure", {
            path: context.path,
            network: paymentRequirements.network,
            asset: paymentRequirements.asset,
            error,
          });

          bufferedCalls = [];
          res.status(402).json(
            buildUnexpectedSettlementBody(
              error,
              context.path,
              paymentRequirements as Record<string, unknown>,
            ),
          );
          return;
        } finally {
          settled = true;
          mutableRes.writeHead = originalWriteHead;
          mutableRes.write = originalWrite;
          mutableRes.end = originalEnd;
          mutableRes.flushHeaders = originalFlushHeaders;

          for (const [method, args] of bufferedCalls) {
            if (method === "writeHead") {
              rawWriteHead(...args);
            } else if (method === "write") {
              rawWrite(...args);
            } else if (method === "end") {
              rawEnd(...args);
            } else if (method === "flushHeaders") {
              originalFlushHeaders();
            }
          }

          bufferedCalls = [];
        }

        return;
      }
    }
  };
}
