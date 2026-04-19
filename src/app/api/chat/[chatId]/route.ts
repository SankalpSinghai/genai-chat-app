import { connectToDB } from "@/lib/db";
import { Chat } from '@/models/Chat';

export async function GET(req: Request, { params }: { params: { chatId: string } }) {
    await connectToDB();

    const chat = await Chat.findOne({ chatId: params?.chatId });
    if (!chat) {
        return Response.json({ messages: [], summary: '' })
    }

    return Response.json(chat);
}