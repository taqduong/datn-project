"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAdminContacts, ContactMessageDto, markContactAsRead } from "@/services/api";
import {
  Mail,
  Clock,
  CheckCircle,
  Search,
  Inbox,
  MessageSquare,
  Filter,
} from "lucide-react";

type FilterStatus = "all" | "unread" | "read";

export default function AdminContactPage() {
  const [contacts, setContacts] = useState<ContactMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const res = await fetchAdminContacts();
      setContacts(res.data || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách liên hệ:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await markContactAsRead(id);
      loadContacts(); // Tải lại dữ liệu để nó cập nhật số lượng và trạng thái
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      alert("Có lỗi xảy ra!");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const words = name.trim().split(" ");
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const getPreviewContent = (content: string, max = 80) => {
    if (!content) return "";
    return content.length > max ? content.slice(0, max) + "..." : content;
  };

  const stats = useMemo(() => {
    const total = contacts.length;
    const unread = contacts.filter((item) => !item.isRead).length;
    const read = contacts.filter((item) => item.isRead).length;

    return { total, unread, read };
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return contacts.filter((contact) => {
      const matchSearch =
        !keyword ||
        contact.fullName?.toLowerCase().includes(keyword) ||
        contact.email?.toLowerCase().includes(keyword) ||
        contact.subject?.toLowerCase().includes(keyword) ||
        contact.content?.toLowerCase().includes(keyword);

      const matchFilter =
        filterStatus === "all" ||
        (filterStatus === "read" && contact.isRead) ||
        (filterStatus === "unread" && !contact.isRead);

      return matchSearch && matchFilter;
    });
  }, [contacts, searchTerm, filterStatus]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl p-6">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
              <MessageSquare size={14} />
              HomeMart Admin
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Quản lý liên hệ
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Theo dõi và xử lý lời nhắn khách hàng gửi tới hệ thống HomeMart
            </p>
          </div>

          <button
            onClick={loadContacts}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Tải lại dữ liệu
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Tổng liên hệ</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {stats.total}
                </h3>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <Inbox size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Chưa đọc</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {stats.unread}
                </h3>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <Mail size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Đã đọc</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {stats.read}
                </h3>
              </div>
              <div className="rounded-2xl bg-green-50 p-3 text-green-600">
                <CheckCircle size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Tìm theo tên, email, chủ đề, nội dung..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-1 inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                <Filter size={16} />
                Lọc:
              </div>

              <button
                onClick={() => setFilterStatus("all")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filterStatus === "all"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả
              </button>

              <button
                onClick={() => setFilterStatus("unread")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filterStatus === "unread"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Chưa đọc
              </button>

              <button
                onClick={() => setFilterStatus("read")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filterStatus === "read"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Đã đọc
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-sm font-semibold text-slate-700">
                  <th className="px-6 py-4">Khách hàng</th>
                  <th className="px-6 py-4">Chủ đề</th>
                  <th className="px-6 py-4">Nội dung</th>
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4">Trạng thái</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-full bg-slate-200" />
                          <div className="space-y-2">
                            <div className="h-4 w-32 rounded bg-slate-200" />
                            <div className="h-3 w-40 rounded bg-slate-100" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-32 rounded bg-slate-200" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-56 rounded bg-slate-200" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-36 rounded bg-slate-200" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-7 w-20 rounded-full bg-slate-200" />
                      </td>
                    </tr>
                  ))
                ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
                          <Inbox size={28} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">
                          Không có dữ liệu phù hợp
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          Hiện chưa có tin nhắn nào hoặc không tìm thấy kết quả theo bộ lọc hiện tại.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="group transition hover:bg-blue-50/40"
                    >
                      <td className="px-6 py-5 align-top">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-sm font-bold text-white shadow-sm">
                            {getInitials(contact.fullName)}
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">
                              {contact.fullName}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <Mail size={12} />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <div className="max-w-[220px]">
                          {contact.subject ? (
                            <span className="font-medium text-slate-700">
                              {contact.subject}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">
                              Không có chủ đề
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <div
                          className="max-w-[320px] text-sm leading-6 text-slate-600"
                          title={contact.content}
                        >
                          {getPreviewContent(contact.content)}
                        </div>
                      </td>

                      <td className="px-6 py-5 align-top whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                          <Clock size={14} />
                          {formatDate(contact.createdAt)}
                        </div>
                      </td>

                      <td className="px-6 py-5 align-top">
                        {contact.isRead ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20">
                            <CheckCircle size={14} />
                            Đã đọc
                          </span>
                        ) : (
                          <div className="flex flex-col items-start gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                              Mới
                            </span>
                            {/* NÚT ĐÁNH DẤU ĐÃ ĐỌC */}
                            <button 
                              onClick={() => handleMarkAsRead(contact.id)}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors"
                            >
                              <CheckCircle size={12} /> Đánh dấu đã đọc
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}