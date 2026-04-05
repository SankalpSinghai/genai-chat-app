"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type Message = {
    role: "user" | "assistant";
    content: string;
};

type SyntaxHighlighterStyle = { [key: string]: React.CSSProperties };

export const ChatBot = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState("");
    const [summary, setSummary] = useState("");
    const [chatId, setChatId] = useState<string | null>(null);
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
            const oldMessages = cleanedMessages.slice(0, 10); //summarise first 10
            const recentMessages = cleanedMessages.slice(10); // keep remaining

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
                body: JSON.stringify({
                    contextMessages: payloadMessages, //for open ai
                    allMessages: updatedMessages,    //for database
                    summary: currentSummary,
                    chatId,
                }),
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
        } catch (error: unknown) {
            //handle error gracefully  
            if (error instanceof Error && error?.name === 'AbortError') return;
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong! Please try again.' }])
        } finally {
            setLoading(false);
        }
    }

    function stopGeneration() {
        abortControllerRef.current?.abort();
    }

    async function handleNewChat() {
        try {
            const res = await fetch('/api/chat/new', { method: 'POST' });
            const data = await res.json();
            setChatId(data?.chatId);
            setMessages([]);
            setSummary('');
        } catch (error) {
            console.error('Error occurred in starting new chat', error);
        }
    }

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: loading ? 'auto' : 'smooth' })
    }, [messages, loading]);

    useEffect(() => {
        async function initChat() {
            const historyRes = await fetch('/api/history');
            const historyData = await historyRes.json();
            if (historyData?.chatId) {
                //use existing chatId
                setChatId(historyData?.chatId);
                setMessages(historyData?.messages || []);
                setSummary(historyData?.summary || '');
            } else {
                //create new chat
                const res = await fetch('/api/chat/new', { method: 'POST' });
                const data = await res.json();
                setChatId(data?.chatId);
            }
        }
        initChat();
    }, [])

    return (
        <div className="max-w-xl mx-auto p-4 h-screen flex flex-col ">
            <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Gen AI Chat</h1>
            <button
                className="text-sm bg-black text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
                onClick={handleNewChat}
                disabled={loading}
            >
                + New Chat
            </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {messages.map((message, idx) => (
                    <div
                        key={idx}
                        className={`p-2 rounded ${message.role === "user"
                            ? "bg-blue-100 text-right"
                            : "bg-gray-50 text-left max-w-80"
                            }`}
                    >
                        {message?.role === 'user'
                            ? (message.content)
                            :
                            (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        code({ className, children, ...props }) {
                                            const match = /language-(\w+)/.exec(className || "");
                                            const isBlock = !!match;

                                            return isBlock ? (
                                                <SyntaxHighlighter
                                                    style={oneDark as unknown as SyntaxHighlighterStyle}
                                                    language={match[1]}
                                                    PreTag="div"
                                                >
                                                    {String(children).replace(/\n$/, "")}
                                                </SyntaxHighlighter>
                                            ) : (
                                                <code
                                                    className="bg-gray-200 px-1 py-0.5 rounded text-sm"
                                                    {...props}
                                                >
                                                    {children}
                                                </code>
                                            );
                                        },
                                        p({ children }) {
                                            return <p className="mb-2 last:mb-0">{children}</p>;
                                        },
                                        ul({ children }) {
                                            return <ul className="list-disc pl-5 mb-2">{children}</ul>;
                                        },
                                        ol({ children }) {
                                            return (
                                                <ol className="list-decimal pl-5 mb-2">{children}</ol>
                                            );
                                        },
                                        h1({ children }) {
                                            return <h1 className="text-lg font-bold mb-2">{children}</h1>;
                                        },
                                        h2({ children }) {
                                            return <h2 className="text-base font-bold mb-2">{children}</h2>;
                                        },
                                        h3({ children }) {
                                            return <h3 className="font-semibold mb-1">{children}</h3>;
                                        },
                                    }}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            )
                        }
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
