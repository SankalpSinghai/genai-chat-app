import { openai } from '@/../lib/openai';

export async function POST(req: Request) {
    const { message } = await req.json();

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {role: 'user', content: message}
        ],
    });

    return Response.json({
        reply: response.choices[0].message.content,
    })
}