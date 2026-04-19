import { connectToDB } from "@/lib/db";
import { Chat } from "@/models/Chat";
import { v4 as uuid } from 'uuid';

export async function POST() {
    await connectToDB();

    const chatId = uuid();

    await Chat.create({
        chatId,
        messages: [],
        summary: ''
    });

    return Response.json({ chatId });
}