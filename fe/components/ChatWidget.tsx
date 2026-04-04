"use client";

import { useEffect, useState, useRef } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { X, Send, Bot, Headset } from "lucide-react";
import { fetchUserChatHistory, type ChatMessageDto } from "@/services/api";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [inputText, setInputText] = useState("");
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api";
  const HUB_URL = API_URL.replace("/api", "/chatHub");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // ================= 1. LẮNG NGHE SỰ KIỆN ĐĂNG NHẬP / ĐĂNG XUẤT =================
  useEffect(() => {
    const checkUserStatus = () => {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      } else {
        setCurrentUser(null);
        setIsOpen(false); // Nếu đăng xuất thì đóng luôn khung chat
      }
    };

    // Kiểm tra ngay lúc đầu
    checkUserStatus();

    // Lắng nghe sự kiện "userUpdated" từ api.ts bắn ra khi login/logout
    window.addEventListener("userUpdated", checkUserStatus);
    
    // Dọn dẹp khi component hủy
    return () => window.removeEventListener("userUpdated", checkUserStatus);
  }, []);

  // ================= 2. QUẢN LÝ KẾT NỐI SIGNALR DỰA VÀO USER =================
  useEffect(() => {
    // Nếu chưa login hoặc là admin/nhân viên -> Không làm gì cả, dọn dẹp kết nối cũ (nếu có)
    if (!currentUser || currentUser.role === "admin" || currentUser.role === "Admin" || currentUser.role === "nhanvien") {
      if (connection) {
        connection.stop();
        setConnection(null);
      }
      return;
    }

    // 1. Tải lịch sử chat
    const loadHistory = async () => {
      try {
        const res = await fetchUserChatHistory();
        setMessages(res.data);
      } catch (error) {
        console.error("Lỗi tải lịch sử chat:", error);
      }
    };
    loadHistory();

    // 2. Lắp ống nước SignalR mới
    const newConnection = new HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => localStorage.getItem("token") || ""
      })
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);

    // Dọn dẹp ống nước khi user thay đổi (đăng xuất hoặc đổi acc)
    return () => {
      newConnection.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]); // <- Điểm mấu chốt: Chỉ chạy lại khi ID của user thay đổi

  // ================= 3. LẮNG NGHE TIN NHẮN TỚI =================
  useEffect(() => {
    if (connection) {
      connection.start()
        .then(() => {
          console.log("🟢 Đã kết nối Tổng đài Chat Real-time!");
          
          connection.off("ReceiveMessage"); // Chống nhân đôi tin nhắn
          connection.on("ReceiveMessage", (msg: ChatMessageDto) => {
            if (msg.isFromAdmin || (!msg.isFromAdmin && msg.message)) {
                setMessages((prev) => [...prev, msg]);
            }
          });
        })
        .catch(e => console.error("🔴 Lỗi kết nối Chat:", e));
    }
  }, [connection]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !connection || !currentUser) return;

    try {
      await connection.invoke("SendMessageToAdmin", currentUser.id, inputText);
      setInputText("");
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
    }
  };

  // NẾU CHƯA ĐĂNG NHẬP HOẶC LÀ ADMIN/NHÂN VIÊN -> ẨN LUÔN BONG BÓNG
  if (!currentUser || currentUser.role === "admin" || currentUser.role === "Admin" || currentUser.role === "nhanvien") return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start">
      {/* Khung Chat (Khi mở) */}
      {isOpen && (
        <div className="bg-white w-[340px] sm:w-[380px] rounded-3xl shadow-2xl border border-slate-200 mb-4 overflow-hidden flex flex-col h-[500px] animate-in slide-in-from-bottom-4 duration-300 transform origin-bottom-left">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                <Bot size={24} />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">CSKH HomeMart</h3>
                <p className="text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  Đang hoạt động
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Body (Hiển thị Lịch sử chat) */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                  <Headset size={32} />
                </div>
                <p className="text-sm font-medium text-slate-500">Hãy bắt đầu cuộc trò chuyện!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = !msg.isFromAdmin;
                return (
                  <div key={idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isMe 
                        ? "bg-emerald-500 text-white rounded-br-sm shadow-sm" 
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[10px] mt-1.5 font-medium ${isMe ? "text-emerald-100 text-right" : "text-slate-400"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer (Ô nhập liệu) */}
          <div className="p-3 bg-white border-t border-slate-100">
            <form onSubmit={handleSendMessage} className="flex gap-2 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-slate-100 border border-transparent focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              />
              <button 
                type="submit" 
                disabled={!inputText.trim()}
                className="bg-emerald-500 text-white p-2.5 rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bong bóng nổi (Khi đóng) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-emerald-500 text-white h-14 w-14 rounded-full shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group relative"
        >
          <Headset size={24} className="group-hover:rotate-12 transition-transform duration-300" />
          
          <span className="absolute left-full ml-4 w-max opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1.5 px-3 rounded-lg shadow-lg pointer-events-none">
            Chat với CSKH
          </span>
          
          <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white"></span>
          </span>
        </button>
      )}
    </div>
  );
}