import OpenAI from "openai";
import { config } from "../config.js";
import { HttpError } from "../utils/errors.js";

const REASONING_EFFORTS = new Set(["minimal", "low", "medium", "high"]);

export type ChatRequest = {
  prompt: string;
  system?: string;
  maxOutputTokens: number;
  reasoningEffort: "minimal" | "low" | "medium" | "high";
  metadata: Record<string, string>;
};

export type ImageRequest = {
  prompt: string;
  size: "auto" | "1024x1024" | "1536x1024" | "1024x1536";
  quality: "auto" | "low" | "medium" | "high";
  background: "auto" | "opaque" | "transparent";
  outputFormat: "jpeg" | "png" | "webp";
  moderation: "auto" | "low";
};

let client: OpenAI | undefined;

function getClient() {
  if (!config.openai.apiKey) {
    throw new HttpError(
      503,
      "service_unavailable",
      "AI services are disabled until OPENAI_API_KEY is configured",
    );
  }

  client ??= new OpenAI({
    apiKey: config.openai.apiKey,
    organization: config.openai.organization,
    project: config.openai.project,
  });

  return client;
}

function normalizeMetadata(metadata: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value.trim())
      .slice(0, 16),
  );
}

export async function createChatCompletion(request: ChatRequest) {
  if (!REASONING_EFFORTS.has(request.reasoningEffort)) {
    throw new HttpError(400, "invalid_request", "Unsupported reasoning effort");
  }

  try {
    const response = await getClient().responses.create({
      model: config.openai.chatModel,
      input: request.prompt,
      instructions: request.system,
      max_output_tokens: request.maxOutputTokens,
      reasoning: {
        effort: request.reasoningEffort,
      },
      metadata: normalizeMetadata(request.metadata),
      store: false,
    });

    return {
      id: response.id,
      model: response.model,
      output_text: response.output_text,
      status: response.status,
      incomplete_details: response.incomplete_details,
      usage: response.usage,
    };
  } catch (error) {
    console.error(error);
    throw new HttpError(502, "upstream_error", "OpenAI chat request failed");
  }
}

export async function generateImage(request: ImageRequest) {
  try {
    const response = await getClient().images.generate({
      model: config.openai.imageModel,
      prompt: request.prompt,
      size: request.size,
      quality: request.quality,
      background: request.background,
      output_format: request.outputFormat,
      moderation: request.moderation,
      n: 1,
    });

    const image = response.data?.[0];

    if (!image?.b64_json) {
      throw new Error("Image response did not include base64 payload");
    }

    return {
      created: response.created,
      model: config.openai.imageModel,
      mime_type:
        request.outputFormat === "png"
          ? "image/png"
          : request.outputFormat === "webp"
            ? "image/webp"
            : "image/jpeg",
      image_base64: image.b64_json,
      revised_prompt: image.revised_prompt,
      size: request.size,
      quality: request.quality,
      background: request.background,
    };
  } catch (error) {
    console.error(error);
    throw new HttpError(502, "upstream_error", "OpenAI image request failed");
  }
}
