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
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

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
    } catch (error) {
      console.log("Error occured", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({ behavior: 'smooth'})
  },[messages]);

  return (
    <div className="max-w-xl mx-auto p-4 h-screen flex flex-col ">
      <h1 className="text-xl mb-4 font-semibold">Gen AI Chat</h1>
      <div className="flex-1 overflow-y-auto">
        {messages.map((message, idx) => (
          <div
            ref={bottomRef}
            key={idx}
            className={`p-2 rounded ${
              message.role === "user"
                ? "bg-blue-100 text-right"
                : "bg-gray-50 text-left max-w-80"
            }`}
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <div className="text-sm text-gray-500">AI is thinking...</div>
        )}
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
          onClick={sendMessage}
          className="bg-black text-white px-4 rounded disabled:opacity-50"
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
};
