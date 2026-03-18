import { x402Client, x402HTTPClient } from "@x402/core/client";
import type { PaymentRequirements } from "@x402/core/types";
import { ExactStellarScheme, getNetworkPassphrase } from "@x402/stellar";
import {
  getNetworkDetails,
  isConnected,
  requestAccess,
  signAuthEntry,
} from "@stellar/freighter-api";

type StellarNetwork = "stellar:pubnet" | "stellar:testnet";

type ConnectionOptions = {
  network: StellarNetwork;
  rpcUrls: Partial<Record<StellarNetwork, string>>;
  preferredAsset?: string;
};

type WindowWithFreighter = Window & typeof globalThis & {
  X402Freighter?: {
    connectAndCreateHttpClient(options: ConnectionOptions): Promise<{
      address: string;
      httpClient: x402HTTPClient;
      walletNetwork: string;
    }>;
  };
};

function normalizeAssetId(asset: string | undefined) {
  return asset?.trim().toUpperCase() || "";
}

async function connectAndCreateHttpClient({
  network,
  rpcUrls,
  preferredAsset,
}: ConnectionOptions) {
  const connection = await isConnected();

  if (connection.error) {
    throw new Error(connection.error.message || "Unable to detect Freighter.");
  }

  if (!connection.isConnected) {
    throw new Error("Freighter was not detected. Install the extension and reload this page.");
  }

  const access = await requestAccess();

  if (access.error || !access.address) {
    throw new Error(access.error?.message || "Freighter access was not granted.");
  }

  const requiredNetworkPassphrase = getNetworkPassphrase(network);
  const networkDetails = await getNetworkDetails();

  if (networkDetails.error) {
    throw new Error(networkDetails.error.message || "Unable to read Freighter network details.");
  }

  if (
    networkDetails.networkPassphrase &&
    networkDetails.networkPassphrase !== requiredNetworkPassphrase
  ) {
    const currentNetwork = networkDetails.network || "another network";
    throw new Error(`Freighter is on ${currentNetwork}. Switch it to ${network} and try again.`);
  }

  const rpcUrl = rpcUrls[network] || networkDetails.sorobanRpcUrl || "";

  if (network === "stellar:pubnet" && !rpcUrl) {
    throw new Error(
      "A Soroban RPC URL is required for stellar:pubnet. Configure MAINNET_SOROBAN_RPC_URL and try again.",
    );
  }

  const signer = {
    address: access.address,
    async signAuthEntry(authEntryXdr: string, options: { networkPassphrase?: string } = {}) {
      const response = await signAuthEntry(authEntryXdr, {
        address: access.address,
        networkPassphrase: options.networkPassphrase || requiredNetworkPassphrase,
      });

      if (response.error || !response.signedAuthEntry) {
        throw new Error(response.error?.message || "Freighter did not sign the auth entry.");
      }

      return {
        ...response,
        signedAuthEntry: response.signedAuthEntry,
      };
    },
  };

  const selectedAsset = normalizeAssetId(preferredAsset);
  const paymentRequirementsSelector = selectedAsset
    ? (_x402Version: number, accepts: PaymentRequirements[]) => {
        const matchedRequirement = accepts.find(
          (requirement) => normalizeAssetId(requirement.asset) === selectedAsset,
        );

        if (!matchedRequirement) {
          throw new Error(`No Stellar payment requirement was returned for asset ${preferredAsset}.`);
        }

        return matchedRequirement;
      }
    : undefined;

  const coreClient = new x402Client(paymentRequirementsSelector).register(
    "stellar:*",
    new ExactStellarScheme(signer, rpcUrl ? { url: rpcUrl } : undefined),
  );

  return {
    address: access.address,
    httpClient: new x402HTTPClient(coreClient),
    walletNetwork: networkDetails.network || network,
  };
}

(window as WindowWithFreighter).X402Freighter = {
  connectAndCreateHttpClient,
};
