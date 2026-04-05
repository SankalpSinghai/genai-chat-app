import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    'role': String,
    'content': String
});

const ChatSchema = new mongoose.Schema({
    'messages': [MessageSchema],
    'summary': {type: String, default: ''}
},
{
    timestamps: true,
});

export const Chat = mongoose.model('Chat', ChatSchema);