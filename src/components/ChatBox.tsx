"use client";

import React, { useState, useEffect, useRef } from "react";

type Message = {
    role: "user" | "assistant";
    content: string;
};

export const ChatBot = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState("");
    const [summary, setSummary] = useState("");
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    async function summarizeMessages(previousSummary: string, oldMessages: Message[]): Promise<string> {
        try {
            const res = await fetch('/api/summarize', {
                method: "POST",
                headers: {
                    "Content-Type": 'application/json',
                },
                body: JSON.stringify({
                    previousSummary,
                    messages: oldMessages,
                }),
            });

            const data = await res.json();
            return data.summary;
        } catch (error) {
            console.log('Error occured in summarisation', error);
            return previousSummary; //fallback to previous summary
        }
    }

    async function sendMessage() {
        if (!input.trim()) return;

        const userMessage: Message = {
            role: "user",
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        let currentSummary = summary;

        const updatedMessages = [...messages, userMessage];

        //Remove empty placeholder messages (assistant empty message)
        const cleanedMessages = updatedMessages.filter((m) => m.content.trim() !== '');

        let finalMessages = cleanedMessages;

        if (cleanedMessages.length > 20) {
            let oldMessages = cleanedMessages.slice(0, 10); //summarise first 10
            let recentMessages = cleanedMessages.slice(10); // keep remaining

            const newSummary = await summarizeMessages(currentSummary, oldMessages);

            currentSummary = newSummary;
            setSummary(newSummary);

            finalMessages = recentMessages;
        }

        //keep only recent messages as context
        const trimmedMessage = finalMessages.slice(-12);

        const payloadMessages = currentSummary
            ? [
                {
                    role: 'system',
                    content: `Conversation summary so far:\n ${currentSummary}`
                },
                ...trimmedMessage,
            ] : trimmedMessage;

        try {
            abortControllerRef.current = new AbortController();

            const res = await fetch(`/api/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages: payloadMessages }),
                signal: abortControllerRef.current.signal,
            });

            //Reads response body steam chunk by chunk. Converts incoming bytes to readable text.
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            //Placeholder assistant message
            let aiText = "";
            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

            while (true) {
                const { value, done } = await reader!.read();
                if (done) break;

                const chunk = decoder.decode(value);
                aiText += chunk;

                setMessages((prev) => {
                    const updated = [...prev];

                    updated[updated.length - 1] = {
                        role: "assistant",
                        content: aiText,
                    };
                    return updated;
                });
            }
        } catch (error: any) {
            //handle error gracefully  
            if (error?.name === 'AbortError') return;
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong! Please try again.' }])
        } finally {
            setLoading(false);
        }
    }

    function stopGeneration() {
        abortControllerRef.current?.abort();
    }

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: loading ? 'auto' : 'smooth' })
    }, [messages, loading]);

    return (
        <div className="max-w-xl mx-auto p-4 h-screen flex flex-col ">
            <h1 className="text-xl mb-4 font-semibold">Gen AI Chat</h1>
            <div className="flex-1 overflow-y-auto">
                {messages.map((message, idx) => (
                    <div
                        key={idx}
                        className={`p-2 rounded ${message.role === "user"
                            ? "bg-blue-100 text-right"
                            : "bg-gray-50 text-left max-w-80"
                            }`}
                    >
                        {message.content}
                    </div>
                ))}

                <div ref={bottomRef} />
            </div>
            <div className="flex gap-2 mt-4">
                <input
                    value={input}
                    className="flex-1 border rounded p-2"
                    onChange={(e) => {
                        setInput(e.target.value);
                    }}
                    placeholder="Ask something..."
                />
                <button
                    onClick={loading ? stopGeneration : sendMessage}
                    className={`text-white px-4 rounded ${loading ? "bg-red-500" : "bg-black "}`}
                >
                    {loading ? 'Stop Generating' : 'Send'}
                </button>
            </div>
        </div>
    );
};
