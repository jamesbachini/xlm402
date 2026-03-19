import type { NextFunction, Request, Response } from "express";
import { ExpressAdapter, x402HTTPResourceServer } from "@x402/express";
import type { x402ResourceServer } from "@x402/express";

type RouteConfig = ConstructorParameters<typeof x402HTTPResourceServer>[1];

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
