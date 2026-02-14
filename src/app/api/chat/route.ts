import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const systemPrompt = {
    role : 'system',
    content: 'You are helpful AI assistant. Keep answers concise.',
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [systemPrompt, ...messages],
    stream: true,
  });

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) {
          controller.enqueue(encoder.encode(token));
        }
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-control": "no-cache",
    },
  });
}
