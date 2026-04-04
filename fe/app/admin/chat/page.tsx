"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import {
  fetchAdminChatUsers,
  fetchHistoryWithUser,
  markChatAsRead,
  type ChatMessageDto,
} from "@/services/api";
import {
  Search,
  Send,
  User,
  MessageSquare,
  Clock3,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type AdminChatUser = {
  userId: number;
  fullName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
};

type RealtimeChatMessage = ChatMessageDto & {
  userId: number;
  id?: number | string;
};

export default function AdminChatPage() {
  const [users, setUsers] = useState<AdminChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const connectionRef = useRef<HubConnection | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api";
  const HUB_URL = API_URL.replace("/api", "/chatHub");

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUsers = async () => {
    try {
      setIsUsersLoading(true);
      const res = await fetchAdminChatUsers();
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Lỗi tải danh sách chat:", error);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const loadHistory = async (userId: number) => {
    try {
      setIsMessagesLoading(true);
      const res = await fetchHistoryWithUser(userId);
      setMessages(Array.isArray(res.data) ? res.data : []);
      requestAnimationFrame(() => scrollToBottom("auto"));
    } catch (error) {
      console.error("Lỗi tải lịch sử chat:", error);
      setMessages([]);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const getMessageKey = (msg: Partial<RealtimeChatMessage | ChatMessageDto>) => {
    const safeMessage = msg.message ?? "";
    const safeTime = msg.createdAt ?? "";
    const safeFromAdmin = String(msg.isFromAdmin ?? "");
    const safeUserId = "userId" in msg ? String(msg.userId ?? "") : "";
    const safeId = "id" in msg && msg.id != null ? String(msg.id) : "";

    return safeId || `${safeUserId}__${safeFromAdmin}__${safeMessage}__${safeTime}`;
  };

  const appendMessageSafely = (msg: RealtimeChatMessage | ChatMessageDto) => {
    setMessages((prev) => {
      const incomingKey = getMessageKey(msg);

      const exists = prev.some((item) => getMessageKey(item) === incomingKey);
      if (exists) return prev;

      return [...prev, msg];
    });
  };

  useEffect(() => {
    loadUsers();

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    const handleReceiveMessage = (msg: RealtimeChatMessage) => {
      loadUsers();

      setSelectedUser((prevSelected) => {
        if (prevSelected && prevSelected.userId === msg.userId) {
          appendMessageSafely(msg);

          markChatAsRead(msg.userId)
            .then(() => loadUsers())
            .catch((err) => console.error("Lỗi đánh dấu đã đọc:", err));
        }

        return prevSelected;
      });
    };

    const startConnection = async () => {
      try {
        if (connection.state === "Disconnected") {
          await connection.start();
        }

        setIsConnected(true);
        console.log("🟢 Admin đã kết nối Tổng đài Chat!");

        connection.off("ReceiveMessage", handleReceiveMessage);
        connection.on("ReceiveMessage", handleReceiveMessage);

        connection.onreconnecting(() => {
          setIsConnected(false);
        });

        connection.onreconnected(() => {
          setIsConnected(true);
          loadUsers();
        });

        connection.onclose(() => {
          setIsConnected(false);
        });
      } catch (error) {
        console.error("🔴 Lỗi kết nối Chat:", error);
        setIsConnected(false);
      }
    };

    startConnection();

    return () => {
      connection.off("ReceiveMessage", handleReceiveMessage);
      connection
        .stop()
        .then(() => {
          setIsConnected(false);
        })
        .catch((err) => console.error("Lỗi khi ngắt SignalR:", err));
    };
  }, [HUB_URL]);

  const handleSelectUser = async (user: AdminChatUser) => {
    setSelectedUser(user);

    try {
      if (user.unreadCount > 0) {
        await markChatAsRead(user.userId);
        await loadUsers();
      }

      await loadHistory(user.userId);
    } catch (error) {
      console.error("Lỗi mở đoạn chat:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const text = inputText.trim();
    const connection = connectionRef.current;

    if (!text || !connection || !selectedUser || isSending) return;

    try {
      setIsSending(true);

      await connection.invoke("SendMessageToUser", selectedUser.userId, text);

      setInputText("");
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
    } finally {
      setIsSending(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return users;

    return users.filter((u) => {
      return (
        u.fullName?.toLowerCase().includes(keyword) ||
        String(u.userId).includes(keyword) ||
        u.lastMessage?.toLowerCase().includes(keyword)
      );
    });
  }, [users, searchText]);

  const totalUnread = useMemo(() => {
    return users.reduce((sum, user) => sum + (user.unreadCount || 0), 0);
  }, [users]);

  return (
    <div className="grid h-[calc(100vh-120px)] grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] lg:grid-cols-[360px_1fr]">
      {/* Sidebar */}
      <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-50/80 backdrop-blur-sm">
        <div className="border-b border-slate-200 bg-white/90 p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <MessageSquare size={18} />
                </div>
                Tin nhắn khách hàng
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Quản lý hội thoại và phản hồi khách hàng theo thời gian thực
              </p>
            </div>

            <button
              onClick={loadUsers}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
              title="Tải lại danh sách"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Tổng hội thoại</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{users.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Chưa đọc</p>
              <p className="mt-1 text-xl font-bold text-red-500">{totalUnread}</p>
            </div>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm theo tên, ID hoặc tin nhắn..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs">
            <span
              className={`inline-flex h-2.5 w-2.5 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className={isConnected ? "text-green-600" : "text-red-500"}>
              {isConnected ? "Đã kết nối realtime" : "Mất kết nối realtime"}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isUsersLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-full bg-slate-200" />
                    <div className="flex-1">
                      <div className="h-4 w-2/3 rounded bg-slate-200" />
                      <div className="mt-2 h-3 w-full rounded bg-slate-100" />
                      <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-400">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-200/70">
                <Search size={24} />
              </div>
              <p className="font-medium text-slate-500">Không tìm thấy cuộc trò chuyện</p>
              <p className="mt-1 text-sm">Thử đổi từ khóa tìm kiếm của bạn</p>
            </div>
          ) : (
            <div className="p-3">
              {filteredUsers.map((u) => {
                const isActive = selectedUser?.userId === u.userId;

                return (
                  <button
                    key={u.userId}
                    onClick={() => handleSelectUser(u)}
                    className={`mb-3 w-full rounded-2xl border p-4 text-left transition-all ${
                      isActive
                        ? "border-blue-200 bg-blue-50 shadow-sm"
                        : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                          isActive
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <User size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4
                              className={`truncate text-sm ${
                                u.unreadCount > 0
                                  ? "font-bold text-slate-900"
                                  : "font-semibold text-slate-700"
                              }`}
                            >
                              {u.fullName}
                            </h4>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              ID: {u.userId}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-[11px] text-slate-400">
                              {u.lastMessageTime
                                ? format(new Date(u.lastMessageTime), "HH:mm", {
                                    locale: vi,
                                  })
                                : "--:--"}
                            </p>
                          </div>
                        </div>

                        <p
                          className={`truncate text-xs ${
                            u.unreadCount > 0
                              ? "font-medium text-slate-700"
                              : "text-slate-500"
                          }`}
                        >
                          {u.lastMessage || "Chưa có nội dung"}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {u.unreadCount > 0 && (
                          <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 py-1 text-[10px] font-bold text-white">
                            {u.unreadCount}
                          </span>
                        )}
                        <ChevronRight
                          size={16}
                          className={isActive ? "text-blue-500" : "text-slate-300"}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Main chat */}
      <section className="flex min-h-0 flex-col bg-gradient-to-b from-white to-slate-50/60">
        {!selectedUser ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-inner">
              <MessageSquare size={34} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              Chọn một cuộc trò chuyện
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Hãy chọn khách hàng ở cột bên trái để xem lịch sử chat và phản hồi
              tin nhắn theo thời gian thực.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-slate-200 bg-white/90 px-6 py-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <User size={20} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-slate-800">
                      {selectedUser.fullName}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>Khách hàng #{selectedUser.userId}</span>
                      <span className="flex items-center gap-1 text-green-600">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        {isConnected ? "Đang kết nối" : "Mất kết nối"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectUser(selectedUser)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                >
                  <RefreshCw size={16} />
                  Tải lại
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              {isMessagesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`flex ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}
                    >
                      <div className="max-w-[75%] animate-pulse rounded-2xl bg-slate-200 px-4 py-4">
                        <div className="h-4 w-40 rounded bg-slate-300" />
                        <div className="mt-2 h-3 w-24 rounded bg-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200/70">
                    <MessageSquare size={26} />
                  </div>
                  <p className="font-medium text-slate-500">Chưa có tin nhắn nào</p>
                  <p className="mt-1 text-sm">Hãy bắt đầu cuộc trò chuyện với khách hàng</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => {
                    const isAdmin = msg.isFromAdmin;

                    return (
                      <div
                        key={`${getMessageKey(msg)}-${idx}`}
                        className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-3xl px-4 py-3 shadow-sm sm:max-w-[70%] ${
                            isAdmin
                              ? "rounded-br-md bg-blue-600 text-white"
                              : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">
                            {msg.message}
                          </p>

                          <div
                            className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${
                              isAdmin ? "text-blue-100" : "text-slate-400"
                            }`}
                          >
                            <Clock3 size={12} />
                            <span>
                              {msg.createdAt
                                ? format(new Date(msg.createdAt), "HH:mm dd/MM", {
                                    locale: vi,
                                  })
                                : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-2 block text-xs font-medium text-slate-500">
                    Soạn tin nhắn
                  </label>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Nhập tin nhắn gửi ${selectedUser.fullName}...`}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending || !isConnected}
                  className="inline-flex h-[50px] items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Send size={17} />
                  {isSending ? "Đang gửi..." : "Gửi"}
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}