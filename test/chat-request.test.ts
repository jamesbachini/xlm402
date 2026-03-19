import assert from "node:assert/strict";
import { test } from "node:test";
import { parseChatRequest } from "../src/utils/validate.ts";

test("parseChatRequest normalizes legacy minimal reasoning effort to low", () => {
  const request = parseChatRequest({
    prompt: "Write a short reply.",
    reasoning_effort: "minimal",
  });

  assert.equal(request.reasoningEffort, "low");
});

test("parseChatRequest still rejects unsupported reasoning effort values", () => {
  assert.throws(
    () =>
      parseChatRequest({
        prompt: "Write a short reply.",
        reasoning_effort: "maximum",
      }),
    {
      message: "reasoning_effort must be one of: none, low, medium, high, xhigh",
    },
  );
});
