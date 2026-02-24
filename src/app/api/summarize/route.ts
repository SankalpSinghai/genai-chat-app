import { openai } from "@/lib/openai";

export async function POST(req: Request) {
    const { messages, previousSummary } = await req.json();

    const systemPrompt = {
        role: 'system' as const,
        content: `You are summarisation engine.
        
        Summarise the conversation into compact memory that preserves:
        - important user fact (name, job, goals)
        - key decisions
        - preferences
        - ongoing tasks 

        Rules:
        - Keep it short and structured 
        - Use bullet points 
        - Do not include unnecessary chit chat.
        - Output only summary text.
        `
    };

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            systemPrompt,
            ...(previousSummary
                ?
                [
                    {
                        role: 'user' as const,
                        content: `Previous summary: \n ${previousSummary}`,
                    },
                ]
                : []
            ),
            {
                role: 'user' as const,
                content: `Summarise these messages: \n ${JSON.stringify(messages)}`,

            },
        ],
    });

    const summary = response.choices[0].message.content ?? '';

    return Response.json({ summary });
}