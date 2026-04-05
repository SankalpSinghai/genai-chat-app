import { connectToDB } from "@/lib/db";
import { Chat } from "@/models/Chat";

export async function GET() {
    await connectToDB();
    const chats = await Chat.findOne().sort({ createdAt: -1 });
    return Response.json( chats || { messages: [], summary: '' })
}