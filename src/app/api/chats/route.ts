import { connectToDB } from "@/lib/db";
import { Chat } from '@/models/Chat';

export async function GET() {
    try {
        await connectToDB();
        const chats = await Chat.find()
            .sort({ updatedAt: -1 })
            .select("chatId createdAt updatedAt");

        return Response.json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error);
        return Response.json(
            { error: 'Failed to fetch chats' },
            { status: 500 }
        );
    }
}