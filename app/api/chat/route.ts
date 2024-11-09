import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { LanguageModelV1 } from '@ai-sdk/ui-utils/node_modules/@ai-sdk/provider';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const model = openai("gpt-4o") as unknown as LanguageModelV1;

  const result = await streamText({
    model,
    messages,
  });

  return result.toAIStreamResponse();
}