import type { NextFunction, Request, Response } from "express";
import { isHttpError } from "../utils/errors.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: "not_found",
    message: "Route not found",
  });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (isHttpError(error)) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: "internal_error",
    message: "Unexpected server error",
  });
}

