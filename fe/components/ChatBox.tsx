"use client";

import React, { useEffect, useRef, useState } from "react";
import { fetchChatbotAnswer } from "@/services/api";

type ChatMsg = {
  id: number;
  sender: "user" | "bot";
  text: string;
  typing?: boolean;
};

const TYPE_DELAY_MS = 15;

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 1,
      sender: "bot",
      text: "Xin chào 👋 Mình là trợ lý của HomeMart. Bạn muốn tìm sản phẩm hoặc cần hỗ trợ gì?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const skipTypingRef = useRef(false);
  const fullTypingTextRef = useRef("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const typeIntoMessage = async (targetId: number, fullText: string) => {
    fullTypingTextRef.current = fullText;
    skipTypingRef.current = false;

    for (let i = 1; i <= fullText.length; i++) {
      if (skipTypingRef.current) break;

      const chunk = fullText.slice(0, i);
      setMessages((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, text: chunk } : m))
      );

      await sleep(TYPE_DELAY_MS);
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === targetId
          ? { ...m, text: fullText, typing: false }
          : m
      )
    );
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newText = inputValue.trim();
    if (!newText || isLoading) return;

    const userMessage: ChatMsg = {
      id: Date.now(),
      sender: "user",
      text: newText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const botAnswer = await fetchChatbotAnswer(newText);

      const botId = Date.now() + 1;
      const botShell: ChatMsg = {
        id: botId,
        sender: "bot",
        text: "",
        typing: true,
      };

      setMessages((prev) => [...prev, botShell]);
      await typeIntoMessage(botId, botAnswer || "Mình chưa có câu trả lời phù hợp.");
    } catch (error) {
      console.error("Chatbot API error:", error);

      const errorMessage: ChatMsg = {
        id: Date.now() + 2,
        sender: "bot",
        text: "Hiện tại mình đang gặp sự cố kết nối. Bạn vui lòng thử lại sau nhé.",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const skipTyping = () => {
    skipTypingRef.current = true;
    setMessages((prev) =>
      prev.map((m) =>
        m.typing
          ? {
              ...m,
              text: fullTypingTextRef.current,
              typing: false,
            }
          : m
      )
    );
  };

  const hasTyping = messages.some((m) => m.typing);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Mở hộp chat"
          className="group flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:scale-105 hover:bg-blue-700"
        >
          <span className="text-2xl">💬</span>
        </button>
      )}

      {isOpen && (
        <div className="flex h-140 w-87.5 max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:w-97.5">
          <div className="flex items-center justify-between bg-linear-to-r from-blue-600 to-blue-500 px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-lg">
                🤖
              </div>
              <div>
                <h3 className="text-sm font-semibold sm:text-base">HomeMart Assistant</h3>
                <p className="text-xs text-blue-100">Hỗ trợ tìm kiếm và tư vấn sản phẩm</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasTyping && (
                <button
                  onClick={skipTyping}
                  className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium transition hover:bg-white/25"
                >
                  Bỏ qua
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                aria-label="Đóng hộp chat"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg transition hover:bg-white/20"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
            <div className="flex flex-col gap-4">
              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} />
              ))}

              {isLoading && !hasTyping && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200">
                    🤖
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    isLoading ? "Đang chờ phản hồi..." : "Nhập câu hỏi của bạn..."
                  }
                  disabled={isLoading}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                aria-label="Gửi tin nhắn"
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                ➤
              </button>
            </form>

            <p className="mt-2 text-center text-[11px] text-slate-400">
              Hỏi về sản phẩm, giá, danh mục hoặc hỗ trợ mua hàng
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageItem({ message }: { message: ChatMsg }) {
  const isUser = message.sender === "user";

  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm">
          🤖
        </div>
      )}

      <div
        className={[
          "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm whitespace-pre-wrap wrap-break-word",
          isUser
            ? "rounded-br-md bg-blue-600 text-white"
            : "rounded-bl-md bg-white text-slate-800",
        ].join(" ")}
      >
        {message.text || (message.typing ? " " : "")}
        {message.typing && (
          <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded bg-current align-middle opacity-70" />
        )}
      </div>

      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm">
          👤
        </div>
      )}
    </div>
  );
}