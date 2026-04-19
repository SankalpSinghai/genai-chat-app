import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    'role': String,
    'content': String
});

const ChatSchema = new mongoose.Schema({
    'chatId': {type: String, required: true, unique: true},
    'messages': [MessageSchema],
    'summary': {type: String, default: ''}
},
{
    timestamps: true,
});

export const Chat = mongoose.model('Chat', ChatSchema);