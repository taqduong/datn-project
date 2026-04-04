"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Store,
  User,
  MessageCircle,
  SendHorizontal,
  Trash2,
  X,
  Maximize2, 
  Minimize2,
  Bot, 
} from "lucide-react";
import { fetchChatbotAnswer } from "@/services/api";

type SuggestedProduct = {
  id: number | string;
  name: string;
  price?: number;
  maxPrice?: number; 
  discount?: number;
  priceAfterDiscount?: number;
  imageUrl?: string;
  slug?: string;
  categoryName?: string;
  stock?: number;
  soldCount?: number;
  averageRating?: number;
  hasVariants?: boolean;
};

type ChatMsg = {
  id: string;
  sender: "user" | "bot";
  text: string;
  typing?: boolean;
  suggestions?: SuggestedProduct[];
  createdAt: number;
};

type ChatbotApiResponse =
  | string
  | {
      success?: boolean;
      answer?: string;
      suggestions?: SuggestedProduct[];
    };

const STORAGE_KEY = "homemart_chat_messages_v2";
const TYPE_DELAY_MS = 12;

const QUICK_PROMPTS = [
  "Tra cứu đơn hàng gần nhất của tôi", 
  "Gợi ý cho tôi vài sản phẩm hợp gu",
  "Shop có những mặt hàng nào?",
  "Gợi ý cho mình sản phẩm giá rẻ",
  "Có sản phẩm nào đang giảm giá không?",
  "Tư vấn giúp mình một vài sản phẩm nổi bật",
];

// Hàm xử lý link ảnh chuẩn
const getValidImageUrl = (val?: string) => {
  if (!val) return "";
  let url = val;
  try {
    if (url.startsWith("[")) {
      const arr = JSON.parse(url);
      if (Array.isArray(arr) && arr.length > 0) url = arr[0];
    }
    if (url.includes(",")) url = url.split(",")[0].trim();
    if (!/^https?:\/\//i.test(url)) {
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
      url = `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return url;
  } catch {
    return val;
  }
};

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function normalizeApiResponse(data: ChatbotApiResponse): {
  answer: string;
  suggestions: SuggestedProduct[];
} {
  if (typeof data === "string") {
    return {
      answer: data,
      suggestions: [],
    };
  }

  return {
    answer: data?.answer?.trim() || "Mình chưa có câu trả lời phù hợp.",
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
  };
}

function renderFormattedText(text: string) {
  const lines = text.split("\n");

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);

    return (
      <React.Fragment key={`line-${lineIndex}`}>
        {parts.map((part, partIndex) => {
          const isBold = part.startsWith("**") && part.endsWith("**");

          if (isBold) {
            return (
              <strong key={`part-${lineIndex}-${partIndex}`}>
                {part.slice(2, -2)}
              </strong>
            );
          }

          return (
            <React.Fragment key={`part-${lineIndex}-${partIndex}`}>
              {part}
            </React.Fragment>
          );
        })}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

function formatPrice(value?: number) {
  if (typeof value !== "number") return null;
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function getProductHref(product: SuggestedProduct) {
  if (product.slug) return `/products/${product.slug}`;
  return `/products/${product.id}`;
}

const DEFAULT_BOT_MESSAGE =
  "Xin chào, mình là trợ lý HomeMart. Mình có thể hỗ trợ tìm kiếm sản phẩm, tư vấn giá và gợi ý phù hợp cho bạn.";

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: createMessageId(),
      sender: "bot",
      text: DEFAULT_BOT_MESSAGE,
      createdAt: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const typingTargetIdRef = useRef<string | null>(null);
  const fullTypingTextRef = useRef("");
  const skipTypingRef = useRef(false);

  const hasTyping = useMemo(() => messages.some((m) => m.typing), [messages]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const focusInput = () => {
    setTimeout(() => textareaRef.current?.focus(), 60);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as ChatMsg[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed);
      }
    } catch (error) {
      console.error("Load chat history error:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error("Save chat history error:", error);
    }
  }, [messages]);

  useEffect(() => {
  scrollToBottom("smooth");
}, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) focusInput();
  }, [isOpen]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const autoResizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [inputValue]);

  const typeIntoMessage = async (
    targetId: string,
    fullText: string,
    suggestions: SuggestedProduct[] = []
  ) => {
    typingTargetIdRef.current = targetId;
    fullTypingTextRef.current = fullText;
    skipTypingRef.current = false;

    const step = fullText.length > 400 ? 4 : fullText.length > 220 ? 3 : 2;
    const delay = fullText.length > 400 ? 6 : TYPE_DELAY_MS;

    for (let i = step; i <= fullText.length; i += step) {
      if (skipTypingRef.current) break;

      const chunk = fullText.slice(0, i);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetId
            ? {
                ...m,
                text: chunk,
                suggestions: [],
              }
            : m
        )
      );

      await sleep(delay);
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === targetId
          ? {
              ...m,
              text: fullText,
              typing: false,
              suggestions,
            }
          : m
      )
    );

    typingTargetIdRef.current = null;
    fullTypingTextRef.current = "";
    skipTypingRef.current = false;
  };

  const skipTyping = () => {
    skipTypingRef.current = true;
    const targetId = typingTargetIdRef.current;
    if (!targetId) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === targetId
          ? {
              ...m,
              text: fullTypingTextRef.current,
              typing: false,
            }
          : m
      )
    );
  };

  const appendUserMessage = (text: string) => {
    const userMessage: ChatMsg = {
      id: createMessageId(),
      sender: "user",
      text,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
  };

  const appendBotShell = () => {
    const botId = createMessageId();

    const botShell: ChatMsg = {
      id: botId,
      sender: "bot",
      text: "",
      typing: true,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, botShell]);
    return botId;
  };

  const sendMessage = async (rawText?: string) => {
    const newText = (rawText ?? inputValue).trim();
    if (!newText || isLoading) return;

    appendUserMessage(newText);
    setInputValue("");
    setIsLoading(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const botId = appendBotShell();

      const chatHistory = messages
        .filter((m) => !m.typing && m.text !== DEFAULT_BOT_MESSAGE && m.id !== botId)
        .slice(-6)
        .map((m) => ({
          sender: m.sender,
          text: m.text,
        }));

      //  1. LẤY ID NGƯỜI DÙNG TỪ LOCALSTORAGE
      let currentUserId = undefined;
      if (typeof window !== "undefined") {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const userObj = JSON.parse(userStr);
            currentUserId = userObj.id; 
          } catch (e) {
             console.error("Lỗi parse thông tin user", e);
          }
        }
      }

      //  2. TRUYỀN ID XUỐNG API (THÊM currentUserId VÀO CUỐI)
      const response = (await fetchChatbotAnswer(newText, chatHistory, currentUserId)) as ChatbotApiResponse;
      const normalized = normalizeApiResponse(response);

      await typeIntoMessage(
        botId,
        normalized.answer || "Mình chưa có câu trả lời phù hợp.",
        normalized.suggestions
      );
    } catch (error) {
      console.error("Chatbot API error:", error);

      const errorMessage: ChatMsg = {
        id: createMessageId(),
        sender: "bot",
        text: "Hiện tại mình đang gặp sự cố kết nối. Bạn vui lòng thử lại sau nhé.",
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      focusInput();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await sendMessage();
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (isLoading) return;
    await sendMessage(prompt);
  };

  const handleClearHistory = () => {
    const firstBotMessage: ChatMsg = {
      id: createMessageId(),
      sender: "bot",
      text: DEFAULT_BOT_MESSAGE,
      createdAt: Date.now(),
    };

    setMessages([firstBotMessage]);
    localStorage.removeItem(STORAGE_KEY);
    focusInput();
  };

  const showQuickPrompts = !isLoading; // Giữ hiển thị thanh gợi ý luôn (khi không đang tải)

  return (
    <div className={`fixed bottom-5 right-5 ${isOpen ? "z-[60]" : "z-50"}`}>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Mở hộp chat"
          className="group relative flex items-center gap-2.5 rounded-2xl bg-blue-600 px-4 py-3 text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/25 active:translate-y-0"
        >
          {/* Icon Robot AI */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
            <Bot size={18} className="transition-transform duration-300 group-hover:scale-110" />
          </div>

          {/* Text 2 dòng đồng bộ với CSKH */}
          <span className="text-left text-sm font-semibold leading-[1.15] tracking-[-0.01em]">
            Trợ lý
            <span className="block text-white/95">Bot AI</span>
          </span>

          {/* Chấm xanh lá báo hiệu AI luôn online 24/7 */}
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-white/80 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {isOpen && (
        <div className={`flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-[width,height] duration-300 ${
        isExpanded 
          ? "h-[66.1vh] w-[97vw] sm:w-[492px] sm:h-[634px]" 
          : "h-[572px] w-[369px] max-w-[calc(100vw-24px)] sm:w-[410px]" 
      }`}>
            <div className="relative z-10 shrink-0 flex items-center justify-between bg-linear-to-r from-blue-600 to-blue-500 px-4 py-4 text-white">            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-tr from-blue-500 to-indigo-500 shadow-md shadow-blue-900/20">
                <Store className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-sm font-semibold sm:text-base">HomeMart AI</h3>
                <p className="text-xs text-blue-100">
                  Hệ thống tìm kiếm, tra cứu & đặt đơn thông minh
                </p>
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
                onClick={handleClearHistory}
                aria-label="Xóa cuộc trò chuyện"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label="Phóng to/Thu nhỏ"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                aria-label="Đóng hộp chat"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showQuickPrompts && (
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="shrink-0 rounded-full border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 hover:shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div
            className="flex-1 min-h-0 overflow-y-auto bg-slate-50 px-4 py-4 overscroll-contain scroll-smooth"
            role="log"
            aria-live="polite"
          >
            <div className="flex flex-col gap-4">

              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} />
              ))}

              {isLoading && !hasTyping && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                    <Store className="h-4 w-4" strokeWidth={2} />
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

          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!isLoading && inputValue.trim()) {
                        void sendMessage();
                      }
                    }
                  }}
                  rows={1}
                  placeholder={
                    isLoading
                      ? "Đang chờ phản hồi..."
                      : "Nhập câu hỏi của bạn..."
                  }
                  disabled={isLoading}
                  className="max-h-30 min-h-11.5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                aria-label="Gửi tin nhắn"
                className="flex h-11.5 w-11.5 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-2 text-[11px] text-slate-400">
              Enter để gửi • Shift + Enter để xuống dòng
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
          <Store className="h-4 w-4" strokeWidth={2} />
        </div>
      )}

      <div className="max-w-[85%] sm:max-w-[82%]">
        <div
          className={[
            "rounded-2xl px-4 py-3 text-[15px] leading-6 shadow-sm whitespace-pre-wrap break-words",
            isUser
              ? "rounded-br-md bg-blue-600 text-white"
              : "rounded-bl-md border border-slate-100 bg-white text-slate-800",
          ].join(" ")}
        >
          {isUser ? (
            message.text
          ) : (
            <span>{renderFormattedText(message.text || (message.typing ? " " : ""))}</span>
          )}

          {message.typing && (
            <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded bg-slate-400 align-middle" />
          )}
        </div>

        {!isUser && Array.isArray(message.suggestions) && message.suggestions.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2">
            {message.suggestions.slice(0, 3).map((product) => (
              <a
                key={String(product.id)}
                href={getProductHref(product)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-300 hover:shadow min-w-0"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getValidImageUrl(product.imageUrl)}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                      <Store className="h-5 w-5" strokeWidth={2} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-slate-800">
                    {product.name}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    {/* LOGIC HIỂN THỊ KHOẢNG GIÁ NẾU CÓ BIẾN THỂ */}
                    {typeof product.price === "number" && (
                      <span className="font-semibold text-blue-600">
                        {product.hasVariants && typeof product.maxPrice === "number" && product.maxPrice !== product.price
                          ? `${formatPrice(product.price * (1 - (product.discount || 0) / 100))} - ${formatPrice(product.maxPrice * (1 - (product.discount || 0) / 100))}`
                          : formatPrice(product.priceAfterDiscount ?? (product.price * (1 - (product.discount || 0) / 100)))}
                      </span>
                    )}

                    {typeof product.averageRating === "number" &&
                      product.averageRating > 0 && (
                        <span>⭐ {product.averageRating}</span>
                      )}

                    {typeof product.stock === "number" && (
                      <span>Còn {product.stock}</span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm">
          <User className="h-4 w-4" strokeWidth={2} />
        </div>
      )}
    </div>
  );
}