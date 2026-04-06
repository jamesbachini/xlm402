import path from "node:path";
import { appendFile, mkdir } from "node:fs/promises";
import { convertToTokenAmount, DEFAULT_TOKEN_DECIMALS } from "@x402/stellar";
import type { NetworkLabel } from "../config.js";

export const EASTER_EGG_ROUTE = "/easteregg";
export const EASTER_EGG_MAINNET_PATH = EASTER_EGG_ROUTE;
export const EASTER_EGG_TESTNET_PATH = `/testnet${EASTER_EGG_ROUTE}`;
export const EASTER_EGG_MESSAGE =
  "Thank you, your address has been recorded. Stand by...";
export const EASTER_EGG_AMOUNT_DECIMAL = "0.01";
export const EASTER_EGG_USDC_AMOUNT_STROOPS = convertToTokenAmount(
  EASTER_EGG_AMOUNT_DECIMAL,
  DEFAULT_TOKEN_DECIMALS,
);

export type EasterEggRecord = {
  payer: string;
  network: NetworkLabel;
  stellarNetwork: string;
  asset: string;
  amount: string;
  transaction: string;
  route: string;
};

export function isEasterEggPath(pathname: string | undefined): pathname is string {
  return (
    pathname === EASTER_EGG_MAINNET_PATH ||
    pathname === EASTER_EGG_TESTNET_PATH
  );
}

export function getEasterEggRecordFilePath() {
  const configuredPath = process.env.EASTEREGG_RECORD_FILE?.trim();

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath);
  }

  return path.resolve(process.cwd(), ".data", "easteregg-addresses.jsonl");
}

export async function recordEasterEggAddress(record: EasterEggRecord) {
  const targetPath = getEasterEggRecordFilePath();
  await mkdir(path.dirname(targetPath), { recursive: true });
  await appendFile(
    targetPath,
    `${JSON.stringify({
      recorded_at: new Date().toISOString(),
      ...record,
    })}\n`,
    "utf8",
  );
}

export function formatTokenAmount(amount: string) {
  const trimmed = amount.replace(/^0+/, "") || "0";

  if (trimmed === "0") {
    return "0";
  }

  const padded = trimmed.padStart(DEFAULT_TOKEN_DECIMALS + 1, "0");
  const integerPart = padded.slice(0, -DEFAULT_TOKEN_DECIMALS) || "0";
  const fractionalPart = padded
    .slice(-DEFAULT_TOKEN_DECIMALS)
    .replace(/0+$/, "");

  if (!fractionalPart) {
    return integerPart;
  }

  return `${integerPart}.${fractionalPart}`;
}
