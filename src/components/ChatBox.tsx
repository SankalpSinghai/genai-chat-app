'use client';

import React, { useState } from "react";

type Message = {
    role: 'user' | 'assistant';
    content: string;
}

export const ChatBot = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState('');

    async function sendMessage() {
        if (!input.trim()) return;

        const userMessage: Message = {
            role: 'user',
            content: input,
        }

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch(`api/chat`, {
                method: "POST",
                headers: {
                    'CONTENT-TYPE': "application/json",
                },
                body: JSON.stringify({ message: userMessage.content })
            });

            const data = await res.json();

            const aiMessage: Message = {
                role: 'assistant',
                content: data.reply,
            }

            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.log('Error occured', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-xl mx-auto p-4">
            <h1 className="text-xl mb-4 font-semibold">Gen AI Chat</h1>
            <div>
                {messages.map((message, idx) => (
                    <div
                        key={idx}
                        className={`p-2 rounded ${message.role === 'user' ? "bg-blue-100 text-right" : "bg-gray-50 text-left max-w-80"
                            }`}
                    >
                        {message.content}
                        {loading && <div className="text-sm text-gray-500">AI is thinking...</div>}
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    value={input}
                    className="flex-1 border rounded p-2"
                    onChange={(e) => { setInput(e.target.value) }}
                    placeholder="Ask something..."
                />
                <button
                    onClick={sendMessage}
                    className="bg-black text-white px-4 rounded"
                >
                    Send
                </button>
            </div>
        </div>
    )
}