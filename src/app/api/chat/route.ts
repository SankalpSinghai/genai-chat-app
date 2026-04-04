import { openai } from "@/lib/openai";
import { connectToDB } from "@/lib/db";
import { Chat } from "@/models/Chat";

export async function POST(req: Request) {
  const { messages, summary } = await req.json();

  const systemPrompt = {
    role: 'system',
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
      let fullResponse = '';
      for await (const chunk of response) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) {
          fullResponse += token;
          controller.enqueue(encoder.encode(token));
        }
      }
      controller.close();

      //save the chat to database 
      try {
        await connectToDB();
        await Chat.findOneAndUpdate(
          {},
          {
            messages: [
              ...messages,
              { role: 'assistant', content: fullResponse },
            ],
            summary: summary || '',
          },
          {
            upsert: true,
            sort: { createdAt: -1 },
            new: true,
          }
        )
      } catch (error) {
        console.error('Failed to save chat to database:', error instanceof Error ? error.message : error);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-control": "no-cache",
    },
  });
}
